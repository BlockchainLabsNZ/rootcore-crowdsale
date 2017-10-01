# Rootcore Crowdsale Token Sale
In this document, we describe the token sale specification and implementation,
and give an overview over the smart contracts structure.

## based on Bancor Protocol Contracts v0.3 (alpha) and Zeppelin Solidity
All Bancor smart contracts, except the CrowdSaleController, are unchanged but solidity version is set to 0.4.15
Zeppelin Solidity Pausable contract was added and the Owned inheritance was replaced by Managed.

## Overview
Rootcore Crowdsale allowes contributing Ether in return for Rootcoin tokens.
The tokens are ERC20 standard.
Prticipating in the sale is open to everybody with a max contribution cap. Contributing more than the account cap requires going through a KYC process. At the end of the process the account is added to the whitelist and the max cap is removed.
Participating in the pre sale requires requires going through a KYC process. At the end of the process the account is added to the whitelist. During pre sale, there's no account max cap.
During the sale period, the tokens are non transferable.
At the end of the sale, the token owner should set as the baneficiary (foundation) account.  
After the end of the sale, Rootcore will deploy a Changer contract based on the BancorChanger which will hold a reserve in BNT.  


## Detailed description

### Overview of flow
1. Deploy: The start time of the sale is set on the constructor. Presale starts PRESALE_DURATION (set to 14 in code) (days) before that.
2. The crowdsaleController deploys a SmartToken to be used by it. Token owner is set as to be the the crowdsale contract itself (creator). Transfer of tokens is disabled on the constructor.
3. Beneficiary address is also set on the constructor. It should be a multi Sig wallet contract address.
4. A manager account is also set at the `Managed.sol` constructor as msg.sender, the manager can add addresses to white list by calling the `addToWhitelist` function, and pause/unPause the sale as a safety measure.
5. Contributors are provided with tokens immediately when executing the presale and the sale functions.
6. when sale ends, the token owner should be set to the Bancor changer smart contract that will be deployed.
7. The Ether collected during the sale is transferred to the foundation multisig wallet. (beneficiary)
8. The Tokens issued during the sale are transferred to the foundation multisig wallet. (beneficiary)
9. After finalizing the sale (bounty rewards etc.) the token should be set as transferable by the token owner.
10. A soft cap is utilized in the following manner: if reached (during pre or public sale) a 24 hours grace duration is set after which the sale ends.
11. A hard cap is utilized  in the following manner: if reached, at any point, the sale ends.

During Presale: only white list addresses can contribute.
During sale, whitelist accounts are allowed to transfer more than MAX_CONTRIBUTION
Any contributor who whishes to either participate in pre-sale, or contibute more than MAX_CONTRIBUTION should go through a KYC process in which they should provide their address to be added to the whitelist.


### Use of Bancor Protocol Contracts v0.3 (alpha)
We use Bancor Protocol code for the most part of this project.
The only contract we changed is the `CrowdsaleController.sol` itself which was changed to:
1 - support a Presale for white list accounts only.
2 - Support max contribution cap per account.
3 - Deploy the start token on creation.
4 - Addition of whitelist for MAX_CONTRIBUTION and pre sale address verification.
5 - addition of `Pauseable.sol` for safety during sale.

### Use of zeppling code
We use open-zeppling code for `Pauseable` logic only but had to change the OwnerOnly modifier to managerOnly for quick pause if anything goes wrong during the sale.

### Per module description

### CrowdsaleController
The `CrowdsaleController.sol` contract is the main contract of this project. It runs the presale and the actual sale.
Whith any legit contribution, the calculated amount of tokens are immediately assignes the sender (token `issue` function is called). The same amount (1:1 ratio) is assigned to the beneficiary account. 
Ether collected during the sale is stored at the ether balance of the CrowdsaleController contract and should be sent to the foundation multisig wallet when sale is over.

TODO???: add finalize sale function that will transfer Token ownership to the Bancor Changer once it's up.

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

## Deploying
to live network:
* $ truffle migrate --network live
to test network (kovan):
* $ truffle migrate --network kovan
to local test network (testRPC):
* $ truffle migrate

## Collaborators

* **[Oren Bajayo](https://github.com/bajayo)**


## License

Rootcore Crowdsale is open source and distributed under the Apache License v2.0
