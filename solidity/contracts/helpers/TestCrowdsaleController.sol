pragma solidity ^0.4.11;
import '../CrowdsaleController.sol';

/*
    Test crowdsale controller with start time < now < end time
*/
contract TestCrowdsaleController is CrowdsaleController {
    function TestCrowdsaleController(
        ISmartToken _token,
        uint256 _startTime,
        address _beneficiary,
        uint256 _startTimeOverride)
        CrowdsaleController(_token, _startTime, _beneficiary)
    {
        startTime = _startTimeOverride;
        endTime = startTime + DURATION;
    }
}
