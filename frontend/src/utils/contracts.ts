import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import BeginnerChefABI from "../abi/BeginnerChef.json";
import ERC20ABI from "../abi/ERC20.json";

// Contracts from Handoff
export const CHEF_ADDRESS = "0x389F8290344516f2973E5E5f145537d6b7613086";
export const REWARD_TOKEN_ADDRESS = "0x73cb4331a2851D8CFc24741EcfeE8456DA482DE9";

export const POOLS = [
  { pid: 0, address: "0xa34C789F150E3A8Aa7d9fD2ff9F8B2B9aea5CC0c", symbol: "mETH" },
  { pid: 1, address: "0x2C5e38AAd5d722DA0617B6C71a23d13117036836", symbol: "mUSDC" },
  { pid: 2, address: "0x9a643400336928038CEd410D12d0C002709Ca147", symbol: "mBTC" },
  { pid: 3, address: "0x4B7C5AD87567c712A19f27d9Ed88eA7fdc2E1d75", symbol: "mSOL" },
];

export const EXPECTED_CHAIN_ID = 11155111; // Sepolia

export const getProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return null;
};

export const getChefContract = async (provider: BrowserProvider) => {
  const signer = await provider.getSigner();
  return new Contract(CHEF_ADDRESS, BeginnerChefABI, signer);
};

export const getERC20Contract = async (address: string, provider: BrowserProvider) => {
  const signer = await provider.getSigner();
  return new Contract(address, ERC20ABI, signer);
};

export const formatUnits = (value: bigint) => formatEther(value);
export const parseUnits = (value: string) => parseEther(value);
