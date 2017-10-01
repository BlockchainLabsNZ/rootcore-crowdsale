/* global artifacts, contract, before, it, assert, web3 */
/* eslint-disable prefer-reflect */

const CrowdsaleController = artifacts.require('CrowdsaleController.sol');
const SmartToken = artifacts.require('SmartToken.sol');
const TestCrowdsaleController = artifacts.require('TestCrowdsaleController.sol');
const utils = require('./helpers/Utils');

let token;
let tokenAddress;
let beneficiaryAddress = '0x69aa30b306805bd17488ce957d03e3c0213ee9e6';
let presaleContributorAddress;
let startTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // crowdsale hasn't started
let startTimePresaleInProgress = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60; // ongoing crowdsale in presale
let startTimeInProgress = Math.floor(Date.now() / 1000) - 12 * 60 * 60; // ongoing crowdsale
let startTimeFinished = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // Finished crowdsale

var sleep = require('sleep');


let realCap = 1000;
//2000000000000000000000000
let realCapLarge = 1000000000000000000000001;
let realSoftCapLarge = 500000000000000000000001;

let badContributionGasPrice = 50000000001;
//let presaleMinContribution = 200;
let moreThanMaxContribution = 41000000000000000000;

async function generateDefaultController() {
    return await CrowdsaleController.new(startTime, beneficiaryAddress);
}

// used by contribution tests, creates a controller that's already in progress
async function initController(accounts, activate, startTimeOverride = startTimeInProgress) {
    
    let controller = await TestCrowdsaleController.new(startTime, beneficiaryAddress, startTimeOverride);
    let controllerAddress = controller.address;

    if (activate) {
        
        token = SmartToken.at(await controller.token.call());
        tokenAddress = token.address;

        // let realStartTime = await controller.startTime.call();
        // console.log("startTime: = " + realStartTime);

        await controller.addToWhitelist(accounts[4]); //put account[4] in whitelist
        await controller.addToWhitelist(accounts[0]); //put account[0] in whitelist
    }
    return controller;
}

function getContributionAmount(transaction, logIndex = 0) {
    return transaction.logs[logIndex].args._return.toNumber();
}

contract('CrowdsaleController', (accounts) => {
    before(async () => {

        presaleContributorAddress = accounts[4];
    });

    it('verifies the base storage values after construction', async () => {
        let controller = await generateDefaultController();
        let token = SmartToken.at(await controller.token.call());
        let tokenSymbol = await token.symbol.call();
        assert.equal(tokenSymbol, "RCT");
        let start = await controller.startTime.call();
        assert.equal(start.toNumber(), startTime);
        let endTime = await controller.endTime.call();
        let duration = await controller.DURATION.call();
        assert.equal(endTime.toNumber(), startTime + duration.toNumber());
        let beneficiary = await controller.beneficiary.call();
        assert.equal(beneficiary, beneficiaryAddress);
    });

    it('should throw when attempting to construct a controller with start time that has already passed', async () => {
        try {
            await CrowdsaleController.new(10000000, beneficiaryAddress);
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to construct a controller without beneficiary address', async () => {
        try {
            await CrowdsaleController.new(startTime, '0x0');
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies that computeReturn returns a valid amount', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(100000000000000000);
        assert.isNumber(returnAmount.toNumber());
        assert.notEqual(returnAmount.toNumber(), 0);
    });

    it('verifies that account 0 and 4 are on the whitelist', async () => {
        let controller = await initController(accounts, true);
        let account0isInWhiteList = await controller.whiteList(accounts[0]);
        let account4isInWhiteList = await controller.whiteList(accounts[4]);
        assert.equal(account0isInWhiteList && account4isInWhiteList, true);
    });

    it('verifies that 0.001 ether equals 1000 tokens', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(1000000000000000000);
        assert.isNumber(returnAmount.toNumber());
        assert.notEqual(returnAmount.toNumber(), 0);
        assert.equal(returnAmount.toNumber(), 1000000000000000000000);
    });

    it('verifies that account3 can be added to whitelist', async () => {
        let controller = await initController(accounts, true);
        await controller.addToWhitelist(accounts[3]);
        let accunt3Added = await controller.whiteList(accounts[3]);
        assert.equal(accunt3Added, true);
    });

    it('verifies that account3 can be removed to whitelist', async () => {
        let controller = await initController(accounts, true);
        await controller.removeFromWhitelist(accounts[3]);
        let accunt3Added = await controller.whiteList(accounts[3]);
        assert.equal(accunt3Added, false);
    });

    it('should throw when attempting to add account to whitelist by non-manager', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.addToWhitelist(accounts[3], { from: accounts[1] });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies that computeReturn returns the same amount as contributeETH', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(1000000000000000000);

        let purchaseRes = await controller.contributeETH({ value: 1000000000000000000 });
        let purchaseAmount = getContributionAmount(purchaseRes);

        assert.equal(returnAmount, purchaseAmount);
    });

    it('verifies that computeReturn returns the same amount as contributePreSale', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);
        let returnAmount = await controller.computeReturn.call(201000000000000000000);

        let purchaseRes = await controller.contributePreSale({ value: 201000000000000000000 });
        let purchaseAmount = getContributionAmount(purchaseRes);

        assert.equal(returnAmount, purchaseAmount);
    });

    it('verifies balances and total eth contributed after contributing ether', async () => {
        let controller = await initController(accounts, true);

        //let token = SmartToken.at(await controller.token.call());

        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);

        let res = await controller.contributeETH({ value: 1000000000000000000, from: accounts[1] });
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(accounts[1]);
        assert.equal(contributorTokenBalance, purchaseAmount);

        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        assert.equal(beneficiaryTokenBalance, purchaseAmount);

        let beneficiaryEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        assert.equal(beneficiaryEtherBalance.toNumber(), prevEtherBalance.plus(1000000000000000000).toNumber());

        let totalEtherContributed = await controller.totalEtherContributed.call();
        assert.equal(totalEtherContributed, 1000000000000000000);
    });

    it('verifies that whitelist account can contribute more than maximum account limit', async () => {
        let controller = await initController(accounts, true);
        //let token = SmartToken.at(await controller.token.call());
        
        let res = await controller.contributeETH({ value: moreThanMaxContribution, from: accounts[0]});
        let purchaseAmount = getContributionAmount(res);

        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTotalTokenBalance = await token.balanceOf.call(accounts[0]);
        assert.equal(contributorTotalTokenBalance, purchaseAmount);

    });

    it('should throw when attempting to contribute ether before the crowdsale has started', async () => {
        let controller = await initController(accounts, true, startTime);

        try {
            await controller.contributeETH({ value: 1000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribute presale ether before the crowdsale has started', async () => {
        let controller = await initController(accounts, true, startTime);

        try {
            await controller.contributePreSale({ value: 1000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribute presale while sale is in progress', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        try {
            await controller.contributePreSale({ value: 201000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });


    it('should throw when attempting to contribute ether after the crowdsale has finished', async () => {
        let controller = await initController(accounts, true, startTimeFinished);

        try {
            await controller.contributeETH({ value: 1000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

   
    it('should throw when attempting to contribute ether with a large gas price', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributeETH({ value: 1000000000000000000, gasPrice: badContributionGasPrice });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies balances and total eth contributed after contributing through presale', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);
        
        //let token = SmartToken.at(await controller.token.call());

        let prevContributorTokenBalance = await token.balanceOf.call(presaleContributorAddress);
        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);

        let res = await controller.contributePreSale({ value: 201000000000000000000, from: presaleContributorAddress });
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(presaleContributorAddress);
        assert.equal(contributorTokenBalance.toNumber(), prevContributorTokenBalance.plus(purchaseAmount).toNumber());

        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        assert.equal(beneficiaryTokenBalance, purchaseAmount);

        let beneficiaryEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        assert.equal(beneficiaryEtherBalance.toNumber(), prevEtherBalance.plus(201000000000000000000).toNumber());

        let totalEtherContributed = await controller.totalEtherContributed.call();
        assert.equal(totalEtherContributed, 201000000000000000000);
    });

    
    it('should throw when attempting to contributing through presale while the controller is not active', async () => {
        let controller = await initController(accounts, false, startTime);

        try {
            await controller.contributePreSale({ value: 201000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale after the crowdsale has started', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributePreSale({ value: 201000000000000000000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale after the crowdsale has finished', async () => {
        let controller = await initController(accounts, true, startTimeFinished);

        try {
            await controller.contributePreSale({ value: 201000000000000000000});
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale with large gas price', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        try {
            await controller.contributePreSale({ value: 201000000000000000000, gasPrice: badContributionGasPrice });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale with unauthorized account', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        try {
            await controller.contributePreSale({ value: 201000000000000000000, from: accounts[1]});
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale with small amount', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        try {
            await controller.contributePreSale({ value: 190000000000000000000 });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing with too small amount', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        try {
            await controller.sendTransaction({ value: 9000000000000000 });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });
    it('should throw when attempting to contributing with too large amount', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        try {
            await controller.sendTransaction({ value: 41000000000000000000, from: accounts[1] });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribue with amount over the total cap by an approved account (no account limit)', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        try {
            await controller.sendTransaction({ value: 1100000000000000000000000, from: accounts[4] });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when soft cap reached and trying to contribute with amount that would pass hard cap by an approved account (no account limit)', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        await controller.sendTransaction({ value: 510000000000000000000000, from: accounts[4] }); //should pass
        
        let res = await controller.sendTransaction({ value: 1000000000000000000, from: accounts[3]}); //should pass

        try {
            
            await controller.sendTransaction({ value: 510000000000000000000000, from: accounts[4] });//should not pass

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when soft cap reached and trying to contribute after grace period)', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        await controller.sendTransaction({ value: 510000000000000000000000, from: accounts[4] }); //should pass

        let res = await controller.sendTransaction({ value: 1000000000000000000, from: accounts[3]}); //should pass

        try {
            sleep.sleep(10);
            await controller.sendTransaction({ value: 1000000000000000000, from: accounts[4] });//should not pass

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies balances and total eth contributed after soft cap was reached but in "grace" period', async () => {
        let controller = await initController(accounts, true);
        await controller.sendTransaction({ value: 510000000000000000000000, from: accounts[4] });

        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        let prevBeneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);

        let res = await controller.sendTransaction({ value: 1000000000000000000, from: accounts[3]});
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(accounts[3]);
        assert.equal(contributorTokenBalance, purchaseAmount);

        let firstContributorTokenBalance = await token.balanceOf.call(accounts[4]);
        let secondContributorTokenBalance = await token.balanceOf.call(accounts[3]);
        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        
        assert.equal(beneficiaryTokenBalance.toNumber(), firstContributorTokenBalance.plus(secondContributorTokenBalance.toNumber()).toNumber());

    });

    it('should throw when attempting to contributing with too large amount in two seperate transfers', async () => {
        let controller = await initController(accounts, true, startTimeInProgress);

        try {
            await controller.sendTransaction({ value: 20000000000000000000, from: accounts[1] });
            await controller.sendTransaction({ value: 21000000000000000000, from: accounts[1] });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to send Fiat contribution by non manager', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributeFiat(accounts[3], 10000000000000000000 , { from: accounts[1], value: 0 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to send Fiat contribution to a non valid address', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributeFiat('0x0', 10000000000000000000 );
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to send Fiat contribution to a non valid amount', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributeFiat(accounts[3], -1 );
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to send Fiat contribution when sale is not active', async () => {
        let controller = await initController(accounts, true, startTimeFinished);

        try {
            await controller.contributeFiat(accounts[3], 10000000000000000000 );
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies balances and total eth contributed after contributing Fiat', async () => {
        let controller = await initController(accounts, true);

        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);

        let res = await controller.contributeFiat(accounts[3], 10000000000000000000 );
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(accounts[3]);
        assert.equal(contributorTokenBalance, purchaseAmount);

        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        assert.equal(beneficiaryTokenBalance, purchaseAmount);

        let beneficiaryEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        assert.equal(beneficiaryEtherBalance.toNumber(), prevEtherBalance.toNumber()); //beneficiary ether balance should remain the same

        let totalEtherContributed = await controller.totalEtherContributed.call();
        assert.equal(totalEtherContributed, 10000000000000000000);
    });
    
});

