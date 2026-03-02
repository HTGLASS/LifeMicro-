from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="LifeMicro API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class GoalType(str, Enum):
    FITNESS = "fitness"
    FOCUS = "focus"
    BUSINESS = "business"
    RELATIONSHIPS = "relationships"
    SPIRITUAL = "spiritual"
    CREATIVITY = "creativity"
    HEALTH = "health"

class ProductiveTime(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"

class AvailableTime(str, Enum):
    FIVE_MIN = "5min"
    FIFTEEN_MIN = "15min"
    THIRTY_MIN = "30min"
    SIXTY_MIN = "60min"

class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"

class TransactionType(str, Enum):
    EARNED = "earned"
    REDEEMED = "redeemed"
    BONUS = "bonus"
    STREAK = "streak"

# ============== MODELS ==============

# User Models
class UserPreferences(BaseModel):
    goals: List[GoalType] = []
    productive_time: Optional[ProductiveTime] = None
    available_time: Optional[AvailableTime] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    name: Optional[str] = None
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    onboarding_completed: bool = False
    streak_count: int = 0
    last_active_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    device_id: str
    name: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    onboarding_completed: Optional[bool] = None

# Task Models
class MicroTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    time_estimate: str  # "5 min", "10 min", etc.
    reward_amount: int  # MICO tokens
    status: TaskStatus = TaskStatus.PENDING
    goal_category: GoalType
    context_question: Optional[str] = None
    context_answer: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class TaskComplete(BaseModel):
    task_id: str

class TaskSkip(BaseModel):
    task_id: str
    reason: Optional[str] = None

# Token/Wallet Models
class TokenTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: int
    type: TransactionType
    task_id: Optional[str] = None
    item_id: Optional[str] = None
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class UserWallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    balance: int = 0
    total_earned: int = 0
    total_redeemed: int = 0
    transactions: List[TokenTransaction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Marketplace Models
class MarketplaceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    image_url: Optional[str] = None
    token_cost: int
    category: str
    stock: int = -1  # -1 means unlimited
    redemption_type: str  # "discount_code", "digital_download", "affiliate"
    redemption_value: str  # The actual code or link
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Redemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    item_id: str
    item_title: str
    tokens_burned: int
    reward_code: str
    status: str = "completed"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RedeemRequest(BaseModel):
    user_id: str
    item_id: str

# Context Question Models
class ContextQuestion(BaseModel):
    question: str
    options: List[str]

class ContextAnswer(BaseModel):
    user_id: str
    question: str
    answer: str

# ============== AI TASK GENERATION ==============

async def generate_ai_tasks(user: dict, context_answer: Optional[str] = None) -> List[dict]:
    """Generate personalized micro-tasks from library (FREE - no AI cost!)"""
    preferences = user.get('preferences', {})
    goals = preferences.get('goals', ['focus'])
    available_time = preferences.get('available_time', '15min')
    
    # Use the pre-built task library - NO API COST!
    return get_tasks_from_library(goals, context_answer, available_time)

def get_tasks_from_library(goals: List[str], context_answer: Optional[str] = None, available_time: str = "15min") -> List[dict]:
    """Get tasks from pre-generated library - NO AI COST!"""
    from task_library import TASK_LIBRARY, TIME_FILTERS
    
    # Determine energy level from context
    energy_level = "medium"
    if context_answer:
        answer_lower = context_answer.lower()
        if any(word in answer_lower for word in ["energized", "high", "motivated", "great"]):
            energy_level = "high"
        elif any(word in answer_lower for word in ["tired", "low", "exhausted", "stressed", "winding"]):
            energy_level = "low"
    
    # Get max time in minutes
    max_time = TIME_FILTERS.get(available_time, 15)
    
    # Collect eligible tasks
    eligible_tasks = []
    
    for goal in goals:
        if goal in TASK_LIBRARY:
            goal_tasks = TASK_LIBRARY[goal]
            for task in goal_tasks:
                # Parse time estimate
                time_str = task.get("time_estimate", "5 min")
                task_time = int(time_str.replace(" min", "").replace("min", "")) if "min" in time_str else 5
                
                # Filter by time
                if task_time <= max_time:
                    task_with_category = {**task, "goal_category": goal}
                    eligible_tasks.append(task_with_category)
    
    # If no goals matched, use focus and health as defaults
    if not eligible_tasks:
        for goal in ["focus", "health"]:
            if goal in TASK_LIBRARY:
                for task in TASK_LIBRARY[goal][:10]:
                    task_with_category = {**task, "goal_category": goal}
                    eligible_tasks.append(task_with_category)
    
    # Filter by energy level
    if energy_level == "low":
        # Prefer calmer tasks
        calm_keywords = ["breathing", "stretch", "water", "mindful", "gratitude", "sit", "reflect", "pause"]
        calm_tasks = [t for t in eligible_tasks if any(kw in t["title"].lower() or kw in t["description"].lower() for kw in calm_keywords)]
        if len(calm_tasks) >= 3:
            eligible_tasks = calm_tasks
    elif energy_level == "high":
        # Prefer active tasks
        active_keywords = ["jump", "walk", "exercise", "challenge", "sprint", "burpee", "squat", "active"]
        active_tasks = [t for t in eligible_tasks if any(kw in t["title"].lower() or kw in t["description"].lower() for kw in active_keywords)]
        if len(active_tasks) >= 3:
            eligible_tasks = active_tasks
    
    # Randomly select 3 tasks
    selected = random.sample(eligible_tasks, min(3, len(eligible_tasks)))
    
    return selected

# Legacy function for backwards compatibility
def get_fallback_tasks(goals: List[str]) -> List[dict]:
    """Fallback tasks - now uses the library"""
    return get_tasks_from_library(goals)

# ============== API ROUTES ==============

# Health check
@api_router.get("/")
async def root():
    return {"message": "LifeMicro API", "version": "1.0.0", "status": "healthy"}

# ---------- USER ROUTES ----------

@api_router.post("/users", response_model=User)
async def create_or_get_user(user_create: UserCreate):
    """Create a new user or return existing user by device_id"""
    existing = await db.users.find_one({"device_id": user_create.device_id})
    if existing:
        existing['id'] = str(existing.get('_id', existing.get('id')))
        return User(**existing)
    
    user = User(device_id=user_create.device_id, name=user_create.name)
    user_dict = user.model_dump()
    await db.users.insert_one(user_dict)
    
    # Create wallet for user
    wallet = UserWallet(user_id=user.id)
    await db.wallets.insert_one(wallet.model_dump())
    
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    """Update user profile and preferences"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if "preferences" in update_data and update_data["preferences"]:
        # Merge preferences
        current_prefs = user.get("preferences", {})
        new_prefs = update_data["preferences"]
        if isinstance(new_prefs, dict):
            for key, value in new_prefs.items():
                if value is not None:
                    current_prefs[key] = value
            update_data["preferences"] = current_prefs
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.post("/users/{user_id}/complete-onboarding", response_model=User)
async def complete_onboarding(user_id: str):
    """Mark user onboarding as completed"""
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"onboarding_completed": True, "updated_at": datetime.utcnow()}}
    )
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# ---------- TASK ROUTES ----------

@api_router.get("/tasks/{user_id}/context-question")
async def get_context_question(user_id: str):
    """Get a context question before generating tasks"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    questions = [
        {"question": "How are you feeling right now?", "options": ["Energized", "Tired", "Stressed", "Calm", "Motivated"]},
        {"question": "What's your energy level?", "options": ["High", "Medium", "Low", "Just woke up", "Winding down"]},
        {"question": "How much time do you have right now?", "options": ["Just a minute", "5-10 minutes", "15-30 minutes", "30+ minutes"]},
        {"question": "What would help you most right now?", "options": ["Quick win", "Physical movement", "Mental clarity", "Connection", "Relaxation"]},
    ]
    
    return random.choice(questions)

@api_router.post("/tasks/{user_id}/generate")
async def generate_tasks(user_id: str, context: Optional[ContextAnswer] = None):
    """Generate new AI-powered micro-tasks for the user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for existing pending tasks today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_pending = await db.tasks.count_documents({
        "user_id": user_id,
        "status": TaskStatus.PENDING,
        "created_at": {"$gte": today_start}
    })
    
    if existing_pending >= 5:
        raise HTTPException(status_code=400, detail="You already have pending tasks. Complete or skip them first.")
    
    # Generate AI tasks
    context_answer = context.answer if context else None
    ai_tasks = await generate_ai_tasks(user, context_answer)
    
    # Save tasks to database
    saved_tasks = []
    for task_data in ai_tasks:
        task = MicroTask(
            user_id=user_id,
            title=task_data.get("title", "Quick Task"),
            description=task_data.get("description", "Complete this task"),
            time_estimate=task_data.get("time_estimate", "5 min"),
            reward_amount=task_data.get("reward_amount", 10),
            goal_category=task_data.get("goal_category", "focus"),
            context_question=context.question if context else None,
            context_answer=context_answer
        )
        await db.tasks.insert_one(task.model_dump())
        saved_tasks.append(task)
    
    return {"tasks": [t.model_dump() for t in saved_tasks]}

@api_router.get("/tasks/{user_id}")
async def get_user_tasks(
    user_id: str, 
    status: Optional[TaskStatus] = None,
    limit: int = Query(default=10, le=50)
):
    """Get tasks for a user"""
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return {"tasks": [serialize_doc(t) for t in tasks]}

@api_router.post("/tasks/complete")
async def complete_task(task_complete: TaskComplete):
    """Mark a task as completed and award tokens"""
    task = await db.tasks.find_one({"id": task_complete.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task already processed")
    
    # Update task status
    await db.tasks.update_one(
        {"id": task_complete.task_id},
        {"$set": {"status": TaskStatus.COMPLETED, "completed_at": datetime.utcnow()}}
    )
    
    # Award tokens
    reward_amount = task.get("reward_amount", 10)
    user_id = task["user_id"]
    
    # Update wallet
    transaction = TokenTransaction(
        amount=reward_amount,
        type=TransactionType.EARNED,
        task_id=task_complete.task_id,
        description=f"Completed: {task['title']}"
    )
    
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {"balance": reward_amount, "total_earned": reward_amount},
            "$push": {"transactions": transaction.model_dump()}
        }
    )
    
    # Update streak
    user = await db.users.find_one({"id": user_id})
    today = datetime.utcnow().strftime("%Y-%m-%d")
    last_active = user.get("last_active_date")
    
    streak_bonus = 0
    if last_active:
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        if last_active == yesterday:
            new_streak = user.get("streak_count", 0) + 1
            # Streak bonus every 7 days
            if new_streak % 7 == 0:
                streak_bonus = new_streak * 2
                bonus_transaction = TokenTransaction(
                    amount=streak_bonus,
                    type=TransactionType.STREAK,
                    description=f"🔥 {new_streak} day streak bonus!"
                )
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {
                        "$inc": {"balance": streak_bonus, "total_earned": streak_bonus},
                        "$push": {"transactions": bonus_transaction.model_dump()}
                    }
                )
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"streak_count": new_streak, "last_active_date": today}}
            )
        elif last_active != today:
            # Streak broken
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"streak_count": 1, "last_active_date": today}}
            )
    else:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"streak_count": 1, "last_active_date": today}}
        )
    
    # Get updated wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    return {
        "success": True,
        "tokens_earned": reward_amount,
        "streak_bonus": streak_bonus,
        "new_balance": wallet.get("balance", 0),
        "message": f"Great job! You earned {reward_amount} MICO!"
    }

@api_router.post("/tasks/skip")
async def skip_task(task_skip: TaskSkip):
    """Skip a task"""
    task = await db.tasks.find_one({"id": task_skip.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task already processed")
    
    await db.tasks.update_one(
        {"id": task_skip.task_id},
        {"$set": {"status": TaskStatus.SKIPPED}}
    )
    
    return {"success": True, "message": "Task skipped. You can do it next time!"}

# ---------- WALLET ROUTES ----------

@api_router.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get user's wallet and token balance"""
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        # Create wallet if doesn't exist
        wallet = UserWallet(user_id=user_id)
        await db.wallets.insert_one(wallet.model_dump())
        wallet = wallet.model_dump()
    
    # Get user for streak info
    user = await db.users.find_one({"id": user_id})
    streak = user.get("streak_count", 0) if user else 0
    
    # Get recent transactions
    transactions = wallet.get("transactions", [])[-10:]
    
    return {
        "balance": wallet.get("balance", 0),
        "total_earned": wallet.get("total_earned", 0),
        "total_redeemed": wallet.get("total_redeemed", 0),
        "streak": streak,
        "recent_transactions": transactions
    }

@api_router.get("/wallet/{user_id}/transactions")
async def get_transactions(user_id: str, limit: int = Query(default=20, le=100)):
    """Get user's transaction history"""
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        return {"transactions": []}
    
    transactions = wallet.get("transactions", [])
    return {"transactions": transactions[-limit:][::-1]}

# ---------- MARKETPLACE ROUTES ----------

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue  # Skip MongoDB ObjectId
        elif hasattr(value, 'isoformat'):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

@api_router.get("/marketplace")
async def get_marketplace_items(category: Optional[str] = None):
    """Get all active marketplace items"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    items = await db.marketplace.find(query).to_list(100)
    
    # If no items exist, seed with default items
    if not items:
        await seed_marketplace()
        items = await db.marketplace.find(query).to_list(100)
    
    return {"items": [serialize_doc(item) for item in items]}

@api_router.post("/marketplace/redeem")
async def redeem_item(redeem_request: RedeemRequest):
    """Redeem tokens for a marketplace item"""
    # Get item
    item = await db.marketplace.find_one({"id": redeem_request.item_id, "is_active": True})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unavailable")
    
    # Check stock
    if item.get("stock", -1) == 0:
        raise HTTPException(status_code=400, detail="Item out of stock")
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": redeem_request.user_id})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Check balance
    token_cost = item.get("token_cost", 0)
    if wallet.get("balance", 0) < token_cost:
        raise HTTPException(status_code=400, detail="Insufficient MICO balance")
    
    # Process redemption
    # 1. Deduct tokens (this simulates "burning" for MVP)
    transaction = TokenTransaction(
        amount=-token_cost,
        type=TransactionType.REDEEMED,
        item_id=redeem_request.item_id,
        description=f"Redeemed: {item['title']}"
    )
    
    await db.wallets.update_one(
        {"user_id": redeem_request.user_id},
        {
            "$inc": {"balance": -token_cost, "total_redeemed": token_cost},
            "$push": {"transactions": transaction.model_dump()}
        }
    )
    
    # 2. Update stock if limited
    if item.get("stock", -1) > 0:
        await db.marketplace.update_one(
            {"id": redeem_request.item_id},
            {"$inc": {"stock": -1}}
        )
    
    # 3. Create redemption record
    redemption = Redemption(
        user_id=redeem_request.user_id,
        item_id=redeem_request.item_id,
        item_title=item["title"],
        tokens_burned=token_cost,
        reward_code=item.get("redemption_value", "REWARD-CODE")
    )
    await db.redemptions.insert_one(redemption.model_dump())
    
    return {
        "success": True,
        "redemption_id": redemption.id,
        "reward_code": redemption.reward_code,
        "tokens_burned": token_cost,
        "message": f"Successfully redeemed {item['title']}!"
    }

@api_router.get("/marketplace/redemptions/{user_id}")
async def get_user_redemptions(user_id: str):
    """Get user's redemption history"""
    redemptions = await db.redemptions.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    return {"redemptions": [serialize_doc(r) for r in redemptions]}

# ---------- PUSH NOTIFICATION ROUTES ----------

class PushTokenRegister(BaseModel):
    user_id: str
    fcm_token: str
    platform: str  # "ios" or "android"

@api_router.post("/register-push-token")
async def register_push_token(token_data: PushTokenRegister):
    """Register a device's FCM token for push notifications"""
    # Check if user exists
    user = await db.users.find_one({"id": token_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Store/update the FCM token
    await db.push_tokens.update_one(
        {"user_id": token_data.user_id},
        {
            "$set": {
                "user_id": token_data.user_id,
                "fcm_token": token_data.fcm_token,
                "platform": token_data.platform,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    logger.info(f"FCM token registered for user {token_data.user_id} on {token_data.platform}")
    return {"success": True, "message": "Push token registered successfully"}

@api_router.get("/push-tokens/{user_id}")
async def get_push_token(user_id: str):
    """Get the FCM token for a user (admin use)"""
    token_doc = await db.push_tokens.find_one({"user_id": user_id})
    if not token_doc:
        raise HTTPException(status_code=404, detail="No push token found for user")
    return serialize_doc(token_doc)

# ---------- STATS ROUTES ----------

@api_router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get user statistics"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    # Count tasks
    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    completed_tasks = await db.tasks.count_documents({"user_id": user_id, "status": TaskStatus.COMPLETED})
    skipped_tasks = await db.tasks.count_documents({"user_id": user_id, "status": TaskStatus.SKIPPED})
    
    # Get redemption count
    redemption_count = await db.redemptions.count_documents({"user_id": user_id})
    
    return {
        "streak": user.get("streak_count", 0),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "skipped_tasks": skipped_tasks,
        "completion_rate": round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0,
        "total_earned": wallet.get("total_earned", 0) if wallet else 0,
        "total_redeemed": wallet.get("total_redeemed", 0) if wallet else 0,
        "redemption_count": redemption_count
    }

# ---------- SEED DATA ----------

async def seed_marketplace():
    """Seed marketplace with initial items"""
    items = [
        MarketplaceItem(
            title="☕ Coffee Gift Card",
            description="$5 Starbucks digital gift card",
            token_cost=500,
            category="food",
            redemption_type="discount_code",
            redemption_value="COFFEE-" + str(uuid.uuid4())[:8].upper(),
            stock=10
        ),
        MarketplaceItem(
            title="📚 E-Book Bundle",
            description="3 best-selling productivity e-books",
            token_cost=300,
            category="digital",
            redemption_type="digital_download",
            redemption_value="https://example.com/ebooks",
            stock=-1
        ),
        MarketplaceItem(
            title="🎧 Meditation App Premium",
            description="1 month premium subscription",
            token_cost=400,
            category="apps",
            redemption_type="discount_code",
            redemption_value="MEDITATE-" + str(uuid.uuid4())[:8].upper(),
            stock=20
        ),
        MarketplaceItem(
            title="🏃 Fitness Class Pass",
            description="Free trial for online fitness classes",
            token_cost=200,
            category="fitness",
            redemption_type="discount_code",
            redemption_value="FITNESS-" + str(uuid.uuid4())[:8].upper(),
            stock=-1
        ),
        MarketplaceItem(
            title="🎨 Digital Art Pack",
            description="Beautiful wallpapers and icons",
            token_cost=100,
            category="digital",
            redemption_type="digital_download",
            redemption_value="https://example.com/artpack",
            stock=-1
        ),
        MarketplaceItem(
            title="💪 Protein Discount",
            description="20% off protein supplements",
            token_cost=250,
            category="fitness",
            redemption_type="affiliate",
            redemption_value="PROTEIN20",
            stock=50
        ),
    ]
    
    for item in items:
        await db.marketplace.insert_one(item.model_dump())
    
    logger.info("Marketplace seeded with initial items")

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
