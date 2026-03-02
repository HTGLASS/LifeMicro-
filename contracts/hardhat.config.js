require("@nomicfoundation/hardhat-toolbox");

// ⚠️ IMPORTANT: This is your MetaMask private key
const PRIVATE_KEY = "fa80cd821c471237e8ecc47aefd4975077147edf3f59557866cbf3e3d2b9e9b0";

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
