// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bank {
    mapping(address => uint256) public balances;

    /// @notice Deposit ETH into the bank
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}