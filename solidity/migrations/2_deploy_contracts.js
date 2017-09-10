/* global artifacts */
/* eslint-disable prefer-reflect */

const Utils = artifacts.require('Utils.sol');
const Owned = artifacts.require('Owned.sol');
const Managed = artifacts.require('Managed.sol');
const Pausable = artifacts.require('Pausable.sol');
const TokenHolder = artifacts.require('TokenHolder.sol');
const ERC20Token = artifacts.require('ERC20Token.sol');
const SmartToken = artifacts.require('SmartToken.sol');
const SmartTokenController = artifacts.require('SmartTokenController.sol');
const CrowdsaleController = artifacts.require('CrowdsaleController.sol');

module.exports = async (deployer) => {
    console.log("network: " + web3.version.network);
    await deployer.deploy(Utils);
    await deployer.deploy(Owned);
    await deployer.deploy(Managed);
    await deployer.deploy(Pausable);
    await deployer.deploy(TokenHolder);
    await deployer.deploy(ERC20Token, 'DummyToken', 'DUM', 0);
    await deployer.deploy(SmartToken, 'Token1', 'TKN1', 18);
    await deployer.deploy(SmartTokenController, SmartToken.address);
    await deployer.deploy(CrowdsaleController, 4102444800, '0x125');
};

