require("@nomicfoundation/hardhat-toolbox");

// ⚠️ IMPORTANT: Replace this with your MetaMask private key
// Get it from: MetaMask → Three dots → Account details → Show private key
// Remove the "0x" from the beginning if present
const PRIVATE_KEY = "PASTE_YOUR_PRIVATE_KEY_HERE";

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Polygon Testnet (free, for testing)
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
    // Polygon Mainnet (real money, for production)
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
  },
};
