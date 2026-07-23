import { useState, useEffect } from "react";
import { BrowserProvider, formatEther } from "ethers";
import {
  getProvider,
  getChefContract,
  getERC20Contract,
  REWARD_TOKEN_ADDRESS,
  POOLS,
  EXPECTED_CHAIN_ID,
  CHEF_ADDRESS,
} from "../utils/contracts";

export function useWeb3() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [totalAllocPoint, setTotalAllocPoint] = useState<number>(0);
  const [rewardRate, setRewardRate] = useState<string>("0");
  const [rwdBalance, setRwdBalance] = useState<string>("0");
  const [globalTVL, setGlobalTVL] = useState<string>("0");
  const [totalUserStaked, setTotalUserStaked] = useState<string>("0");
  const [totalUserClaimable, setTotalUserClaimable] = useState<string>("0");

  const connectWallet = async () => {
    const prov = getProvider();
    if (!prov) {
      alert("Please install MetaMask or another Web3 wallet!");
      return;
    }
    try {
      const accounts = await prov.send("eth_requestAccounts", []);
      const network = await prov.getNetwork();

      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        setIsWrongNetwork(true);
        try {
          await prov.send("wallet_switchEthereumChain", [
            { chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` },
          ]);
          setIsWrongNetwork(false);
        } catch (switchError) {
          console.error(switchError);
        }
      }

      setAccount(accounts[0]);
      setProvider(prov);
    } catch (err) {
      console.error(err);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setAccount("");
    setTotalAllocPoint(0);
    setRewardRate("0");
    setRwdBalance("0");
    setGlobalTVL("0");
    setTotalUserStaked("0");
    setTotalUserClaimable("0");
  };

  const loadGlobalData = async () => {
    if (!provider) return;
    try {
      const chef = await getChefContract(provider);
      const alloc = await chef.totalAllocPoint();
      setTotalAllocPoint(Number(alloc));

      const rate = await chef.rewardPerSecond();
      setRewardRate(formatEther(rate));

      let tvlSum = 0n;
      let stakedSum = 0n;
      let claimableSum = 0n;

      // Always fetch TVL
      for (const pool of POOLS) {
        const token = await getERC20Contract(pool.address, provider);
        const poolTVL = await token.balanceOf(CHEF_ADDRESS);
        tvlSum += poolTVL;
      }

      // Try fetching user specific data
      try {
        const signer = await provider.getSigner();
        const userAddr = await signer.getAddress();
        const rwdToken = await getERC20Contract(
          REWARD_TOKEN_ADDRESS,
          provider
        );
        const bal = await rwdToken.balanceOf(userAddr);
        setRwdBalance(formatEther(bal));

        for (const pool of POOLS) {
          const userInfo = await chef.userInfo(pool.pid, userAddr);
          stakedSum += userInfo[0];

          const pRewards = await chef.pendingRewards(pool.pid, userAddr);
          claimableSum += pRewards;
        }
      } catch (e) {
        console.error("Error fetching user balances", e);
      }

      setGlobalTVL(formatEther(tvlSum));
      setTotalUserStaked(formatEther(stakedSum));
      setTotalUserClaimable(formatEther(claimableSum));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (provider) {
      loadGlobalData();
      const interval = setInterval(loadGlobalData, 5000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  return {
    provider,
    account,
    isWrongNetwork,
    totalAllocPoint,
    rewardRate,
    rwdBalance,
    globalTVL,
    totalUserStaked,
    totalUserClaimable,
    connectWallet,
    disconnectWallet,
  };
}
