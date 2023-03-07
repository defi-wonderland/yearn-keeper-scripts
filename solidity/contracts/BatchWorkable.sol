// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
interface IStrategyAggregator {
  function workable(address _strategy) external view returns (bool _isWorkable);
}

contract BatchWorkable {
  constructor(IStrategyAggregator _strategyAggregator, address[] memory _strategies) {
      // cache strategies length
      uint256 _strategiesLength = _strategies.length;

      // create temporary array with _strategies length to populate only with workable strategies and zeroes
      address[] memory _tempStrategiesHolder = new address[](_strategiesLength);

      // declare counter to know how many of the indexes of _tempStrategiesHolder contain workable strategies
      uint256 _workableStrategyCounter;
     
      for (uint256 _i; _i < _strategiesLength;) {
        if (_strategyAggregator.workable(_strategies[_i])) {
          // if a strategy is workable, add it to _tempStrategiesHolder
          _tempStrategiesHolder[_workableStrategyCounter] = _strategies[_i];
          // only increase the counter when we find a workable strategy, so that index always increases by 1 starting from 0
          ++_workableStrategyCounter;
        }
        unchecked {++_i;}
      }
    
      // create a new array with the actual length of the workable strategies to not corrupt memory with a wrong length
      address[] memory _workableStrategies = new address[](_workableStrategyCounter);

      // populate the array with the workable strategies
      for (uint256 _i; _i < _workableStrategyCounter;) {
        _workableStrategies[_i] = _tempStrategiesHolder[_i];
        unchecked {++_i;}
      }
    
      // encode workable strategies to ensure a proper layout in memory
      bytes memory data = abi.encode(_workableStrategies);
    
      assembly {
        // pointer to the beginning of the data containing the workable strategies in memory
        let _dataStartPointer := add(data, 32)
        // return everything from the start of the data to the end of memory
        return(_dataStartPointer, sub(msize(), _dataStartPointer))
      }
  }

}