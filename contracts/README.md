# MICO Token - LifeMicro Blockchain Setup

## What You Need To Do (4 Simple Steps)

### Step 1: Install MetaMask (5 minutes)
1. Go to https://metamask.io
2. Click "Download" and add to your browser
3. Create a new wallet
4. **WRITE DOWN your 12-word recovery phrase on paper!**

### Step 2: Get Your Private Key
1. In MetaMask, click the three dots (⋮)
2. Click "Account details"
3. Click "Show private key"
4. Enter your password
5. Copy the key (starts with a bunch of letters and numbers)

### Step 3: Add Your Private Key to the Config
1. Open the file `hardhat.config.js`
2. Find the line that says `PASTE_YOUR_PRIVATE_KEY_HERE`
3. Replace it with your private key
4. Save the file

### Step 4: Get Free Test Money & Deploy
1. Copy your wallet address from MetaMask (click on it)
2. Go to https://faucet.polygon.technology/
3. Select "Amoy" and paste your address
4. Wait for the free test MATIC

Then run these commands:
```
npm install
npm run compile
npm run deploy:testnet
```

## That's it! 

The deployment will show you your contract address. Save it!

---

## When Ready for Real Deployment

1. Buy MATIC on Coinbase or Binance (~$10 worth)
2. Send it to your MetaMask wallet
3. Run: `npm run deploy:mainnet`

---

## Quick Commands

| What | Command |
|------|---------|
| Install dependencies | `npm install` |
| Compile contract | `npm run compile` |
| Deploy to testnet | `npm run deploy:testnet` |
| Deploy to mainnet | `npm run deploy:mainnet` |
