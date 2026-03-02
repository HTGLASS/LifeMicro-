# LifeMicro Setup Guides

This document contains step-by-step instructions for setting up:
1. **Polygon Smart Contract** (MICO Token)
2. **Firebase Push Notifications**
3. **Google AdMob**

---

# 📜 PART 1: POLYGON SMART CONTRACT (MICO TOKEN)

## What This Does
Creates a real cryptocurrency token (MICO) on the Polygon blockchain that users earn for completing tasks.

## Prerequisites
- A computer with internet access
- About 30 minutes of time
- A small amount of MATIC tokens (~$5 worth for deployment)

---

## Step 1: Install Node.js

**On Mac:**
```bash
# Open Terminal and run:
brew install node
```

**On Windows:**
1. Go to https://nodejs.org
2. Download the "LTS" version
3. Run the installer, click "Next" through everything

**Verify it worked:**
```bash
node --version
# Should show something like: v20.x.x
```

---

## Step 2: Create Your Smart Contract Project

Open Terminal (Mac) or Command Prompt (Windows) and run these commands:

```bash
# Create a new folder
mkdir lifemicro-contracts
cd lifemicro-contracts

# Initialize the project
npm init -y

# Install Hardhat (the tool for deploying contracts)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Install OpenZeppelin (secure, pre-built contract code)
npm install @openzeppelin/contracts
```

---

## Step 3: Set Up Hardhat

Run this command:
```bash
npx hardhat init
```

When asked, select:
- **Create a JavaScript project**
- Press Enter for the rest (accept defaults)

---

## Step 4: Create the MICO Token Contract

Create a new file at `contracts/MICOToken.sol` with this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MICOToken
 * @dev ERC20 Token for LifeMicro app rewards
 * 
 * Features:
 * - Mintable by owner (your backend server)
 * - Burnable (for marketplace redemptions)
 * - Ownable (you control it)
 */
contract MICOToken is ERC20, ERC20Burnable, Ownable {
    
    // Events for tracking
    event TokensAwarded(address indexed user, uint256 amount, string reason);
    event TokensBurned(address indexed user, uint256 amount, string itemId);
    
    // Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Track total minted
    uint256 public totalMinted;
    
    constructor() ERC20("MicroCoin", "MICO") Ownable(msg.sender) {
        // Mint initial supply to owner (10 million tokens for testing)
        _mint(msg.sender, 10_000_000 * 10**18);
        totalMinted = 10_000_000 * 10**18;
    }
    
    /**
     * @dev Award tokens to a user (called by your backend)
     * @param to User's wallet address
     * @param amount Amount of tokens to award
     * @param reason Why tokens were awarded (e.g., "task_completed")
     */
    function awardTokens(
        address to, 
        uint256 amount, 
        string memory reason
    ) external onlyOwner {
        require(totalMinted + amount <= MAX_SUPPLY, "Would exceed max supply");
        _mint(to, amount);
        totalMinted += amount;
        emit TokensAwarded(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens for marketplace redemption
     * @param amount Amount of tokens to burn
     * @param itemId The marketplace item being redeemed
     */
    function burnForRedemption(
        uint256 amount, 
        string memory itemId
    ) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, itemId);
    }
    
    /**
     * @dev Batch award tokens to multiple users
     * @param recipients Array of user addresses
     * @param amounts Array of token amounts
     */
    function batchAward(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays must match");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(totalMinted + amounts[i] <= MAX_SUPPLY, "Would exceed max supply");
            _mint(recipients[i], amounts[i]);
            totalMinted += amounts[i];
        }
    }
}
```

---

## Step 5: Configure Hardhat for Polygon

Replace the contents of `hardhat.config.js` with:

```javascript
require("@nomicfoundation/hardhat-toolbox");

// Your private key - KEEP THIS SECRET!
// Get this from MetaMask (see Step 6)
const PRIVATE_KEY = "your_private_key_here";

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Polygon Testnet (use this first to test)
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
    // Polygon Mainnet (use this for real deployment)
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: "YOUR_POLYGONSCAN_API_KEY",
      polygon: "YOUR_POLYGONSCAN_API_KEY",
    },
  },
};
```

---

## Step 6: Set Up MetaMask Wallet

1. **Install MetaMask:**
   - Go to https://metamask.io
   - Click "Download"
   - Add the browser extension

2. **Create a new wallet:**
   - Follow the setup prompts
   - **WRITE DOWN YOUR SEED PHRASE** (12 words) - store it safely!

3. **Get your private key:**
   - Click the three dots in MetaMask
   - Click "Account Details"
   - Click "Show Private Key"
   - Enter your password
   - Copy the private key

4. **Add Polygon Network to MetaMask:**
   - Go to https://chainlist.org
   - Search for "Polygon"
   - Click "Add to MetaMask" for both:
     - Polygon Mainnet
     - Polygon Amoy Testnet

---

## Step 7: Get Test MATIC (for Testnet)

1. Go to https://faucet.polygon.technology/
2. Select "Amoy" testnet
3. Paste your MetaMask wallet address
4. Complete the verification
5. Click "Submit"

You should receive test MATIC within a few minutes.

---

## Step 8: Create Deployment Script

Create a file at `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying MICO Token...");

  const MICOToken = await hre.ethers.getContractFactory("MICOToken");
  const mico = await MICOToken.deploy();

  await mico.waitForDeployment();

  const address = await mico.getAddress();
  console.log("✅ MICO Token deployed to:", address);
  console.log("");
  console.log("Save this address! You'll need it for your backend.");
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify the contract on PolygonScan");
  console.log("2. Add the contract address to your backend .env file");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## Step 9: Deploy to Testnet

```bash
# Compile the contract
npx hardhat compile

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deploy.js --network polygonAmoy
```

**What you should see:**
```
Deploying MICO Token...
✅ MICO Token deployed to: 0x1234...5678
```

**Save this address!** You'll need it later.

---

## Step 10: Verify on PolygonScan (Optional but Recommended)

1. Go to https://amoy.polygonscan.com (testnet) or https://polygonscan.com (mainnet)
2. Create a free account
3. Go to API Keys and create one
4. Add to your `hardhat.config.js`

Then run:
```bash
npx hardhat verify --network polygonAmoy YOUR_CONTRACT_ADDRESS
```

---

## Step 11: Deploy to Mainnet (When Ready)

1. **Buy MATIC tokens:**
   - Use Coinbase, Binance, or any exchange
   - Send to your MetaMask wallet address
   - You need about $5 worth

2. **Deploy:**
```bash
npx hardhat run scripts/deploy.js --network polygon
```

---

## Managing Token Supply

To mint more tokens or manage supply, you can create additional scripts:

```javascript
// scripts/mint.js
const hre = require("hardhat");

async function main() {
  const contractAddress = "YOUR_CONTRACT_ADDRESS";
  const userAddress = "USER_WALLET_ADDRESS";
  const amount = hre.ethers.parseEther("100"); // 100 tokens
  
  const MICOToken = await hre.ethers.getContractAt("MICOToken", contractAddress);
  
  const tx = await MICOToken.awardTokens(userAddress, amount, "manual_award");
  await tx.wait();
  
  console.log("✅ Tokens awarded!");
}

main();
```

---

# 🔔 PART 2: FIREBASE PUSH NOTIFICATIONS

## What This Does
Sends push notifications to users' phones when it's time for their daily tasks.

---

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it "LifeMicro" (or any name)
4. Disable Google Analytics (not needed for MVP)
5. Click "Create project"

---

## Step 2: Add Your App to Firebase

### For iOS:
1. Click the iOS icon
2. Enter Bundle ID: `com.yourname.lifemicro`
3. Download `GoogleService-Info.plist`
4. Keep this file - you'll add it to your Xcode project

### For Android:
1. Click the Android icon
2. Enter Package name: `com.yourname.lifemicro`
3. Download `google-services.json`
4. Keep this file - you'll add it to your Android project

---

## Step 3: Enable Cloud Messaging

1. In Firebase Console, click the gear icon (Settings)
2. Go to "Project settings"
3. Click "Cloud Messaging" tab
4. Note down the **Server Key** (you'll need this for backend)

---

## Step 4: Install Firebase in Your Expo App

In your terminal, navigate to the frontend folder and run:

```bash
cd /app/frontend
npx expo install expo-notifications expo-device expo-constants
```

---

## Step 5: Configure app.json

Add this to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366F1"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

---

## Step 6: Add Notification Code

Create a new file at `/app/frontend/src/utils/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  let token;

  // Check if physical device (notifications don't work on simulators)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permission');
    return null;
  }

  // Get the push token
  token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // Configure Android channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  return token.data;
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  // Cancel existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule new daily reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for a micro-win! 🎯",
      body: "You have tasks waiting. Complete one and earn MICO!",
      sound: true,
    },
    trigger: {
      hour: hour,
      minute: minute,
      repeats: true,
    },
  });
}

export async function sendImmediateNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Immediate
  });
}
```

---

## Step 7: Use in Your App

In your home screen or after onboarding, add:

```typescript
import { registerForPushNotifications, scheduleDailyReminder } from '../src/utils/notifications';

// In your useEffect or after onboarding:
useEffect(() => {
  async function setupNotifications() {
    const token = await registerForPushNotifications();
    if (token) {
      // Save token to backend for server-side notifications
      await fetch(`${API_URL}/api/users/${userId}/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_token: token }),
      });
      
      // Schedule daily reminder based on user's productive time
      const hour = productiveTime === 'morning' ? 8 : 
                   productiveTime === 'afternoon' ? 13 : 18;
      await scheduleDailyReminder(hour, 0);
    }
  }
  setupNotifications();
}, []);
```

---

## Step 8: Build for Testing

To test push notifications, you need a development build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS (requires Apple Developer account)
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android
```

---

# 📱 PART 3: GOOGLE ADMOB

## What This Does
Shows real ads in your app and earns you money when users view or click them.

---

## Step 1: Create AdMob Account

1. Go to https://admob.google.com
2. Sign in with your Google account
3. Click "Get Started"
4. Accept the terms
5. Enter your payment information

---

## Step 2: Create Your App in AdMob

1. Click "Apps" in the left sidebar
2. Click "Add App"
3. Select platform (iOS or Android)
4. Choose "No" if your app isn't on the store yet
5. Enter app name: "LifeMicro"
6. Click "Add"

**Note the App ID** - it looks like: `ca-app-pub-1234567890123456~1234567890`

---

## Step 3: Create Ad Units

1. Click on your app
2. Click "Ad units"
3. Create these ad units:

### Banner Ad (for small ads between tasks)
- Click "Add ad unit"
- Select "Banner"
- Name it "Task Banner"
- Click "Create"
- **Note the Ad Unit ID**

### Interstitial Ad (optional, for between screens)
- Click "Add ad unit"
- Select "Interstitial"
- Name it "Screen Transition"
- Click "Create"
- **Note the Ad Unit ID**

### Rewarded Ad (optional, earn extra tokens by watching)
- Click "Add ad unit"
- Select "Rewarded"
- Name it "Bonus Tokens"
- Click "Create"
- **Note the Ad Unit ID**

---

## Step 4: Install AdMob in Your App

```bash
cd /app/frontend
npx expo install react-native-google-mobile-ads
```

---

## Step 5: Configure app.json

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXX~XXXXX",
          "iosAppId": "ca-app-pub-XXXXX~XXXXX"
        }
      ]
    ]
  }
}
```

Replace the X's with your actual App IDs from Step 2.

---

## Step 6: Create Ad Component

Replace `/app/frontend/src/components/AdBanner.tsx` with:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface AdBannerProps {
  type?: 'small' | 'medium' | 'large';
}

// Use test IDs during development, real IDs in production
const AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : Platform.select({
      ios: 'ca-app-pub-XXXXX/XXXXX', // Your iOS banner ad unit ID
      android: 'ca-app-pub-XXXXX/XXXXX', // Your Android banner ad unit ID
    });

export default function AdBanner({ type = 'small' }: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  const adSize = type === 'small' 
    ? BannerAdSize.BANNER 
    : type === 'medium' 
    ? BannerAdSize.MEDIUM_RECTANGLE 
    : BannerAdSize.LARGE_BANNER;

  if (adError) {
    // Show placeholder if ad fails to load
    return (
      <View style={[styles.placeholder, { height: type === 'small' ? 50 : 90 }]}>
        <Text style={styles.placeholderText}>Ad Space</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID!}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.log('Ad failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  placeholder: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 12,
  },
});
```

---

## Step 7: Add Rewarded Ads (Optional - Watch Ad for Bonus Tokens)

Create `/app/frontend/src/components/RewardedAdButton.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Ionicons } from '@expo/vector-icons';

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXX/XXXXX';

interface Props {
  onRewardEarned: (amount: number) => void;
}

export default function RewardedAdButton({ onRewardEarned }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setLoaded(true);
        setLoading(false);
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('User earned reward:', reward);
        onRewardEarned(25); // Award 25 bonus MICO
      }
    );

    // Load the ad
    setLoading(true);
    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, []);

  const showAd = async () => {
    if (loaded) {
      await rewarded.show();
      setLoaded(false);
      // Reload for next time
      rewarded.load();
    }
  };

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
        <ActivityIndicator color="#FFF" size="small" />
        <Text style={styles.buttonText}>Loading...</Text>
      </TouchableOpacity>
    );
  }

  if (!loaded) {
    return null; // Don't show button if ad isn't ready
  }

  return (
    <TouchableOpacity style={styles.button} onPress={showAd}>
      <Ionicons name="play-circle" size={20} color="#FFF" />
      <Text style={styles.buttonText}>Watch Ad for +25 MICO</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
```

---

## Step 8: Build for Ad Testing

Ads require a production build to test real ads:

```bash
# Build for testing
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

---

## Important AdMob Notes

1. **Test ads only work in development mode** - Real ads require a production build
2. **Don't click your own ads** - Google will ban you
3. **It takes 1-2 days** for AdMob to approve your app
4. **Earnings appear** in your AdMob dashboard after ~24 hours
5. **Payment threshold** is $100 - you'll get paid when you reach this

---

# 🚀 DEPLOYING TO APP STORES

## Apple App Store

1. **Apple Developer Account** - $99/year at https://developer.apple.com
2. **Build your app:**
   ```bash
   eas build --platform ios --profile production
   ```
3. **Submit via App Store Connect**

## Google Play Store

1. **Google Play Developer Account** - $25 one-time at https://play.google.com/console
2. **Build your app:**
   ```bash
   eas build --platform android --profile production
   ```
3. **Submit via Google Play Console**

---

# 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Google the error message
3. Ask in the Expo Discord: https://chat.expo.dev
4. Check Stack Overflow

Good luck with LifeMicro! 🎉
