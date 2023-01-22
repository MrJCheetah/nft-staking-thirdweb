import {
  ThirdwebNftMedia,
  useAddress,
  useMetamask,
  useContract,
  useTokenBalance,
  useOwnedNFTs,
} from "@thirdweb-dev/react";

import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import constant from "../config.json";
import { config } from "process";

const Stake: NextPage = () => {
  // Homework
  // Restate addresses

  // Connecting wallet
  const address = useAddress();
  const connectWithMetamask = useMetamask();

  // Contract Hooks
  const nftDropContract = useContract(
    constant.addresses.nftDrop,
    "nft-drop"
  ).contract;
  const tokenContract = useContract(
    constant.addresses.tokenADT,
    "token"
  ).contract;

  const { contract, isLoading, isError } = useContract(
    constant.addresses.nftStaking
  );

  // Load unstake NFTs
  const { data: ownedNfts } = useOwnedNFTs(nftDropContract, address);

  // Load token balance
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);

  ///////////////////////////////////////
  // custom contract function
  ///////////////////////////////////////

  const [stakedNFTs, setStakedNfts] = useState<any[]>([]);
  const [claimableRewards, setClaimableRewards] = useState<BigNumber>();

  useEffect(() => {
    if (!contract) return;

    async function loadStakedNFTs() {
      const stakedTokens = await contract?.call("getStakedTokens", address);

      // For each staked token, fetch it from the sdk
      const stakedNFTs = await Promise.all(
        stakedTokens.map(
          async (stakedToken: { staker: string; tokenId: BigNumber }) => {
            const nft = await nftDropContract?.get(stakedToken.tokenId);
            return nft;
          }
        )
      );

      setStakedNfts(stakedNFTs);
      console.log("setStakedNfts", stakedNFTs);
    }

    if (address) {
      loadStakedNFTs();
    }
  }, [address, contract, nftDropContract]);

  useEffect(() => {
    if (!contract || !address) return;

    async function loadClaimableRewards() {
      const cr = await contract?.call("availableRewards", address);
      console.log("Loaded claimable rewards", cr);
      setClaimableRewards(cr);
    }

    loadClaimableRewards();
  }, [address, contract]);

  //////////////////////////////////////
  // Write function
  /////////////////////////////////////

  async function stakeNft(id: BigNumber) {
    if (!address) return;

    const isApproved = await nftDropContract?.isApproved(
      address,
      constant.addresses.nftStaking
    );

    // If hasn't approved, req approval
    if (!isApproved) {
      await nftDropContract?.setApprovalForAll(
        constant.addresses.nftStaking,
        true
      );
    }

    const stake = await contract?.call("stake", id);
    console.log("stake", stake);
  }

  async function withdraw(id: BigNumber) {
    const withdraw = await contract?.call("withdraw", id);
    console.log("withdraw", withdraw);
  }

  async function claimRewards() {
    const claim = await contract?.call("claimRewards");
    console.log("claim", claim);
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Stake Your NFTs</h1>

      <hr className={`${styles.divider} ${styles.spacerTop}`}></hr>

      {!address ? (
        <button className={styles.mainButton} onClick={connectWithMetamask}>
          Connect Wallet
        </button>
      ) : (
        <>
          <h2>Your Tokens</h2>

          <div className={styles.tokenGrid}>
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
              <p className={styles.tokenValue}>
                <b>
                  {!claimableRewards
                    ? "Loading..."
                    : ethers.utils.formatUnits(claimableRewards, 18)}
                </b>{" "}
                {tokenBalance?.symbol}
              </p>
            </div>
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Current Balance</h3>
              <p className={styles.tokenValue}>
                <b>{tokenBalance?.displayValue}</b>
                {tokenBalance?.symbol}
              </p>
            </div>
          </div>

          <button
            className={`${styles.mainButton} ${styles.spacerTop}`}
            onClick={() => claimRewards()}
          >
            Claim Rewards
          </button>

          <hr className={`${styles.divider} ${styles.spacerTop}`}></hr>

          <h2>Your Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {stakedNFTs.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id}>
                {console.log("nft stakedNFTs map", nft)}
                {console.log("nft metadata typeof", typeof nft.metadata.id)}
                <ThirdwebNftMedia
                  metadata={nft.metadata}
                  className={styles.nftMedia}
                />
                <h3>{nft.metadata.name}</h3>
                <button
                  className={`${styles.mainButton} ${styles.spacerBottom}`}
                  onClick={() => withdraw(nft.metadata.id)}
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>

          <hr className={`${styles.divider} ${styles.spacerTop}`}></hr>

          <h2>UnStaked NFTs</h2>

          <div className={styles.nftBoxGrid}>
            {ownedNfts?.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id.toString()}>
                <ThirdwebNftMedia
                  metadata={nft.metadata}
                  className={styles.nftMedia}
                />
                <h3>{nft.metadata.name}</h3>
                <button
                  className={`${styles.mainButton} ${styles.spacerBottom}`}
                  onClick={() => stakeNft(BigNumber.from(nft.metadata.id))}
                >
                  Stake
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Stake;
