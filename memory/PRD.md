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

### 5. Item Store & Inventory
- Cosmetic items: Skins, Accessories, Backgrounds, Particle Effects, Companions
- Rarity tiers: Common, Uncommon, Rare, Epic, Legendary
- Trust/streak/task requirements for high-rarity items
- Purchase cooldowns and settlement delays for low-trust users

### 6. Wallet & Marketplace
- MICO token balance tracking
- Transaction history
- Marketplace for redeeming tokens (gift cards, digital downloads, etc.)

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
10. All API endpoints tested and passing (19/19)

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
