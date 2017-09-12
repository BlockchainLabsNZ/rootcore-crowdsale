# Rootcore Crowdsale Token Sale
In this document, we describe the token sale specification and implementation,
and give an overview over the smart contracts structure. 

## based on Bancor Protocol Contracts v0.3 (alpha) and Zeppelin Solidity
All Bancor smart contracts, except the CrowdSaleController, are unchanged but solidity version is set to 0.4.15
Zeppelin Solidity Pausable contract was added and the Owned inharitance was replaced by Managed.

## Overview
The Bancor protocol represents the first technological solution for the classic problem in economics known as the “Double Coincidence of Wants”, in the domain of asset exchange. For barter, the coincidence of wants problem was solved through money. For money, exchanges still rely on labor, via bid/ask orders and trade between external agents, to make markets and supply liquidity. 

Through the use of smart-contracts, Smart Tokens can be created that hold one or more other tokens in their reserve. Tokens may represent existing national currencies or other types of assets. By using a reserve token model and algorithmically-calculated conversion rates, the Bancor Protocol creates a new type of ecosystem for asset exchange, with no central control. This decentralized hierarchical monetary system lays the foundation for an autonomous decentralized global exchange with numerous and substantial advantages.


# The Smart Token Standard

## Motivation

Those will allow creating a Bancor compliant token while keeping dependencies at a minimum.
In addition, it allows an owning contract to extend its functionality by giving the owner full control.

## Specification

### SmartToken

First and foremost, a Smart Token is also an ERC-20 compliant token.
As such, it implements both the standard token methods and the standard token events.

### Methods

Note that these methods can only be executed by the token owner.

**issue**
```cs
function issue(address _to, uint256 _amount)
```
Increases the token supply and sends the new tokens to an account.
<br>
<br>
<br>
**destroy**
```cs
function destroy(address _from, uint256 _amount)
```
Removes tokens from an account and decreases the token supply.
<br>
<br>
<br>
**disableTransfers**
```cs
function disableTransfers(bool _disable)
```
Disables transfer/transferFrom functionality.
<br>
<br>
<br>
### Events

**NewSmartToken**
```cs
event NewSmartToken(address _token)
```
Triggered when a smart token is deployed.
<br>
<br>
<br>
**Issuance**
```cs
event Issuance(uint256 _amount)
```
Triggered when the total supply is increased.
<br>
<br>
<br>
**Destruction**
```cs
event Destruction(uint256 _amount)
```
Triggered when the total supply is decreased.
<br>
<br>
<br>


## Testing
Tests are included and can be run using truffle.

### Prerequisites
* Node.js v7.6.0+
* truffle v3.2.2+
* testrpc v3.0.5+

To run the test, execute the following commands from the project's root folder -
Run testRPC:
* npm run testrpc
Run full project tests:
* npm test
Run CrowdsaleController tests only:
* npm test-sale 

## Collaborators

* **[Oren Bajayo](https://github.com/bajayo)**


## License

Rootcore Crowdsale is open source and distributed under the Apache License v2.0
