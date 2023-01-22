import { useAddress, useMetamask, useContract } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

// useNFTDrop diganti useContract
// How to use
// const nftDrop = useContract("0x12345...", "nft-drop").contract;

const Mint: NextPage = () => {
  const router = useRouter();

  const address = useAddress();

  const connectWithMetamask = useMetamask();

  const nftDrop = useContract(
    "0xc4BAC744834115201E64dba0bf723c718Ecde9F8",
    "nft-drop"
  ).contract;

  async function claimNFT() {
    try {
      const tx = await nftDrop?.claim(1);
      console.log("tx", tx);
      alert("NFT Claimed");
      router.push("/stake");
    } catch (error) {
      console.log(error);
      alert(error);
    }
  }

  return (
    <div className={styles.container}>
      {!address ? (
        <button
          className={`${styles.mainButton} ${styles.spacerBottom}`}
          onClick={connectWithMetamask}
        >
          Connect Wallet
        </button>
      ) : (
        <button
          className={`${styles.mainButton} ${styles.spacerBottom}`}
          onClick={() => claimNFT()}
        >
          Claim An NFT
        </button>
      )}
    </div>
  );
};

export default Mint;
