// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
interface IStrategyAggregator {
  function workable(address _strategy) external view returns (bool _isWorkable);
  function strategies() external view returns (address[] memory);
}

contract BatchWorkable {
  constructor(IStrategyAggregator _strategyAggregator) {
      address[] memory _allStrategies = _strategyAggregator.strategies();
      uint256 _allStrategiesLength = _allStrategies.length;

      address[] memory _tempStrategiesHolder = new address[](_allStrategiesLength);
      uint256 _workableStrategyCounter;

      for (uint256 _i; _i < _allStrategiesLength;) {
        if (_strategyAggregator.workable(_allStrategies[_i])) {
          _tempStrategiesHolder[_workableStrategyCounter] = _allStrategies[_i];
          ++_workableStrategyCounter;
        }
        unchecked {++_i;}
      }

      address[] memory _workableStrategies = new address[](_workableStrategyCounter);

      for (uint256 _i; _i < _workableStrategyCounter;) {
        _workableStrategies[_i] = _tempStrategiesHolder[_i];
        unchecked {++_i;}
      }

      bytes memory data = abi.encode(_workableStrategies);

      assembly {
        let _dataStartPointer := add(data, 32)
        return(_dataStartPointer, sub(msize(), _dataStartPointer))
      }
  }

}