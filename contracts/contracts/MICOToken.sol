// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MICOToken (MicroCoin)
 * @dev The reward token for LifeMicro app
 * 
 * Features:
 * - Users earn MICO by completing tasks
 * - MICO can be burned to redeem marketplace rewards
 * - Only the owner (your backend) can mint new tokens
 * - Maximum supply: 1 billion tokens
 */
contract MICOToken is ERC20, ERC20Burnable, Ownable {
    
    // Events for tracking on the blockchain
    event TokensAwarded(address indexed user, uint256 amount, string reason);
    event TokensBurned(address indexed user, uint256 amount, string itemId);
    
    // Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Track how many tokens have been minted
    uint256 public totalMinted;
    
    /**
     * @dev Creates the MICO token and mints initial supply to owner
     */
    constructor() ERC20("MicroCoin", "MICO") Ownable(msg.sender) {
        // Mint 10 million tokens to start
        _mint(msg.sender, 10_000_000 * 10**18);
        totalMinted = 10_000_000 * 10**18;
    }
    
    /**
     * @dev Award tokens to a user (called when they complete tasks)
     * @param to User's wallet address
     * @param amount Amount of tokens to award
     * @param reason Why tokens were awarded (e.g., "task_completed")
     */
    function awardTokens(
        address to, 
        uint256 amount, 
        string memory reason
    ) external onlyOwner {
        require(totalMinted + amount <= MAX_SUPPLY, "Would exceed max supply");
        _mint(to, amount);
        totalMinted += amount;
        emit TokensAwarded(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens when redeeming marketplace items
     * @param amount Amount of tokens to burn
     * @param itemId The marketplace item being redeemed
     */
    function burnForRedemption(
        uint256 amount, 
        string memory itemId
    ) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, itemId);
    }
    
    /**
     * @dev Award tokens to multiple users at once (for batch processing)
     * @param recipients Array of user addresses
     * @param amounts Array of token amounts
     */
    function batchAward(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays must match");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(totalMinted + amounts[i] <= MAX_SUPPLY, "Would exceed max supply");
            _mint(recipients[i], amounts[i]);
            totalMinted += amounts[i];
        }
    }
}
