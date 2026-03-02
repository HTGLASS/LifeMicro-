const hre = require("hardhat");

async function main() {
  console.log("");
  console.log("🚀 Deploying MICO Token to Polygon...");
  console.log("");

  // Get the contract factory
  const MICOToken = await hre.ethers.getContractFactory("MICOToken");
  
  // Deploy the contract
  console.log("⏳ Sending transaction...");
  const mico = await MICOToken.deploy();

  // Wait for deployment to complete
  console.log("⏳ Waiting for confirmation...");
  await mico.waitForDeployment();

  // Get the deployed contract address
  const address = await mico.getAddress();
  
  console.log("");
  console.log("✅ ✅ ✅ SUCCESS! ✅ ✅ ✅");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📋 YOUR MICO TOKEN CONTRACT ADDRESS:");
  console.log("");
  console.log("   " + address);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("⚠️  IMPORTANT: Copy and save this address!");
  console.log("");
  console.log("🔍 View your token at:");
  
  const network = hre.network.name;
  if (network === "polygonAmoy") {
    console.log("   https://amoy.polygonscan.com/address/" + address);
  } else {
    console.log("   https://polygonscan.com/address/" + address);
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log("");
    console.error("❌ DEPLOYMENT FAILED");
    console.error("");
    console.error("Error:", error.message);
    console.log("");
    console.log("Common fixes:");
    console.log("1. Make sure your private key is correct in hardhat.config.js");
    console.log("2. Make sure you have MATIC in your wallet for gas fees");
    console.log("3. Make sure MetaMask is set to the right network");
    console.log("");
    process.exit(1);
  });
