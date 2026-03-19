// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bank {
    mapping(address => uint256) public balances;

    /// @notice Deposit ETH into the bank
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /// @notice Withdraw ETH
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // External call happens BEFORE balance is updated
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        balances[msg.sender] -= amount;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}