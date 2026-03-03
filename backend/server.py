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
    # Anti-cheat fields
    trust_score: int = 75  # Default starting score
    verified_task_count: int = 0
    suspicious_flag_count: int = 0
    # Character reference
    character_id: Optional[str] = None
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
    # Anti-cheat fields
    started_at: Optional[datetime] = None
    requires_sensor_validation: bool = False
    requires_verification: bool = False
    verification_type: Optional[str] = None
    verification_data: Optional[Dict[str, Any]] = None
    validation_status: Optional[str] = None  # validated, pending_review, suspicious
    sensor_data: Optional[Dict[str, Any]] = None
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class TaskStart(BaseModel):
    task_id: str

class TaskComplete(BaseModel):
    task_id: str
    verification_response: Optional[Dict[str, Any]] = None
    sensor_data: Optional[Dict[str, Any]] = None
    reflection_text: Optional[str] = None

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
    mode: Optional[str] = "offline"  # "online" for AI, "offline" for library

class GenerateTasksRequest(BaseModel):
    context: Optional[ContextAnswer] = None
    mode: str = "offline"  # "online" for AI, "offline" for library

# ============== AI TASK GENERATION ==============

from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

class TaskGenerationMode(str, Enum):
    ONLINE = "online"   # Use AI for personalized tasks
    OFFLINE = "offline" # Use pre-generated library

async def generate_ai_tasks_with_llm(user: dict, context_answer: Optional[str] = None) -> List[dict]:
    """Generate truly personalized tasks using AI (requires Emergent LLM Key balance)"""
    preferences = user.get('preferences', {})
    goals = preferences.get('goals', ['focus'])
    available_time = preferences.get('available_time', '15min')
    productive_time = preferences.get('productive_time', 'morning')
    
    # Build the prompt
    goals_str = ", ".join(goals) if goals else "general wellness"
    
    # Determine energy from context
    energy_context = ""
    if context_answer:
        energy_context = f"\nThe user's current state: {context_answer}"
    
    prompt = f"""Generate exactly 3 micro-tasks for a user with these preferences:
- Goals: {goals_str}
- Available time: {available_time}
- Most productive time: {productive_time}{energy_context}

Each task should be:
1. Completable in 1-10 minutes
2. Specific and actionable
3. Motivating with a sense of accomplishment
4. Matched to their energy level and goals

Return ONLY a JSON array with exactly 3 tasks in this format:
[
  {{"title": "Task Title", "description": "Brief encouraging description", "time_estimate": "X min", "reward_amount": 10, "goal_category": "category"}}
]

reward_amount should be 3-25 based on effort (quick=3-8, medium=10-15, challenging=20-25).
goal_category must be one of: fitness, focus, business, relationships, spiritual, creativity, health"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"task-gen-{user.get('id', 'unknown')}",
            system_message="You are a supportive life coach AI that creates personalized micro-tasks. Be encouraging and specific. Always respond with valid JSON only."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        # Clean up the response (remove markdown code blocks if present)
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        tasks = json.loads(response_text)
        
        # Validate and normalize tasks
        valid_categories = ["fitness", "focus", "business", "relationships", "spiritual", "creativity", "health"]
        normalized_tasks = []
        for task in tasks[:3]:  # Ensure max 3 tasks
            normalized_task = {
                "title": task.get("title", "Quick Task"),
                "description": task.get("description", "Complete this task"),
                "time_estimate": task.get("time_estimate", "5 min"),
                "reward_amount": min(max(task.get("reward_amount", 10), 3), 25),
                "goal_category": task.get("goal_category", goals[0] if goals else "focus")
            }
            if normalized_task["goal_category"] not in valid_categories:
                normalized_task["goal_category"] = goals[0] if goals else "focus"
            normalized_tasks.append(normalized_task)
        
        logger.info(f"AI generated {len(normalized_tasks)} tasks for user {user.get('id')}")
        return normalized_tasks
        
    except Exception as e:
        logger.error(f"AI task generation failed: {str(e)}")
        # Fall back to library
        return get_tasks_from_library(goals, context_answer, available_time)

async def generate_ai_tasks(user: dict, context_answer: Optional[str] = None, mode: str = "offline") -> List[dict]:
    """
    Hybrid task generation:
    - online: Use AI for personalized tasks (requires Emergent LLM Key balance)
    - offline: Use pre-generated library (FREE - no API cost!)
    """
    preferences = user.get('preferences', {})
    goals = preferences.get('goals', ['focus'])
    available_time = preferences.get('available_time', '15min')
    
    if mode == "online" and EMERGENT_LLM_KEY:
        # Try AI generation
        try:
            return await generate_ai_tasks_with_llm(user, context_answer)
        except Exception as e:
            logger.warning(f"AI generation failed, falling back to library: {e}")
            return get_tasks_from_library(goals, context_answer, available_time)
    else:
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
        # Use the existing UUID 'id' field, not MongoDB's _id
        if '_id' in existing:
            del existing['_id']
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
async def generate_tasks(user_id: str, request: Optional[GenerateTasksRequest] = None):
    """
    Generate micro-tasks for the user.
    
    Mode options:
    - "online": Use AI for personalized tasks (requires Emergent LLM Key balance)
    - "offline": Use pre-generated library (FREE - no API cost!)
    """
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
    
    # Determine mode and context
    mode = "offline"
    context_answer = None
    context_question = None
    
    if request:
        mode = request.mode or "offline"
        if request.context:
            context_answer = request.context.answer
            context_question = request.context.question
            # Override mode from context if provided
            if request.context.mode:
                mode = request.context.mode
    
    # Generate tasks based on mode
    ai_tasks = await generate_ai_tasks(user, context_answer, mode)
    
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
            context_question=context_question,
            context_answer=context_answer
        )
        await db.tasks.insert_one(task.model_dump())
        saved_tasks.append(task)
    
    return {
        "tasks": [t.model_dump() for t in saved_tasks],
        "mode": mode,
        "source": "ai" if mode == "online" else "library"
    }

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
    """Mark a task as completed with anti-cheat validation"""
    task = await db.tasks.find_one({"id": task_complete.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task already processed")
    
    user_id = task["user_id"]
    user = await db.users.find_one({"id": user_id})
    trust_score = user.get("trust_score", 75) if user else 75
    completed_at = datetime.utcnow()
    
    # ===== ANTI-CHEAT VALIDATION =====
    trust_adjustments = []
    validation_status = "validated"
    is_verified = True
    
    # 1. Time-based validation
    started_at = task.get("started_at")
    if started_at:
        if isinstance(started_at, str):
            started_at = datetime.fromisoformat(started_at)
        
        time_validation = validate_completion_time(
            started_at, completed_at, task.get("time_estimate", "5 min")
        )
        
        trust_adjustments.append(time_validation["trust_adjustment"])
        
        if not time_validation["is_valid"]:
            validation_status = "suspicious"
            is_verified = False
        elif time_validation["is_suspicious"]:
            validation_status = "pending_review"
            is_verified = False
    else:
        # Task wasn't properly started - suspicious
        trust_adjustments.append(-3)
        validation_status = "pending_review"
        is_verified = False
    
    # 2. Check for suspicious patterns
    recent_completions = await db.tasks.find({
        "user_id": user_id,
        "status": TaskStatus.COMPLETED,
        "completed_at": {"$gte": completed_at - timedelta(hours=2)}
    }).to_list(20)
    
    pattern_check = detect_suspicious_patterns(user_id, [serialize_doc(t) for t in recent_completions], completed_at)
    if pattern_check["is_suspicious"]:
        trust_adjustments.append(pattern_check["trust_adjustment"])
        validation_status = "suspicious"
        is_verified = False
    
    # 3. Process verification response if provided
    verification_penalty = 0
    if task_complete.verification_response:
        ver_type = task_complete.verification_response.get("type")
        
        if ver_type == "text_reflection" and task_complete.reflection_text:
            reflection_result = validate_reflection(task_complete.reflection_text)
            trust_adjustments.append(reflection_result["trust_adjustment"])
            if reflection_result["is_valid"]:
                is_verified = True
        elif ver_type == "contextual_question":
            # For contextual questions, any answer is accepted (it's about engagement)
            trust_adjustments.append(2)
            is_verified = True
        elif ver_type == "photo_upload":
            # Photo uploaded - trust boost
            trust_adjustments.append(4)
            is_verified = True
    elif task.get("requires_verification"):
        # Verification was required but skipped
        strictness = get_verification_strictness(trust_score)
        if strictness == "mandatory":
            raise HTTPException(status_code=400, detail="Verification required to complete this task")
        elif strictness == "strict":
            verification_penalty = 0.5  # 50% of reward
            trust_adjustments.append(-3)
        elif strictness == "moderate":
            verification_penalty = 0.25  # 25% of reward
            trust_adjustments.append(-2)
        # lenient: just log it
        trust_adjustments.append(-1)
    
    # 4. Process sensor data if provided
    if task_complete.sensor_data:
        # Validate movement data for fitness tasks
        if task.get("goal_category") in ["fitness", "health"]:
            # Sensor data provided - trust boost
            trust_adjustments.append(3)
            is_verified = True
    
    # ===== CALCULATE REWARDS =====
    base_reward = task.get("reward_amount", 10)
    reward_multiplier = get_reward_multiplier(trust_score)
    
    # Apply verification penalty if any
    final_multiplier = reward_multiplier * (1 - verification_penalty)
    reward_amount = int(base_reward * final_multiplier)
    
    # Get settlement delay based on trust
    settlement_delay = get_settlement_delay(trust_score)
    is_pending = settlement_delay > 0 and validation_status != "validated"
    
    # ===== UPDATE TASK STATUS =====
    await db.tasks.update_one(
        {"id": task_complete.task_id},
        {"$set": {
            "status": TaskStatus.COMPLETED,
            "completed_at": completed_at,
            "validation_status": validation_status,
            "verification_data": task_complete.verification_response,
            "sensor_data": task_complete.sensor_data,
        }}
    )
    
    # ===== UPDATE TRUST SCORE =====
    new_trust_score = calculate_new_trust_score(trust_score, trust_adjustments)
    
    user_updates = {
        "trust_score": new_trust_score,
        "updated_at": datetime.utcnow(),
    }
    
    if is_verified:
        user_updates["verified_task_count"] = user.get("verified_task_count", 0) + 1
    
    if validation_status == "suspicious":
        user_updates["suspicious_flag_count"] = user.get("suspicious_flag_count", 0) + 1
    
    # ===== AWARD TOKENS (unless pending) =====
    streak_bonus = 0
    if not is_pending:
        # Update wallet
        transaction = TokenTransaction(
            amount=reward_amount,
            type=TransactionType.EARNED,
            task_id=task_complete.task_id,
            description=f"Completed: {task['title']}" + (f" (x{final_multiplier:.1f})" if final_multiplier != 1.0 else "")
        )
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {"balance": reward_amount, "total_earned": reward_amount},
                "$push": {"transactions": transaction.model_dump()}
            }
        )
        
        # Update streak
        today = completed_at.strftime("%Y-%m-%d")
        last_active = user.get("last_active_date")
        
        if last_active:
            yesterday = (completed_at - timedelta(days=1)).strftime("%Y-%m-%d")
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
                user_updates["streak_count"] = new_streak
                user_updates["last_active_date"] = today
                trust_adjustments.append(1)  # Streak bonus
            elif last_active != today:
                # Streak broken
                user_updates["streak_count"] = 1
                user_updates["last_active_date"] = today
                trust_adjustments.append(-2)  # Streak broken
        else:
            user_updates["streak_count"] = 1
            user_updates["last_active_date"] = today
    else:
        # Create pending transaction
        await db.pending_rewards.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "task_id": task_complete.task_id,
            "amount": reward_amount,
            "settlement_date": completed_at + timedelta(hours=settlement_delay),
            "status": "pending",
            "created_at": completed_at,
        })
    
    # Apply user updates
    await db.users.update_one({"id": user_id}, {"$set": user_updates})
    
    # Update character if exists
    character = await db.characters.find_one({"user_id": user_id})
    if character and is_verified:
        await db.characters.update_one(
            {"user_id": user_id},
            {
                "$inc": {"verified_task_count": 1, "total_tasks_completed": 1},
                "$set": {"last_active_date": completed_at, "updated_at": completed_at}
            }
        )
    
    # Get updated wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    return {
        "success": True,
        "tokens_earned": reward_amount if not is_pending else 0,
        "tokens_pending": reward_amount if is_pending else 0,
        "streak_bonus": streak_bonus,
        "new_balance": wallet.get("balance", 0),
        "trust_score": new_trust_score,
        "trust_change": sum(trust_adjustments),
        "validation_status": validation_status,
        "is_verified": is_verified,
        "reward_multiplier": final_multiplier,
        "message": f"Great job! You earned {reward_amount} MICO!" if not is_pending else f"Task completed! {reward_amount} MICO will be released in {settlement_delay} hours.",
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

import httpx

# Firebase Server Key for sending notifications
FIREBASE_SERVER_KEY = os.environ.get('FIREBASE_SERVER_KEY', '')

class PushTokenRegister(BaseModel):
    user_id: str
    fcm_token: str
    platform: str  # "ios" or "android"

class SendNotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, str]] = None

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

@api_router.post("/send-notification")
async def send_notification(notification: SendNotificationRequest):
    """Send a push notification to a specific user"""
    # Get user's FCM token
    token_doc = await db.push_tokens.find_one({"user_id": notification.user_id})
    if not token_doc:
        raise HTTPException(status_code=404, detail="No push token found for user")
    
    fcm_token = token_doc.get("fcm_token")
    if not fcm_token:
        raise HTTPException(status_code=400, detail="Invalid FCM token")
    
    if not FIREBASE_SERVER_KEY:
        raise HTTPException(status_code=500, detail="Firebase server key not configured")
    
    # Send notification via FCM HTTP v1 API
    fcm_url = "https://fcm.googleapis.com/fcm/send"
    
    payload = {
        "to": fcm_token,
        "notification": {
            "title": notification.title,
            "body": notification.body,
            "sound": "default"
        },
        "data": notification.data or {}
    }
    
    headers = {
        "Authorization": f"key={FIREBASE_SERVER_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(fcm_url, json=payload, headers=headers)
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get("success", 0) > 0:
                logger.info(f"Notification sent to user {notification.user_id}")
                return {"success": True, "message": "Notification sent successfully"}
            else:
                logger.error(f"FCM error: {response_data}")
                return {"success": False, "error": response_data}
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@api_router.post("/send-daily-reminder")
async def send_daily_reminder(user_id: str):
    """Send a daily reminder notification to complete tasks"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    streak = user.get("streak_count", 0)
    
    # Personalize message based on streak
    if streak > 0:
        title = f"🔥 Keep your {streak}-day streak alive!"
        body = "Your micro-wins are waiting. Just 5 minutes to stay on track!"
    else:
        title = "✨ Time for your daily micro-wins!"
        body = "Small actions, big results. Let's make today count!"
    
    notification = SendNotificationRequest(
        user_id=user_id,
        title=title,
        body=body,
        data={"type": "daily_reminder", "streak": str(streak)}
    )
    
    return await send_notification(notification)

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

# Import anti-cheat and character systems
from anti_cheat import (
    get_trust_tier, validate_completion_time, should_trigger_verification,
    generate_verification_request, validate_reflection, detect_suspicious_patterns,
    calculate_new_trust_score, get_reward_multiplier, get_settlement_delay,
    TRUST_SCORE_CONFIG, TrustTier, TaskValidationStatus
)
from character_system import (
    Character, CharacterStats, CharacterItem, ItemPurchase, UserInventory,
    EvolutionTier, CharacterMood, ItemRarity, ItemCategory,
    get_evolution_tier, can_evolve, calculate_mood, calculate_energy,
    calculate_momentum, calculate_integrity, apply_deterioration,
    can_purchase_item, get_pixel_settings, calculate_evolution_progress,
    DEFAULT_ITEMS, EVOLUTION_CONFIG, MOOD_CONFIG, ITEM_RARITY_CONFIG
)

# ---------- ANTI-CHEAT ROUTES ----------

@api_router.post("/tasks/start")
async def start_task(task_start: TaskStart):
    """Mark a task as started - required for time-based validation"""
    task = await db.tasks.find_one({"id": task_start.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task already processed")
    
    # Record start time
    await db.tasks.update_one(
        {"id": task_start.task_id},
        {"$set": {"started_at": datetime.utcnow()}}
    )
    
    # Get user for trust score
    user = await db.users.find_one({"id": task["user_id"]})
    trust_score = user.get("trust_score", 75) if user else 75
    
    # Check if verification will be required
    verification = generate_verification_request(task, trust_score)
    
    return {
        "success": True,
        "started_at": datetime.utcnow().isoformat(),
        "verification_required": verification is not None,
        "verification": verification,
        "min_completion_time": get_min_completion_time_for_task(task.get("time_estimate", "5 min")),
    }

def get_min_completion_time_for_task(time_estimate: str) -> int:
    """Get minimum completion time in seconds"""
    from anti_cheat import TIME_VALIDATION_CONFIG
    return TIME_VALIDATION_CONFIG["min_time_ratios"].get(time_estimate, 30)

@api_router.get("/trust-score/{user_id}")
async def get_trust_score(user_id: str):
    """Get user's trust score and tier information"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    trust_score = user.get("trust_score", 75)
    tier = get_trust_tier(trust_score)
    
    return {
        "trust_score": trust_score,
        "tier": tier.value,
        "tier_config": {
            "reward_multiplier": TRUST_SCORE_CONFIG["reward_multipliers"][tier],
            "verification_probability": TRUST_SCORE_CONFIG["verification_probability"][tier],
            "verification_strictness": TRUST_SCORE_CONFIG["verification_strictness"][tier],
            "settlement_delay_hours": TRUST_SCORE_CONFIG["settlement_delay"][tier],
        },
        "verified_task_count": user.get("verified_task_count", 0),
        "suspicious_flag_count": user.get("suspicious_flag_count", 0),
    }

@api_router.get("/verification/{task_id}")
async def get_task_verification(task_id: str):
    """Get verification requirements for a specific task"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user = await db.users.find_one({"id": task["user_id"]})
    trust_score = user.get("trust_score", 75) if user else 75
    
    verification = generate_verification_request(task, trust_score)
    
    return {
        "task_id": task_id,
        "verification": verification,
        "trust_tier": get_trust_tier(trust_score).value,
    }

# ---------- CHARACTER ROUTES ----------

class CreateCharacterRequest(BaseModel):
    user_id: str
    name: str = "Micro"
    avatar_pixel_data: Optional[Dict[str, Any]] = None

class UpdateAvatarRequest(BaseModel):
    avatar_pixel_data: Dict[str, Any]
    avatar_original_url: Optional[str] = None

class EquipItemRequest(BaseModel):
    item_id: str

class PurchaseItemRequest(BaseModel):
    item_id: str

@api_router.post("/character/create")
async def create_character(request: CreateCharacterRequest):
    """Create a new character for a user"""
    user = await db.users.find_one({"id": request.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has a character
    existing = await db.characters.find_one({"user_id": request.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already has a character")
    
    # Create character
    character = Character(
        user_id=request.user_id,
        name=request.name,
        avatar_pixel_data=request.avatar_pixel_data,
        avatar_created_at=datetime.utcnow() if request.avatar_pixel_data else None,
    )
    
    await db.characters.insert_one(character.model_dump())
    
    # Update user with character reference
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"character_id": character.id}}
    )
    
    # Create inventory for user
    inventory = UserInventory(user_id=request.user_id)
    await db.inventories.insert_one(inventory.model_dump())
    
    return serialize_doc(character.model_dump())

@api_router.get("/character/{user_id}")
async def get_character(user_id: str):
    """Get user's character with all stats"""
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    user = await db.users.find_one({"id": user_id})
    
    # Calculate current stats
    trust_score = user.get("trust_score", 75) if user else 75
    streak_count = user.get("streak_count", 0) if user else 0
    
    # Get today's task completion
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    })
    today_completed = await db.tasks.count_documents({
        "user_id": user_id,
        "status": TaskStatus.COMPLETED,
        "completed_at": {"$gte": today_start}
    })
    
    # Calculate days inactive
    last_active = character.get("last_active_date")
    if last_active:
        if isinstance(last_active, str):
            last_active = datetime.fromisoformat(last_active)
        days_inactive = (datetime.utcnow() - last_active).days
    else:
        days_inactive = 0
    
    # Update stats
    energy = calculate_energy(today_completed, max(today_tasks, 1))
    momentum = calculate_momentum(streak_count, character.get("highest_streak", 0))
    integrity = calculate_integrity(trust_score)
    mood = calculate_mood(days_inactive, energy, trust_score)
    
    evolution_tier = get_evolution_tier(character.get("verified_task_count", 0))
    evolution_progress = calculate_evolution_progress(
        character.get("verified_task_count", 0),
        evolution_tier
    )
    
    # Get pixel settings based on evolution
    pixel_settings = get_pixel_settings(evolution_tier)
    
    # Check evolution eligibility
    temp_char = Character(**character)
    evolution_check = can_evolve(temp_char, trust_score, streak_count)
    
    # Apply deterioration if inactive
    deterioration = apply_deterioration(temp_char, days_inactive)
    
    return {
        "character": serialize_doc(character),
        "stats": {
            "energy": energy,
            "momentum": momentum,
            "integrity": integrity,
            "evolution_progress": evolution_progress,
        },
        "mood": mood.value,
        "mood_config": MOOD_CONFIG.get(mood, {}),
        "evolution": {
            "current_tier": evolution_tier.value,
            "tier_config": EVOLUTION_CONFIG[evolution_tier],
            "can_evolve": evolution_check,
            "pixel_settings": pixel_settings,
        },
        "deterioration": deterioration if deterioration["mood_changed"] or deterioration["tier_regressed"] else None,
        "days_inactive": days_inactive,
    }

@api_router.put("/character/{user_id}/avatar")
async def update_avatar(user_id: str, request: UpdateAvatarRequest):
    """Update character's pixelated avatar from camera capture"""
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    await db.characters.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "avatar_pixel_data": request.avatar_pixel_data,
                "avatar_original_url": request.avatar_original_url,
                "avatar_created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        }
    )
    
    return {"success": True, "message": "Avatar updated successfully"}

@api_router.get("/character/{user_id}/evolution")
async def get_evolution_status(user_id: str):
    """Get detailed evolution status and requirements"""
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    user = await db.users.find_one({"id": user_id})
    trust_score = user.get("trust_score", 75) if user else 75
    streak_count = user.get("streak_count", 0) if user else 0
    
    verified_count = character.get("verified_task_count", 0)
    current_tier = get_evolution_tier(verified_count)
    
    temp_char = Character(**character)
    evolution_check = can_evolve(temp_char, trust_score, streak_count)
    
    # Get all tiers with requirements
    all_tiers = []
    for tier in EvolutionTier:
        config = EVOLUTION_CONFIG[tier]
        all_tiers.append({
            "tier": tier.value,
            "display_name": config["display_name"],
            "description": config["description"],
            "requirements": {
                "min_tasks": config["min_tasks"],
                "trust_requirement": config["trust_requirement"],
                "streak_requirement": config["streak_requirement"],
            },
            "is_current": tier == current_tier,
            "is_unlocked": verified_count >= config["min_tasks"],
        })
    
    return {
        "current_tier": current_tier.value,
        "verified_task_count": verified_count,
        "evolution_check": evolution_check,
        "all_tiers": all_tiers,
    }

# ---------- CHARACTER ITEM STORE ROUTES ----------

@api_router.get("/character-store")
async def get_character_store(user_id: Optional[str] = None, category: Optional[str] = None, rarity: Optional[str] = None):
    """Get available character items with eligibility check"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    if rarity:
        query["rarity"] = rarity
    
    items = await db.character_items.find(query).to_list(100)
    
    # Seed default items if empty
    if not items:
        for item in DEFAULT_ITEMS:
            await db.character_items.insert_one(item.model_dump())
        items = await db.character_items.find(query).to_list(100)
    
    # If user provided, check eligibility for each item
    user_data = None
    if user_id:
        user = await db.users.find_one({"id": user_id})
        character = await db.characters.find_one({"user_id": user_id})
        inventory = await db.inventories.find_one({"user_id": user_id})
        wallet = await db.wallets.find_one({"user_id": user_id})
        
        if user and character:
            user_data = {
                "trust_score": user.get("trust_score", 75),
                "streak_count": user.get("streak_count", 0),
                "verified_task_count": character.get("verified_task_count", 0),
                "wallet_balance": wallet.get("balance", 0) if wallet else 0,
                "owned_items": inventory.get("items", []) if inventory else [],
            }
    
    result_items = []
    for item in items:
        item_data = serialize_doc(item)
        
        if user_data:
            # Check if already owned
            item_data["owned"] = item["id"] in user_data["owned_items"]
            
            # Check eligibility
            if not item_data["owned"]:
                rarity_config = ITEM_RARITY_CONFIG.get(ItemRarity(item["rarity"]), {})
                item_data["eligible"] = (
                    user_data["trust_score"] >= item.get("trust_requirement", 0) and
                    user_data["streak_count"] >= item.get("streak_requirement", 0) and
                    user_data["verified_task_count"] >= item.get("verified_requirement", 0)
                )
                item_data["can_afford"] = user_data["wallet_balance"] >= item.get("base_price", 0)
        
        result_items.append(item_data)
    
    return {"items": result_items}

@api_router.post("/character/{user_id}/purchase")
async def purchase_character_item(user_id: str, request: PurchaseItemRequest):
    """Purchase a character item"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    item = await db.character_items.find_one({"id": request.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    wallet = await db.wallets.find_one({"user_id": user_id})
    inventory = await db.inventories.find_one({"user_id": user_id})
    
    # Check if already owned
    owned_items = inventory.get("items", []) if inventory else []
    if request.item_id in owned_items:
        raise HTTPException(status_code=400, detail="Item already owned")
    
    # Get last purchase for cooldown check
    last_purchase = await db.item_purchases.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    last_purchase_time = last_purchase.get("created_at") if last_purchase else None
    
    # Check purchase eligibility
    item_obj = CharacterItem(**item)
    eligibility = can_purchase_item(
        user_id=user_id,
        item=item_obj,
        trust_score=user.get("trust_score", 75),
        streak_count=user.get("streak_count", 0),
        verified_task_count=character.get("verified_task_count", 0),
        wallet_balance=wallet.get("balance", 0) if wallet else 0,
        last_purchase_time=last_purchase_time,
        inventory_count_for_category=inventory.get("items_by_category", {}).get(item["category"], 0) if inventory else 0,
    )
    
    if not eligibility["can_purchase"]:
        raise HTTPException(status_code=400, detail=f"Cannot purchase: {', '.join(eligibility['blockers'])}")
    
    # Process purchase
    trust_tier = get_trust_tier(user.get("trust_score", 75))
    settlement_delay = get_settlement_delay(user.get("trust_score", 75))
    
    # Deduct tokens
    token_cost = item["base_price"]
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {"balance": -token_cost, "total_redeemed": token_cost},
            "$push": {"transactions": {
                "id": str(uuid.uuid4()),
                "amount": -token_cost,
                "type": "redeemed",
                "item_id": request.item_id,
                "description": f"Purchased: {item['name']}",
                "timestamp": datetime.utcnow(),
            }}
        }
    )
    
    # Create purchase record
    purchase = ItemPurchase(
        user_id=user_id,
        character_id=character["id"],
        item_id=request.item_id,
        item_name=item["name"],
        rarity=item["rarity"],
        tokens_spent=token_cost,
        status="pending" if settlement_delay > 0 else "completed",
        settlement_date=datetime.utcnow() + timedelta(hours=settlement_delay) if settlement_delay > 0 else datetime.utcnow(),
    )
    await db.item_purchases.insert_one(purchase.model_dump())
    
    # Add to inventory (or mark as pending)
    if settlement_delay == 0:
        await db.inventories.update_one(
            {"user_id": user_id},
            {
                "$push": {"items": request.item_id},
                "$inc": {f"items_by_category.{item['category']}": 1},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
    
    # Update item stock if limited
    if item.get("stock", -1) > 0:
        await db.character_items.update_one(
            {"id": request.item_id},
            {"$inc": {"stock": -1}}
        )
    
    return {
        "success": True,
        "purchase_id": purchase.id,
        "item_name": item["name"],
        "tokens_spent": token_cost,
        "status": purchase.status,
        "settlement_date": purchase.settlement_date.isoformat() if purchase.settlement_date else None,
        "cooldown_expires": purchase.cooldown_expires_at.isoformat(),
    }

@api_router.get("/character/{user_id}/inventory")
async def get_inventory(user_id: str):
    """Get user's character item inventory"""
    inventory = await db.inventories.find_one({"user_id": user_id})
    if not inventory:
        return {"items": [], "items_by_category": {}}
    
    # Get full item details for owned items
    owned_items = []
    for item_id in inventory.get("items", []):
        item = await db.character_items.find_one({"id": item_id})
        if item:
            owned_items.append(serialize_doc(item))
    
    return {
        "items": owned_items,
        "items_by_category": inventory.get("items_by_category", {}),
    }

@api_router.post("/character/{user_id}/equip")
async def equip_item(user_id: str, request: EquipItemRequest):
    """Equip an item to the character"""
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    inventory = await db.inventories.find_one({"user_id": user_id})
    if not inventory or request.item_id not in inventory.get("items", []):
        raise HTTPException(status_code=400, detail="Item not in inventory")
    
    item = await db.character_items.find_one({"id": request.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Equip item in its category slot
    category = item["category"]
    equipped_items = character.get("equipped_items", {})
    equipped_items[category] = request.item_id
    
    await db.characters.update_one(
        {"user_id": user_id},
        {"$set": {"equipped_items": equipped_items, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "equipped": {category: request.item_id}}

@api_router.post("/character/{user_id}/unequip")
async def unequip_item(user_id: str, category: str):
    """Unequip an item from a category slot"""
    character = await db.characters.find_one({"user_id": user_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    equipped_items = character.get("equipped_items", {})
    if category in equipped_items:
        del equipped_items[category]
        
        await db.characters.update_one(
            {"user_id": user_id},
            {"$set": {"equipped_items": equipped_items, "updated_at": datetime.utcnow()}}
        )
    
    return {"success": True, "unequipped_category": category}

# ============== COMMUNITY SYSTEM ==============

from community_system import (
    UserProfile, FollowRelation, Group, GroupMember,
    CommunityChallenge, ChallengeParticipant, ActivityFeedItem,
    CreateProfileRequest, UpdateProfileRequest, CreateGroupRequest,
    CreateChallengeRequest, VoteChallengeRequest,
    ProfileVisibility, ChallengeStatus, ChallengeType,
    ACHIEVEMENTS, check_achievements, create_activity_item
)

# ---------- PROFILES ----------

@api_router.post("/community/profile")
async def create_profile(user_id: str, request: CreateProfileRequest):
    """Create a public profile for a user"""
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username is taken
    existing = await db.profiles.find_one({"username": request.username.lower()})
    if existing and existing.get("user_id") != user_id:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check if profile already exists
    profile = await db.profiles.find_one({"user_id": user_id})
    if profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    # Get user stats
    character = await db.characters.find_one({"user_id": user_id})
    trust_data = await db.user_trust.find_one({"user_id": user_id})
    inventory_count = await db.character_inventory.count_documents({"user_id": user_id})
    
    new_profile = UserProfile(
        user_id=user_id,
        username=request.username.lower(),
        display_name=request.display_name or request.username,
        bio=request.bio,
        visibility=request.visibility,
        total_tasks_completed=user.get("completed_tasks", 0),
        current_streak=user.get("streak", 0),
        longest_streak=user.get("longest_streak", 0),
        trust_score=trust_data.get("trust_score", 75) if trust_data else 75,
        evolution_tier=character.get("evolution_level", "seedling") if character else "seedling",
        equipped_items_count=len(character.get("equipped_items", {})) if character else 0,
    )
    
    # Check achievements
    achievement_data = {
        "total_tasks_completed": new_profile.total_tasks_completed,
        "current_streak": new_profile.current_streak,
        "trust_score": new_profile.trust_score,
        "evolution_tier": new_profile.evolution_tier,
        "items_owned": inventory_count,
    }
    new_profile.achievements = check_achievements(achievement_data)
    
    await db.profiles.insert_one(new_profile.model_dump())
    
    return {**new_profile.model_dump(), "_id": None}


@api_router.get("/community/profile/{user_id}")
async def get_profile(user_id: str, requester_id: Optional[str] = None):
    """Get a user's profile"""
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check privacy
    if profile.get("visibility") == "private" and requester_id != user_id:
        # Return limited info for private profiles
        return {
            "username": profile.get("username"),
            "display_name": profile.get("display_name"),
            "visibility": "private",
            "evolution_tier": profile.get("evolution_tier"),
        }
    
    # Check if requester follows this user
    is_following = False
    if requester_id and requester_id != user_id:
        follow = await db.follows.find_one({
            "follower_id": requester_id,
            "following_id": user_id
        })
        is_following = bool(follow)
    
    return {**profile, "is_following": is_following}


@api_router.put("/community/profile/{user_id}")
async def update_profile(user_id: str, request: UpdateProfileRequest):
    """Update a user's profile"""
    profile = await db.profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    updates = {}
    if request.username:
        # Check if username is taken
        existing = await db.profiles.find_one({"username": request.username.lower()})
        if existing and existing.get("user_id") != user_id:
            raise HTTPException(status_code=400, detail="Username already taken")
        updates["username"] = request.username.lower()
    
    if request.display_name is not None:
        updates["display_name"] = request.display_name
    if request.bio is not None:
        updates["bio"] = request.bio
    if request.visibility is not None:
        updates["visibility"] = request.visibility
    
    updates["updated_at"] = datetime.utcnow()
    
    await db.profiles.update_one({"user_id": user_id}, {"$set": updates})
    
    updated = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    return updated


@api_router.get("/community/profile/username/{username}")
async def get_profile_by_username(username: str, requester_id: Optional[str] = None):
    """Get a profile by username"""
    profile = await db.profiles.find_one({"username": username.lower()}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return await get_profile(profile["user_id"], requester_id)


# ---------- FOLLOW SYSTEM ----------

@api_router.post("/community/follow/{target_user_id}")
async def follow_user(target_user_id: str, follower_id: str):
    """Follow a user"""
    if follower_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if target has a profile
    target_profile = await db.profiles.find_one({"user_id": target_user_id})
    if not target_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": follower_id,
        "following_id": target_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    follow = FollowRelation(
        follower_id=follower_id,
        following_id=target_user_id
    )
    
    await db.follows.insert_one(follow.model_dump())
    
    # Update counts
    await db.profiles.update_one(
        {"user_id": target_user_id},
        {"$inc": {"followers_count": 1}}
    )
    await db.profiles.update_one(
        {"user_id": follower_id},
        {"$inc": {"following_count": 1}}
    )
    
    return {"success": True, "message": f"Now following {target_profile.get('username')}"}


@api_router.delete("/community/follow/{target_user_id}")
async def unfollow_user(target_user_id: str, follower_id: str):
    """Unfollow a user"""
    result = await db.follows.delete_one({
        "follower_id": follower_id,
        "following_id": target_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not following this user")
    
    # Update counts
    await db.profiles.update_one(
        {"user_id": target_user_id},
        {"$inc": {"followers_count": -1}}
    )
    await db.profiles.update_one(
        {"user_id": follower_id},
        {"$inc": {"following_count": -1}}
    )
    
    return {"success": True, "message": "Unfollowed user"}


@api_router.get("/community/followers/{user_id}")
async def get_followers(user_id: str, limit: int = 50, offset: int = 0):
    """Get a user's followers"""
    follows = await db.follows.find(
        {"following_id": user_id}
    ).skip(offset).limit(limit).to_list(limit)
    
    follower_ids = [f["follower_id"] for f in follows]
    
    # Get profiles
    profiles = await db.profiles.find(
        {"user_id": {"$in": follower_ids}},
        {"_id": 0, "username": 1, "display_name": 1, "user_id": 1, "evolution_tier": 1}
    ).to_list(limit)
    
    return {"followers": profiles, "count": len(profiles)}


@api_router.get("/community/following/{user_id}")
async def get_following(user_id: str, limit: int = 50, offset: int = 0):
    """Get users that a user follows"""
    follows = await db.follows.find(
        {"follower_id": user_id}
    ).skip(offset).limit(limit).to_list(limit)
    
    following_ids = [f["following_id"] for f in follows]
    
    # Get profiles
    profiles = await db.profiles.find(
        {"user_id": {"$in": following_ids}},
        {"_id": 0, "username": 1, "display_name": 1, "user_id": 1, "evolution_tier": 1}
    ).to_list(limit)
    
    return {"following": profiles, "count": len(profiles)}


# ---------- GROUPS ----------

@api_router.post("/community/groups")
async def create_group(creator_id: str, request: CreateGroupRequest):
    """Create a new open group"""
    # Check if user has profile
    profile = await db.profiles.find_one({"user_id": creator_id})
    if not profile:
        raise HTTPException(status_code=400, detail="Must create a profile first")
    
    group = Group(
        name=request.name,
        description=request.description,
        creator_id=creator_id,
        member_count=1
    )
    
    await db.groups.insert_one(group.model_dump())
    
    # Add creator as admin member
    member = GroupMember(
        group_id=group.id,
        user_id=creator_id,
        role="admin"
    )
    await db.group_members.insert_one(member.model_dump())
    
    # Update profile
    await db.profiles.update_one(
        {"user_id": creator_id},
        {"$inc": {"groups_count": 1}}
    )
    
    return {**group.model_dump(), "_id": None}


@api_router.get("/community/groups")
async def list_groups(limit: int = 20, offset: int = 0, search: Optional[str] = None):
    """List all open groups"""
    query = {"is_open": True}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    groups = await db.groups.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
    total = await db.groups.count_documents(query)
    
    return {"groups": groups, "total": total}


@api_router.get("/community/groups/{group_id}")
async def get_group(group_id: str, user_id: Optional[str] = None):
    """Get group details"""
    group = await db.groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member
    is_member = False
    if user_id:
        member = await db.group_members.find_one({
            "group_id": group_id,
            "user_id": user_id
        })
        is_member = bool(member)
    
    return {**group, "is_member": is_member}


@api_router.post("/community/groups/{group_id}/join")
async def join_group(group_id: str, user_id: str):
    """Join an open group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not group.get("is_open"):
        raise HTTPException(status_code=403, detail="Group is not open")
    
    # Check if already member
    existing = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    member = GroupMember(
        group_id=group_id,
        user_id=user_id
    )
    await db.group_members.insert_one(member.model_dump())
    
    # Update counts
    await db.groups.update_one(
        {"id": group_id},
        {"$inc": {"member_count": 1}}
    )
    await db.profiles.update_one(
        {"user_id": user_id},
        {"$inc": {"groups_count": 1}}
    )
    
    return {"success": True, "message": f"Joined group {group.get('name')}"}


@api_router.post("/community/groups/{group_id}/leave")
async def leave_group(group_id: str, user_id: str):
    """Leave a group"""
    member = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": user_id
    })
    if not member:
        raise HTTPException(status_code=400, detail="Not a member of this group")
    
    if member.get("role") == "admin":
        # Check if there are other admins
        admin_count = await db.group_members.count_documents({
            "group_id": group_id,
            "role": "admin"
        })
        if admin_count == 1:
            raise HTTPException(status_code=400, detail="Cannot leave: you are the only admin")
    
    await db.group_members.delete_one({"id": member.get("id")})
    
    # Update counts
    await db.groups.update_one(
        {"id": group_id},
        {"$inc": {"member_count": -1}}
    )
    await db.profiles.update_one(
        {"user_id": user_id},
        {"$inc": {"groups_count": -1}}
    )
    
    return {"success": True, "message": "Left the group"}


@api_router.get("/community/groups/{group_id}/members")
async def get_group_members(group_id: str, limit: int = 50, offset: int = 0):
    """Get group members"""
    members = await db.group_members.find(
        {"group_id": group_id}
    ).skip(offset).limit(limit).to_list(limit)
    
    user_ids = [m["user_id"] for m in members]
    profiles = await db.profiles.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "username": 1, "display_name": 1, "user_id": 1, "evolution_tier": 1}
    ).to_list(limit)
    
    # Merge member info with profiles
    profile_map = {p["user_id"]: p for p in profiles}
    result = []
    for m in members:
        profile = profile_map.get(m["user_id"], {})
        result.append({
            **profile,
            "role": m.get("role", "member"),
            "tasks_contributed": m.get("tasks_contributed", 0),
            "joined_at": m.get("joined_at")
        })
    
    return {"members": result, "count": len(result)}


# ---------- CHALLENGES ----------

@api_router.post("/community/groups/{group_id}/challenges")
async def create_challenge(group_id: str, creator_id: str, request: CreateChallengeRequest):
    """Create a new challenge (requires voting)"""
    # Check if member
    member = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": creator_id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    
    voting_ends = datetime.utcnow() + timedelta(hours=request.voting_hours)
    
    challenge = CommunityChallenge(
        group_id=group_id,
        creator_id=creator_id,
        title=request.title,
        description=request.description,
        challenge_type=request.challenge_type,
        target_value=request.target_value,
        category=request.category,
        duration_days=request.duration_days,
        voting_ends_at=voting_ends,
        votes_for=1,  # Creator automatically votes for
        voters=[creator_id]
    )
    
    await db.challenges.insert_one(challenge.model_dump())
    
    return {**challenge.model_dump(), "_id": None}


@api_router.post("/community/challenges/{challenge_id}/vote")
async def vote_on_challenge(challenge_id: str, user_id: str, request: VoteChallengeRequest):
    """Vote on a proposed challenge"""
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge.get("status") != "proposed":
        raise HTTPException(status_code=400, detail="Voting period has ended")
    
    if datetime.utcnow() > challenge.get("voting_ends_at"):
        raise HTTPException(status_code=400, detail="Voting period has ended")
    
    # Check if member of group
    member = await db.group_members.find_one({
        "group_id": challenge.get("group_id"),
        "user_id": user_id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    
    # Check if already voted
    if user_id in challenge.get("voters", []):
        raise HTTPException(status_code=400, detail="Already voted")
    
    # Add vote
    update = {
        "$push": {"voters": user_id},
        "$inc": {"votes_for" if request.vote else "votes_against": 1}
    }
    
    await db.challenges.update_one({"id": challenge_id}, update)
    
    # Check if enough votes to start
    updated = await db.challenges.find_one({"id": challenge_id})
    votes_for = updated.get("votes_for", 0)
    votes_against = updated.get("votes_against", 0)
    votes_needed = updated.get("votes_needed", 5)
    
    if votes_for >= votes_needed and votes_for > votes_against:
        # Start the challenge
        starts_at = datetime.utcnow()
        ends_at = starts_at + timedelta(days=updated.get("duration_days", 7))
        
        await db.challenges.update_one(
            {"id": challenge_id},
            {"$set": {
                "status": "active",
                "starts_at": starts_at,
                "ends_at": ends_at
            }}
        )
        
        # Update group
        await db.groups.update_one(
            {"id": challenge.get("group_id")},
            {"$inc": {"active_challenges": 1}}
        )
    
    return {
        "success": True,
        "votes_for": votes_for + (1 if request.vote else 0),
        "votes_against": votes_against + (0 if request.vote else 1),
        "status": "active" if votes_for >= votes_needed else "proposed"
    }


@api_router.get("/community/groups/{group_id}/challenges")
async def get_group_challenges(group_id: str, status: Optional[str] = None):
    """Get challenges for a group"""
    query = {"group_id": group_id}
    if status:
        query["status"] = status
    
    challenges = await db.challenges.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"challenges": challenges}


@api_router.post("/community/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: str, user_id: str):
    """Join an active challenge"""
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge.get("status") != "active":
        raise HTTPException(status_code=400, detail="Challenge is not active")
    
    # Check if member of group
    member = await db.group_members.find_one({
        "group_id": challenge.get("group_id"),
        "user_id": user_id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    
    # Check if already joined
    if user_id in challenge.get("participants", []):
        raise HTTPException(status_code=400, detail="Already participating")
    
    # Add participant
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$push": {"participants": user_id}}
    )
    
    participant = ChallengeParticipant(
        challenge_id=challenge_id,
        user_id=user_id
    )
    await db.challenge_participants.insert_one(participant.model_dump())
    
    return {"success": True, "message": "Joined challenge"}


# ---------- LEADERBOARD & ACTIVITY ----------

@api_router.get("/community/leaderboard")
async def get_leaderboard(category: str = "tasks", limit: int = 50):
    """Get global leaderboard"""
    sort_field = {
        "tasks": "total_tasks_completed",
        "streak": "current_streak",
        "trust": "trust_score",
        "items": "equipped_items_count"
    }.get(category, "total_tasks_completed")
    
    profiles = await db.profiles.find(
        {"visibility": "public"},
        {"_id": 0, "username": 1, "display_name": 1, "user_id": 1, 
         "evolution_tier": 1, sort_field: 1, "achievements": 1}
    ).sort(sort_field, -1).limit(limit).to_list(limit)
    
    # Add rank
    for i, p in enumerate(profiles):
        p["rank"] = i + 1
    
    return {"leaderboard": profiles, "category": category}


@api_router.get("/community/activity")
async def get_activity_feed(limit: int = 50, offset: int = 0, user_id: Optional[str] = None):
    """Get global activity feed"""
    query = {}
    
    # If user_id provided, get activities from followed users
    if user_id:
        follows = await db.follows.find({"follower_id": user_id}).to_list(1000)
        following_ids = [f["following_id"] for f in follows]
        following_ids.append(user_id)  # Include own activities
        query["user_id"] = {"$in": following_ids}
    
    activities = await db.activities.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).skip(offset).limit(limit).to_list(limit)
    
    return {"activities": activities}


@api_router.post("/community/activity")
async def post_activity(user_id: str, activity_type: str, title: str, description: Optional[str] = None, metadata: Optional[Dict] = None):
    """Post an activity to the feed (internal use)"""
    profile = await db.profiles.find_one({"user_id": user_id})
    if not profile or profile.get("visibility") != "public":
        return {"success": False, "message": "Profile not public"}
    
    activity = ActivityFeedItem(
        user_id=user_id,
        username=profile.get("username", "unknown"),
        activity_type=activity_type,
        title=title,
        description=description,
        metadata=metadata or {}
    )
    
    await db.activities.insert_one(activity.model_dump())
    
    return {"success": True}


# ---------- GROUP CHAT & MESSAGES ----------

from community_system import GroupMessage, SendMessageRequest, UserReport, UserBlock, ReportUserRequest, ReportReason, ReportStatus

@api_router.post("/community/groups/{group_id}/messages")
async def send_group_message(group_id: str, user_id: str, request: SendMessageRequest):
    """Send a message to a group (public chat)"""
    # Check if member
    member = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": user_id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member")
    
    # Get user profile for username
    profile = await db.profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=400, detail="Must have a profile to send messages")
    
    # Only admins can send announcements
    if request.message_type == "announcement" and member.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can send announcements")
    
    message = GroupMessage(
        group_id=group_id,
        user_id=user_id,
        username=profile.get("username"),
        message_type=request.message_type,
        content=request.content
    )
    
    await db.group_messages.insert_one(message.model_dump())
    
    return {**message.model_dump(), "_id": None}


@api_router.get("/community/groups/{group_id}/messages")
async def get_group_messages(group_id: str, limit: int = 50, offset: int = 0, user_id: Optional[str] = None):
    """Get messages from a group (public)"""
    # Check if member (optional - messages are public but we track who's viewing)
    
    # Get blocked users if user_id provided
    blocked_ids = []
    if user_id:
        blocks = await db.user_blocks.find({"blocker_id": user_id}).to_list(1000)
        blocked_ids = [b["blocked_id"] for b in blocks]
    
    query = {"group_id": group_id}
    if blocked_ids:
        query["user_id"] = {"$nin": blocked_ids}
    
    messages = await db.group_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Reverse to show oldest first
    messages.reverse()
    
    return {"messages": messages, "count": len(messages)}


@api_router.post("/community/groups/{group_id}/messages/{message_id}/pin")
async def pin_message(group_id: str, message_id: str, user_id: str):
    """Pin a message (admin only)"""
    member = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": user_id,
        "role": "admin"
    })
    if not member:
        raise HTTPException(status_code=403, detail="Only admins can pin messages")
    
    result = await db.group_messages.update_one(
        {"id": message_id, "group_id": group_id},
        {"$set": {"is_pinned": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"success": True}


@api_router.get("/community/groups/{group_id}/messages/pinned")
async def get_pinned_messages(group_id: str):
    """Get pinned messages for a group"""
    messages = await db.group_messages.find(
        {"group_id": group_id, "is_pinned": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    return {"pinned_messages": messages}


# ---------- CHALLENGE PROGRESS TRACKING ----------

@api_router.post("/community/challenges/{challenge_id}/progress")
async def update_challenge_progress(challenge_id: str, user_id: str, increment: int = 1):
    """Update a participant's progress in a challenge (called when tasks are completed)"""
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge.get("status") != "active":
        raise HTTPException(status_code=400, detail="Challenge is not active")
    
    # Check if participant
    participant = await db.challenge_participants.find_one({
        "challenge_id": challenge_id,
        "user_id": user_id
    })
    if not participant:
        raise HTTPException(status_code=400, detail="Not a participant in this challenge")
    
    # Update participant progress
    new_progress = participant.get("progress", 0) + increment
    completed = new_progress >= challenge.get("target_value", 0)
    
    await db.challenge_participants.update_one(
        {"id": participant.get("id")},
        {"$set": {"progress": new_progress, "completed": completed}}
    )
    
    # Update total challenge progress
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$inc": {"current_progress": increment}}
    )
    
    # If completed, award bonus tokens
    reward_given = 0
    if completed and not participant.get("completed"):
        reward_amount = challenge.get("reward_per_participant", 50)
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$inc": {"balance": reward_amount}}
        )
        reward_given = reward_amount
    
    return {
        "success": True,
        "new_progress": new_progress,
        "target": challenge.get("target_value"),
        "completed": completed,
        "reward_given": reward_given
    }


@api_router.get("/community/challenges/{challenge_id}/progress")
async def get_challenge_progress(challenge_id: str):
    """Get real-time progress for a challenge"""
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Get all participants with progress
    participants = await db.challenge_participants.find(
        {"challenge_id": challenge_id}
    ).to_list(1000)
    
    # Get profiles for usernames
    user_ids = [p["user_id"] for p in participants]
    profiles = await db.profiles.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1}
    ).to_list(1000)
    profile_map = {p["user_id"]: p["username"] for p in profiles}
    
    participant_progress = []
    for p in participants:
        participant_progress.append({
            "user_id": p["user_id"],
            "username": profile_map.get(p["user_id"], "unknown"),
            "progress": p.get("progress", 0),
            "completed": p.get("completed", False)
        })
    
    # Sort by progress descending
    participant_progress.sort(key=lambda x: x["progress"], reverse=True)
    
    return {
        "challenge_id": challenge_id,
        "title": challenge.get("title"),
        "status": challenge.get("status"),
        "target_value": challenge.get("target_value"),
        "current_progress": challenge.get("current_progress", 0),
        "participant_count": len(participants),
        "completed_count": sum(1 for p in participants if p.get("completed")),
        "participants": participant_progress,
        "ends_at": challenge.get("ends_at"),
        "reward_per_participant": challenge.get("reward_per_participant", 50)
    }


# ---------- REPORTING SYSTEM ----------

@api_router.post("/community/report")
async def report_user(reporter_id: str, request: ReportUserRequest, reported_user_id: str):
    """Report a user for abuse"""
    # Can't report yourself
    if reporter_id == reported_user_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    # Check if already reported (prevent spam)
    existing = await db.reports.find_one({
        "reporter_id": reporter_id,
        "reported_user_id": reported_user_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending report for this user")
    
    report = UserReport(
        reporter_id=reporter_id,
        reported_user_id=reported_user_id,
        reason=request.reason,
        description=request.description,
        evidence_type=request.evidence_type,
        evidence_id=request.evidence_id
    )
    
    await db.reports.insert_one(report.model_dump())
    
    return {
        "success": True,
        "report_id": report.id,
        "message": "Report submitted. Thank you for helping keep the community safe."
    }


@api_router.get("/community/reports")
async def get_my_reports(user_id: str):
    """Get reports submitted by a user"""
    reports = await db.reports.find(
        {"reporter_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"reports": reports}


# ---------- BLOCKING SYSTEM ----------

@api_router.post("/community/block/{target_user_id}")
async def block_user(blocker_id: str, target_user_id: str):
    """Block a user (hide their content from your feed)"""
    if blocker_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if already blocked
    existing = await db.user_blocks.find_one({
        "blocker_id": blocker_id,
        "blocked_id": target_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User already blocked")
    
    block = UserBlock(
        blocker_id=blocker_id,
        blocked_id=target_user_id
    )
    
    await db.user_blocks.insert_one(block.model_dump())
    
    # Also unfollow if following
    await db.follows.delete_one({
        "follower_id": blocker_id,
        "following_id": target_user_id
    })
    
    return {"success": True, "message": "User blocked"}


@api_router.delete("/community/block/{target_user_id}")
async def unblock_user(blocker_id: str, target_user_id: str):
    """Unblock a user"""
    result = await db.user_blocks.delete_one({
        "blocker_id": blocker_id,
        "blocked_id": target_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="User not blocked")
    
    return {"success": True, "message": "User unblocked"}


@api_router.get("/community/blocked")
async def get_blocked_users(user_id: str):
    """Get list of blocked users"""
    blocks = await db.user_blocks.find(
        {"blocker_id": user_id}
    ).to_list(1000)
    
    blocked_ids = [b["blocked_id"] for b in blocks]
    
    # Get profiles
    profiles = await db.profiles.find(
        {"user_id": {"$in": blocked_ids}},
        {"_id": 0, "username": 1, "user_id": 1}
    ).to_list(1000)
    
    return {"blocked_users": profiles}


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
