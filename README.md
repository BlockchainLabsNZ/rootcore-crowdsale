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
2. The crowdsaleController deploys a SmartToken to be used by it. Token owner is set as to be the `CrowdsaleController.sol` deployed contract. 
3. Beneficiary address is also set on the constructor args. It should be a multi Sig wallet contract address.
4. A manager account is also set at the `Managed.sol` constructor as msg.sender, the manager can add addresses to whitelist by calling the `addToWhitelist` function, and pause/unPause the sale as a safety messure.
5. Contributors are provided with tokens immediatlly.

TODO: Pass token args to the CrowdSaleController constuctor and not as constants.??? 

During Presale: only whitelist addresses can contribute.
During sale, whitelist accounts are allowed to transfer more than MAX_CONTRIBUTION

1. On T - 5 days, we deploy `KyberContirbutorWhitelist.sol` and list users and their cap.
The listing is done by us with a standard private key. At the end of the listing the ownership on the list is transfered to a secure multisig wallet.

2. On T - 3, we deploy the token sale contract, namely, `KyberNetworkTokenSale.sol`.
The contract gets as input an instance of the deployed whitelist.
Upon deployment, preminted tokens are already distributed.

3. On T- 2, we manually verify that preminted tokens were assigned to the correct addresses.
We also try to transfer 1 company token, to see that it works.
Finally, we call `debugBuy` function to manually verify that ether goes to the correct wallet.

3. On T, the sale starts. At this point users can buy tokens according to their individual caps.
It is possible to buy several times, as long as cap is not exceeded.
Token transfers are disabled.

4. On T+1, the open sale starts. At this point users that are in the whitelist can buy tokens with any amount.

5. On T+2, the sale ends
6. On T+2 + epsilon, `finalizeSale` is called and unsold tokens are burned.  
7. On T+9 token transfers are enabled.

### Per module description
The system has 3 modules, namely, white list, token, and token sale modules.

#### White list
Implemented in `KyberContirbutorWhitelist.sol`.
Provides a raw list of addresses and their cap.
Owner of the contract can list and delist (set cap to 0) users at any point.
Cap of 1 means the user is a slack user, and their cap is set globally before token sale.
In practice, we will not make changes in the list after its first initialization, unless issues are discovered.
This is necessary as we expect > 10k users, and we must start uploading the users before we have a full list.
For this reason we also have an optimzed version of listing which can take an array as input.

Since we are nice, we will also destory the contract after token sale to save disk space for network node.

#### Token
Implemented in `KyberNetworkCrystal.sol`. The token is fully compatible with ERC20 standard, with the next two additions:

1. It has a burning functionality that allows user to burn his tokens.
To optimize gas cost, an auxiliary `burnFrom` function was also implemented.
This function allows sender to burn tokens that were approved by a spender.

2. It is impossible to transfer tokens during the period of the token sale.
To be more precise, only the token sale contract is allowed to transfer tokens during the token sale.


#### Token sale
The token sale contract has 3 roles:
1. Sending preminted tokens and incoming ETH to kyber network multisig wallet. Implemented in `KyberNetworkTokenSale.sol`.
2. Verifying that user is listed and that cap is not exceeded. Implemented in `ContributorApprover.sol`.
3. Distributing tokens to buyers. Implemented in `KyberNetworkTokenSale.sol`.

The `KyberNetworkTokenSale` contract inherent `ContributorApprover`.

### Use of zeppelin code
We use open-zeppling code for `SafeMath`, `Ownable` and `StandardToken` logic.
After first round of testing we discovered two incompatibilities of zepplin's standard token and ERC20 standard.
The two issues are described [here](https://github.com/OpenZeppelin/zeppelin-solidity/issues/370) and [here](https://github.com/OpenZeppelin/zeppelin-solidity/pull/377).
We notified zeppling team, and a [PR](https://github.com/OpenZeppelin/zeppelin-solidity/pull/377) to fix the second issue was merged to zepplin code base.

In our code base we decided to include a fix for both issues, and we expect the auditor to review these changes.
Changes are denoted with `KYBER-NOTE!` comment in `ERC20.sol`, `ERC20Basic.sol` and `StandardToken.sol` files.
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
