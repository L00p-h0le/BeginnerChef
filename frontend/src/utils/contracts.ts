import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import BeginnerChefABI from "../abi/BeginnerChef.json";
import ERC20ABI from "../abi/ERC20.json";

// Contracts from Handoff
export const CHEF_ADDRESS = "0xb2027252C51202E66e439a5f0538372172782817";
export const REWARD_TOKEN_ADDRESS = "0x970F5109F3708B97671625711ea77615Ece1A201";

export const POOLS = [
  { pid: 0, address: "0x2ed8172042715d38edc27C59163c907b1215a942", symbol: "STK1" },
  { pid: 1, address: "0x4d1a510F1d755abE659D75eeFf2ed6D1ae73bDe8", symbol: "STK2" },
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
