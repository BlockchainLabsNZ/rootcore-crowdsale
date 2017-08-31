pragma solidity ^0.4.11;
import './SmartTokenController.sol';
import './Utils.sol';
import './interfaces/ISmartToken.sol';

/*
    Crowdsale v0.1

    The crowdsale version of the smart token controller, allows contributing ether in exchange for Rootcoin tokens
    The price remains fixed for the entire duration of the crowdsale
    Note that 20% of the contributions are the Bancor token's reserve
    Presale contributes are allocated (manually) with additional 20% tokens from the beneficiary tokens.
*/
contract CrowdsaleController is SmartTokenController {
    uint256 public constant PRESALE_DURATION = 14 days;                 // pressale duration
    uint256 public constant PRESALE_MIN_CONTRIBUTION = 200 wei;      // pressale min contribution
    uint256 public constant DURATION = 14 days;                 // crowdsale duration
    uint256 public constant TOKEN_PRICE_N = 1;                  // initial price in wei (numerator)
    uint256 public constant TOKEN_PRICE_D = 0.001 ether;                // initial price in wei (denominator)
    uint256 public constant MAX_GAS_PRICE = 50000000000 wei;    // maximum gas price for contribution transactions

    string public version = "0.1";

    uint256 public startTime = 0;                   // crowdsale start time (in seconds)
    uint256 public endTime = 0;                     // crowdsale end time (in seconds)
    uint256 public totalEtherCap = 1000000 ether;   // current ether contribution cap, initialized with a temp value as a safety mechanism until the real cap is revealed
    uint256 public totalEtherContributed = 0;       // ether contributed so far
    address public beneficiary = 0x0;               // address to receive all ether contributions
    uint256 public presaleMinContribution = 200 ether;      // pressale min contribution initialized with a temp value as a safety mechanism

    // triggered on each contribution
    event Contribution(address indexed _contributor, uint256 _amount, uint256 _return);

    /**
        @dev constructor

        @param _token          smart token the crowdsale is for
        @param _startTime      crowdsale start time
        @param _beneficiary    address to receive all ether contributions
    */
    function CrowdsaleController(ISmartToken _token, uint256 _startTime, address _beneficiary, uint256 _presaleMinContribution)
        SmartTokenController(_token)
        validAddress(_beneficiary)
        earlierThan(_startTime)
    {
        startTime = _startTime;
        endTime = startTime + DURATION;
        beneficiary = _beneficiary;
        presaleMinContribution = _presaleMinContribution;
    }

    // verifies that the gas price is lower than 50 gwei
    modifier validGasPrice() {
        assert(tx.gasprice <= MAX_GAS_PRICE);
        _;
    }

    // ensures that it's earlier than the given time
    modifier earlierThan(uint256 _time) {
        assert(now < _time);
        _;
    }

    // ensures that the current time is between _startTime (inclusive) and _endTime (exclusive)
    modifier between(uint256 _startTime, uint256 _endTime) {
        assert(now >= _startTime && now < _endTime);
        _;
    }

    // ensures that we didn't reach the ether cap
    modifier etherCapNotReached(uint256 _contribution) {
        assert(safeAdd(totalEtherContributed, _contribution) <= totalEtherCap);
        _;
    }

    // verifies that the presale contribution is more than presale minimum
    modifier validatePresaleMinPrice() {
        require(msg.value >= presaleMinContribution);
        _;
    }

    // verifies that the presale contribution is from predefined address - TBD (not in use unless we decide to make a whitelist.)
    modifier validatePresaleAddress() {
        _;
    }

    /**
        @dev computes the number of tokens that should be issued for a given contribution

        @param _contribution    contribution amount

        @return computed number of tokens
    */
    function computeReturn(uint256 _contribution) public constant returns (uint256) {
        return safeMul(_contribution, TOKEN_PRICE_D) / TOKEN_PRICE_N;
    }

    /**
        @dev ETH contribution
        can only be called during the crowdsale

        @return tokens issued in return
    */
    function contributeETH()
        public
        payable
        between(startTime, endTime)
        returns (uint256 amount)
    {
        return processContribution();
    }

     /**
        @dev Contribution during presale (min 200 ether)
        can only be called 14 days before the crowdsale start date

        @return tokens issued in return
    */
    function contributePreSale()
        public
        payable
        between(safeSub(startTime,PRESALE_DURATION), startTime)
        validatePresaleMinPrice
        validatePresaleAddress
        returns (uint256 amount)
    {
        return processContribution();
    }

    /**
        @dev handles contribution logic
        note that the Contribution event is triggered using the sender as the contributor, regardless of the actual contributor

        @return tokens issued in return
    */
    function processContribution() private
        active
        etherCapNotReached(msg.value)
        validGasPrice
        returns (uint256 amount)
    {
        uint256 tokenAmount = computeReturn(msg.value);
        assert(beneficiary.send(msg.value)); // transfer the ether to the beneficiary account
        totalEtherContributed = safeAdd(totalEtherContributed, msg.value); // update the total contribution amount
        token.issue(msg.sender, tokenAmount); // issue new funds to the contributor in the smart token
        token.issue(beneficiary, tokenAmount); // issue tokens to the beneficiary

        Contribution(msg.sender, msg.value, tokenAmount);
        return tokenAmount;
    }

    // fallback
    function() payable {
        contributeETH();
    }
}
