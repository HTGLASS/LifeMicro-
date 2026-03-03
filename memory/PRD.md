# LifeMicro - Product Requirements Document

## Overview
LifeMicro is a cross-platform AI-powered life coach mobile app that helps users achieve their goals through micro-tasks. The app features a sophisticated anti-cheat system and a Tamagotchi-style character that evolves based on user progress.

## Core Features

### 1. User System
- Anonymous user creation via device ID
- Onboarding flow for goal selection (Fitness, Focus, Business, Relationships, Spiritual, Creativity, Health)
- Productive time and available time preferences
- Trust score tracking (0-100)

### 2. Task Management System
- AI-powered task generation (online mode with OpenAI GPT-4o)
- Offline task library with 521 tasks across 7 categories
- Context-aware task assignment based on energy level
- Task rewards in MICO tokens (3-25 per task)

### 3. Anti-Cheat System ✅ IMPLEMENTED
- **Time-Based Validation**: Tasks must be started before completion, minimum completion times enforced
- **Random Verification Prompts**: 15-60% chance based on trust tier
  - Text reflections (min 50 characters)
  - Contextual questions specific to goal category
  - Photo verification (placeholder)
  - Voice verification (placeholder)
- **Trust Score System**:
  - Tiers: Exemplary (80-100), Standard (50-79), Probation (30-49), Restricted (0-29)
  - Affects: Reward multipliers (0.5x-1.3x), verification probability, settlement delays
- **Suspicious Pattern Detection**: Rapid completions, too many tasks per hour

### 4. Tamagotchi-Style Character System ✅ IMPLEMENTED
- **Camera-Based Avatar**: Pixelated version of user's photo (placeholder for actual camera capture on mobile)
- **Evolution Tiers**: Seedling → Sprout → Bloom → Flourish → Transcend
- **Character Stats**:
  - Energy: Based on daily task completion
  - Integrity: Tied to trust score
  - Momentum: Driven by streak count
- **Mood System**: Thriving, Happy, Neutral, Tired, Weak, Fading
- **Deterioration**: Visual degradation after inactivity (7+ days = tier regression)

### 5. Character Shop & Inventory ✅ IMPLEMENTED (78 Items, 14 Categories)
- **Purpose**: MICO tokens are spent on character customization items
- **14 Item Categories** (equipable slots):
  1. Skin - Base character appearance
  2. Head - Hats, helmets, crowns
  3. Face - Glasses, masks, face paint
  4. Eyes - Eye styles, special eyes
  5. Mouth - Expressions, mouth accessories
  6. Body - Clothing, armor, outfits
  7. Back - Wings, capes, backpacks
  8. Hands - Gloves, held items
  9. Feet - Shoes, boots
  10. Background - Scene backgrounds
  11. Foreground - Overlay effects
  12. Aura - Glowing effects around character
  13. Particle - Sparkles, flames, trails
  14. Companion - Pets that follow
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary (with color-coded badges)
- **Requirements**: Higher rarity items require Trust Score, Streak, and Verified Task counts
- **Purchase Flow**: User buys item → Item goes to character inventory → User can equip on character
- **Security**: Purchase cooldowns and settlement delays for low-trust users

### 6. Wallet System
- MICO token balance tracking
- Transaction history
- Balance earned from task completion

## Technical Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py           # Main API (1683 lines)
├── anti_cheat.py       # Trust score & verification logic
├── character_system.py # Character models & evolution
├── task_library.py     # 521 pre-generated tasks
├── tasks.json          # Task data file
└── tests/
    └── test_api.py     # Comprehensive API tests
```

### Frontend (Expo/React Native)
```
/app/frontend/
├── app/
│   ├── (tabs)/
│   │   ├── home.tsx      # Tasks + Verification Modal
│   │   ├── character.tsx # Character creation/display
│   │   ├── wallet.tsx    # Balance & transactions
│   │   └── shop.tsx      # Marketplace
│   └── onboarding/       # Goals, Time, Ready screens
├── src/
│   ├── components/
│   │   ├── VerificationModal.tsx  # Anti-cheat UI
│   │   ├── PixelatedAvatar.tsx    # Character display
│   │   └── TaskCard.tsx           # Task UI
│   ├── store/
│   │   ├── taskStore.ts      # Task state + startTask/completeTask
│   │   └── characterStore.ts # Character state
│   └── utils/
│       └── pixelation.ts     # Avatar processing
```

## API Endpoints

### User APIs
- `POST /api/users` - Create/get user by device_id
- `PUT /api/users/{user_id}` - Update preferences
- `POST /api/users/{user_id}/complete-onboarding` - Complete onboarding

### Task APIs
- `POST /api/tasks/{user_id}/generate` - Generate tasks (online/offline)
- `GET /api/tasks/{user_id}` - Get user's tasks
- `POST /api/tasks/start` - Start task (anti-cheat)
- `POST /api/tasks/complete` - Complete with validation
- `POST /api/tasks/skip` - Skip a task

### Anti-Cheat APIs
- `GET /api/trust-score/{user_id}` - Get trust score & tier
- `GET /api/verification/{task_id}` - Get verification requirements

### Character APIs
- `POST /api/character/create` - Create character
- `GET /api/character/{user_id}` - Get character with stats
- `PUT /api/character/{user_id}/avatar` - Update avatar
- `GET /api/character/{user_id}/evolution` - Evolution status
- `POST /api/character/{user_id}/equip` - Equip item
- `POST /api/character/{user_id}/purchase` - Purchase item
- `GET /api/character/{user_id}/inventory` - Get owned items

### Store APIs
- `GET /api/character-store` - Get available items
- `GET /api/wallet/{user_id}` - Get wallet balance
- `GET /api/marketplace` - Get marketplace items
- `POST /api/marketplace/redeem` - Redeem item

## What's Been Implemented (December 2025)

### ✅ Completed
1. Full anti-cheat system backend (trust score, time validation, verification generation)
2. Character system backend (evolution, stats, mood, items)
3. Frontend verification modal with timer and input types
4. Task store with startTask/completeTask flow
5. Character screen with create/display functionality
6. Dark navy & teal theme across entire app
7. Firebase Push Notifications (configured for iOS & Android)
8. Hybrid task generation (AI + offline library)
9. 521 tasks in library across 7 categories
11. **Character Shop Conversion (DONE)**: Converted shop from external marketplace (gift cards) to character item store. Items now go to character inventory for customization.
12. **Equipped Items UI (DONE)**: Built 14-slot equipment grid on Character tab showing all equip slots with icons. Tap to open inventory modal for equipping/unequipping items.
13. **Camera Capture for Avatar (DONE)**: Implemented `processImageToPixels` function that processes camera photos into pixelated avatar data. Works on web (Canvas API) and native (hash-based generation).
14. **Visual Preview of Equipped Items (DONE)**: PixelatedAvatar component now displays equipped items as visual overlays around the character with rarity-based colors.
15. **Community System (DONE)**: Full community feature set implemented:
    - User profiles (optional public, privacy toggle)
    - Follow/friend system (no direct messaging)
    - Open groups anyone can join
    - User-created group challenges with voting system
    - Global leaderboard (tasks/streak/trust)
    - Activity feed from followed users

### ⏳ Placeholder/Future
1. Actual camera capture for avatar (expo-camera installed, placeholder generates simple avatar)
2. Photo verification (UI exists, backend accepts but doesn't verify)
3. Voice verification (UI placeholder)
4. HealthKit/Google Fit sensor validation (designed to be enabled later)
5. MICO token deployment to Polygon mainnet

## Testing Status
- Backend: 100% (19/19 tests passing)
- Frontend: All flows functional
- Test file: `/app/backend/tests/test_api.py`

## Integrations
- **OpenAI GPT-4o**: Task generation (via Emergent LLM Key)
- **Google AdMob**: In-app advertising
- **Firebase Cloud Messaging**: Push notifications
- **Polygon Amoy Testnet**: MICO token contract

## Environment Variables
### Backend (.env)
- `MONGO_URL` - MongoDB connection
- `DB_NAME` - Database name
- `EMERGENT_LLM_KEY` - For AI task generation
- `FIREBASE_SERVER_KEY` - For push notifications

### Frontend (.env)
- `EXPO_PUBLIC_BACKEND_URL` - API endpoint
- `EXPO_PUBLIC_MICO_CONTRACT` - Token contract address
- `EXPO_PUBLIC_POLYGON_NETWORK` - Network (amoy)

---
Last Updated: March 3, 2026
