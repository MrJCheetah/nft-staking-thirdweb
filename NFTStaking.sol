// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Interface for ERC20 and ERC721
    IERC20 public immutable rewardsToken;
    IERC721 public immutable nftCollection;

    constructor(IERC721 _nftCollection, IERC20 _rewardsToken) {
        nftCollection = _nftCollection;
        rewardsToken = _rewardsToken;
    }

    struct StakedToken {
        address staker;
        uint256 tokenId;
    }

    // Staker Info
    struct Staker {
        // Amount of tokens stake by the user
        uint256 amountStaked;
        // Staked tokens
        StakedToken[] stakedTokens;
        // Last time of the rewards were calculated for this user
        uint256 timeOfLastUpdate;
        // Calculated, but unclaimed rewards for the User. The rewards are
        // Calculated each time the user writes to the Smart Contract
        uint256 unclaimedRewards;
    }

    // rewards
    uint256 private rewardsPerHour = 100;

    // Mapping of User Address to Staker info
    mapping(address => Staker) public stakers;
    // example
    // stakers[msg.sender] => point the address to the Staker Struct
    // Staker Struct will have properties (amountStaked)
    // How to access the property?
    // stakers[msg.sender].amountStaked
    // stakers[msg.sender].stakedTokens => the array of stakedTokens that contain StakedToken with property staker and tokenId
    // stakers[msg.sender].stakedTokens[0].staker
    // stakers[msg.sender].stakedTokens[0].tokenId
    // stakers[msg.sender].timeOfLastUpdate
    // stakers[msg.sender].unclaimedRewards

    // To remember who to send back the token to
    mapping(uint256 => address) public stakerAddress;

    function stake(uint256 _tokenId) external nonReentrant {
        // Pertama, check dulu, kalau pengguna sudah pernah stake,
        // Lakukan kalkulasi rewards
        // If wallet has the NFT staked, calculated the rewards before adding new nft
        if (stakers[msg.sender].amountStaked > 0) {
            uint256 rewards = calculateRewards(msg.sender);
            stakers[msg.sender].unclaimedRewards += rewards;
        }

        // Kedua, pastiin dulu apakah pemilik dari NFT nya adalah orang yang sama
        // wallet must own the NFT they are trying to stake
        require(
            nftCollection.ownerOf(_tokenId) == msg.sender,
            "You don't own this token"
        );

        // Jika iya, transfer NFT dari si pengguna ke smart contract
        // Transfer the NFT
        nftCollection.transferFrom(msg.sender, address(this), _tokenId);

        // Kita buat struct StakedToken, untuk alamat pengguna, dan token ID,
        // buat struct di dalam memory
        // Create StakedToken
        StakedToken memory stakedToken = StakedToken(msg.sender, _tokenId);

        // Masukan struct yang baru kita buat
        // ke dalam array stakedTokens
        // Add the token to the stakedTokens array
        stakers[msg.sender].stakedTokens.push(stakedToken);

        // Increment the amount staked for this wallet
        stakers[msg.sender].amountStaked++;

        // Update the mapping of the tokenId to the staker's address
        stakerAddress[_tokenId] = msg.sender;

        // Update the timeOfLastUpdate for the staker
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
    }

    function withdraw(uint256 _tokenId) external nonReentrant {
        // Make sure users is the stakers
        require(
            stakers[msg.sender].amountStaked > 0,
            "You don't have the NFT staked"
        );

        // Double check if user owns the nft
        require(stakerAddress[_tokenId] == msg.sender, "You are not the owner");

        // Find the index of this token id in the stakedTokens array
        uint256 index = 0;
        for (uint256 i = 0; i < stakers[msg.sender].stakedTokens.length; i++) {
            if (stakers[msg.sender].stakedTokens[i].tokenId == _tokenId) {
                index = i;
                break;
            }
        }

        // Remove this token from the stakedTokens array
        stakers[msg.sender].stakedTokens[index].staker = address(0);

        // Decrement
        stakers[msg.sender].amountStaked--;

        // Update the mapping of the tokenId to the address(0) to indicate the token is no longer stake
        stakerAddress[_tokenId] = address(0);

        // Transfer back
        nftCollection.transferFrom(address(this), msg.sender, _tokenId);

        // Update the time of last update
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
    }

    function claimRewards() external {
        uint rewards = calculateRewards(msg.sender) +
            stakers[msg.sender].unclaimedRewards;

        require(rewards > 0, "You don't have rewards to claim");

        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
        stakers[msg.sender].unclaimedRewards = 0;

        rewardsToken.safeTransfer(msg.sender, rewards);
    }

    function calculateRewards(
        address _staker
    ) internal view returns (uint256 _rewards) {
        return
            (((block.timestamp - stakers[_staker].timeOfLastUpdate) *
                stakers[_staker].amountStaked) * rewardsPerHour) / 3600;
    }

    function availableRewards(address _staker) public view returns (uint256) {
        uint256 rewards = calculateRewards(_staker) +
            stakers[_staker].unclaimedRewards;
        return rewards;
    }

    function getStakedTokens(
        address _user
    ) public view returns (StakedToken[] memory) {
        // Check the user
        if (stakers[_user].amountStaked > 0) {
            // Return all the tokens in the stakedToken array for this user that are not -1
            StakedToken[] memory _stakedTokens = new StakedToken[](
                stakers[_user].amountStaked
            );
            uint256 _index = 0;

            for (uint256 j = 0; j < stakers[_user].stakedTokens.length; j++) {
                if (stakers[_user].stakedTokens[j].staker != (address(0))) {
                    _stakedTokens[_index] = stakers[_user].stakedTokens[j];
                    _index++;
                }
            }

            return _stakedTokens;
        }
        // Otherwise, return empty array
        else {
            return new StakedToken[](0);
        }
    }
}
