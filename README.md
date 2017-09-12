# Rootcore Crowdsale Token Sale
In this document, we describe the token sale specification and implementation,
and give an overview over the smart contracts structure. 

## based on Bancor Protocol Contracts v0.3 (alpha) and Zeppelin Solidity
All Bancor smart contracts, except the CrowdSaleController, are unchanged but solidity version is set to 0.4.15
Zeppelin Solidity Pausable contract was added and the Owned inharitance was replaced by Managed.

## Overview
The Bancor protocol represents the first technological solution for the classic problem in economics known as the “Double Coincidence of Wants”, in the domain of asset exchange. For barter, the coincidence of wants problem was solved through money. For money, exchanges still rely on labor, via bid/ask orders and trade between external agents, to make markets and supply liquidity. 

Through the use of smart-contracts, Smart Tokens can be created that hold one or more other tokens in their reserve. Tokens may represent existing national currencies or other types of assets. By using a reserve token model and algorithmically-calculated conversion rates, the Bancor Protocol creates a new type of ecosystem for asset exchange, with no central control. This decentralized hierarchical monetary system lays the foundation for an autonomous decentralized global exchange with numerous and substantial advantages.


## Detailed description

### Overview of flow
1. Deploy: The start time of the sale is set on the constructor. Pre sale starts PRESALE_DURATION (days) before that.
2. The crowdsaleController deploys a SmartToken to be used by it. Token owner is set as to be the `CrowdsaleController.sol` deployed contractand transfer of tokens is disabled. 
3. Beneficiary address is also set on the constructor args. It should be a multi Sig wallet contract address.
4. A manager account is also set at the `Managed.sol` constructor as msg.sender, the manager can add addresses to whitelist by calling the `addToWhitelist` function, and pause/unPause the sale as a safety messure.
5. Contributors are provided with tokens immediatlly when executing the presale and the sale.
6. when sale ends, the token owner should be set to the Rootcore main multisig wallet.
7. After finalizing the sale (bounty rewards etc.) the token should be set as transferable by the token owner.

During Presale: only whitelist addresses can contribute.
During sale, whitelist accounts are allowed to transfer more than MAX_CONTRIBUTION

TODO: Pass token args to the CrowdSaleController constuctor and not as constants.??? 

###modifiers


### Per module description


#### Token sale
The token sale contract has 3 roles:
1. Sending preminted tokens and incoming ETH to kyber network multisig wallet. Implemented in `KyberNetworkTokenSale.sol`.
2. Verifying that user is listed and that cap is not exceeded. Implemented in `ContributorApprover.sol`.
3. Distributing tokens to buyers. Implemented in `KyberNetworkTokenSale.sol`.

The `KyberNetworkTokenSale` contract inherent `ContributorApprover`.

### Use of Bancor Protocol Contracts v0.3 (alpha)
We use Bancor Protocol code for the most part of this project.
The only contract we changed is the `CrowdsaleController.sol` itself which was changed to:
1 - support a Presale for whitelist accounts only.
2 - Support max contribution cap per account.
3 - Deploy the start token on creation.

### Use of zeppling code
We use open-zeppling code for `Pauseable` logic only but had to change the OwnerOnly modig=fier to managerOnly for quick pause if anything goes wrong during the sale.

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
* npm run test
Run CrowdsaleController tests only:
* npm run test-sale 

## Collaborators

* **[Oren Bajayo](https://github.com/bajayo)**


## License

Rootcore Crowdsale is open source and distributed under the Apache License v2.0
