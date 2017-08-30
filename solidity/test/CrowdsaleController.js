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
let realCap = 1000;
let realCapLarge = 1000000000000000000000000000000000000;
// let realCapKey = 234;
let badContributionGasPrice = 50000000001;

async function generateDefaultController() {
    return await CrowdsaleController.new(tokenAddress, startTime, beneficiaryAddress);
}

// used by contribution tests, creates a controller that's already in progress
async function initController(accounts, activate, startTimeOverride = startTimeInProgress) {
    token = await SmartToken.new('Token1', 'TKN1', 2);
    tokenAddress = token.address;

    let controller = await TestCrowdsaleController.new(tokenAddress, startTime, beneficiaryAddress, startTimeOverride);
    let controllerAddress = controller.address;

    if (activate) {
        await token.transferOwnership(controllerAddress);
        await controller.acceptTokenOwnership();
    }
    return controller;
}

function getContributionAmount(transaction, logIndex = 0) {
    return transaction.logs[logIndex].args._return.toNumber();
}

contract('CrowdsaleController', (accounts) => {
    before(async () => {
        let token = await SmartToken.new('Token1', 'TKN1', 2);
        tokenAddress = token.address;
        presaleContributorAddress = accounts[4];
    });

    it('verifies the base storage values after construction', async () => {
        let controller = await generateDefaultController();
        let token = await controller.token.call();
        assert.equal(token, tokenAddress);
        let start = await controller.startTime.call();
        assert.equal(start.toNumber(), startTime);
        let endTime = await controller.endTime.call();
        let duration = await controller.DURATION.call();
        assert.equal(endTime.toNumber(), startTime + duration.toNumber());
        let beneficiary = await controller.beneficiary.call();
        assert.equal(beneficiary, beneficiaryAddress);
    });

    it('should throw when attempting to construct a controller with no token', async () => {
        try {
            await CrowdsaleController.new('0x0', startTime, beneficiaryAddress);
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to construct a controller with start time that has already passed', async () => {
        try {
            await CrowdsaleController.new(tokenAddress, 10000000, beneficiaryAddress);
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to construct a controller without beneficiary address', async () => {
        try {
            await CrowdsaleController.new(tokenAddress, startTime, '0x0');
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies that computeReturn returns a valid amount', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(500);
        assert.isNumber(returnAmount.toNumber());
        assert.notEqual(returnAmount.toNumber(), 0);
    });

    it('verifies that 1 ether equals 1000 tokens', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(1);
        assert.isNumber(returnAmount.toNumber());
        assert.notEqual(returnAmount.toNumber(), 0);
        assert.equal(returnAmount.toNumber(), 1000000000000000);
    });

    it('verifies that computeReturn returns the same amount as contributeETH', async () => {
        let controller = await initController(accounts, true);
        let returnAmount = await controller.computeReturn.call(500);

        let purchaseRes = await controller.contributeETH({ value: 500 });
        let purchaseAmount = getContributionAmount(purchaseRes);

        assert.equal(returnAmount, purchaseAmount);
    });

    it('verifies that computeReturn returns the same amount as contributePreSale', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);
        let returnAmount = await controller.computeReturn.call(500);

        let purchaseRes = await controller.contributePreSale({ value: 500 });
        let purchaseAmount = getContributionAmount(purchaseRes);

        assert.equal(returnAmount, purchaseAmount);
    });

    it('verifies balances and total eth contributed after contributing ether', async () => {
        let controller = await initController(accounts, true);

        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);

        let res = await controller.contributeETH({ value: 200, from: accounts[1] });
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(accounts[1]);
        assert.equal(contributorTokenBalance, purchaseAmount);

        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        assert.equal(beneficiaryTokenBalance, purchaseAmount);

        let beneficiaryEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        assert.equal(beneficiaryEtherBalance.toNumber(), prevEtherBalance.plus(200).toNumber());

        let totalEtherContributed = await controller.totalEtherContributed.call();
        assert.equal(totalEtherContributed, 200);
    });

    it('should throw when attempting to contribute ether while the controller is not active', async () => {
        let controller = await initController(accounts, false);

        try {
            await controller.contributeETH({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribute ether before the crowdsale has started', async () => {
        let controller = await initController(accounts, true, startTime);

        try {
            await controller.contributeETH({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribute presale ether before the crowdsale has started', async () => {
        let controller = await initController(accounts, true, startTime);

        try {
            await controller.contributePreSale({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contribute ether after the crowdsale has finished', async () => {
        let controller = await initController(accounts, true, startTimeFinished);

        try {
            await controller.contributeETH({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

   
    it('should throw when attempting to contribute ether with a large gas price', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributeETH({ value: 2000, gasPrice: badContributionGasPrice });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('verifies balances and total eth contributed after contributing through presale', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        let prevContributorTokenBalance = await token.balanceOf.call(presaleContributorAddress);
        let prevEtherBalance = await web3.eth.getBalance(beneficiaryAddress);

        let res = await controller.contributePreSale({ value: 500, from: presaleContributorAddress });
        let purchaseAmount = getContributionAmount(res);
        assert.isNumber(purchaseAmount);
        assert.notEqual(purchaseAmount, 0);

        let contributorTokenBalance = await token.balanceOf.call(presaleContributorAddress);
        assert.equal(contributorTokenBalance.toNumber(), prevContributorTokenBalance.plus(purchaseAmount).toNumber());

        let beneficiaryTokenBalance = await token.balanceOf.call(beneficiaryAddress);
        assert.equal(beneficiaryTokenBalance, purchaseAmount);

        let beneficiaryEtherBalance = await web3.eth.getBalance(beneficiaryAddress);
        assert.equal(beneficiaryEtherBalance.toNumber(), prevEtherBalance.plus(500).toNumber());

        let totalEtherContributed = await controller.totalEtherContributed.call();
        assert.equal(totalEtherContributed, 500);
    });

    
    it('should throw when attempting to contributing through presale while the controller is not active', async () => {
        let controller = await initController(accounts, false, startTime);

        try {
            await controller.contributePreSale({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale after the crowdsale has started', async () => {
        let controller = await initController(accounts, true);

        try {
            await controller.contributePreSale({ value: 2000 });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale after the crowdsale has finished', async () => {
        let controller = await initController(accounts, true, startTimeFinished);

        try {
            await controller.contributePreSale({ value: 2000});
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale with large gas price', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        try {
            await controller.contributePreSale({ value: 200, gasPrice: badContributionGasPrice });
            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });

    it('should throw when attempting to contributing through presale with small amount', async () => {
        let controller = await initController(accounts, true, startTimePresaleInProgress);

        try {
            await controller.contributePreSale({ value: 100 });

            assert(false, "didn't throw");
        }
        catch (error) {
            return utils.ensureException(error);
        }
    });
});

