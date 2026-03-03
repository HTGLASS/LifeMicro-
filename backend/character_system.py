"""
Character System for LifeMicro
Tamagotchi-style character with pixelated avatar from camera
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from enum import Enum
from pydantic import BaseModel, Field
import uuid
import math

# ============== ENUMS ==============

class EvolutionTier(str, Enum):
    SEEDLING = "seedling"      # 0-20 verified tasks
    SPROUT = "sprout"          # 21-75 verified tasks
    BLOOM = "bloom"            # 76-200 verified tasks
    FLOURISH = "flourish"      # 201-500 verified tasks
    TRANSCEND = "transcend"    # 500+ verified tasks

class CharacterMood(str, Enum):
    THRIVING = "thriving"      # Active, high energy
    HAPPY = "happy"            # Normal, good state
    NEUTRAL = "neutral"        # Okay, could be better
    TIRED = "tired"            # 1 day missed
    WEAK = "weak"              # 3 days missed
    FADING = "fading"          # 7+ days missed

class ItemRarity(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

class ItemCategory(str, Enum):
    SKIN = "skin"
    ACCESSORY = "accessory"
    BACKGROUND = "background"
    PARTICLE_EFFECT = "particle_effect"
    COMPANION = "companion"
    SEASONAL = "seasonal"

# ============== CONFIGURATION ==============

EVOLUTION_CONFIG = {
    EvolutionTier.SEEDLING: {
        "min_tasks": 0,
        "max_tasks": 20,
        "trust_requirement": 0,
        "streak_requirement": 0,
        "display_name": "Seedling",
        "description": "Just beginning your journey",
        "pixel_size": 16,  # Larger pixels = more blocky
        "color_palette": 4,  # Limited colors
    },
    EvolutionTier.SPROUT: {
        "min_tasks": 21,
        "max_tasks": 75,
        "trust_requirement": 40,
        "streak_requirement": 3,
        "display_name": "Sprout",
        "description": "Growing stronger every day",
        "pixel_size": 12,
        "color_palette": 8,
    },
    EvolutionTier.BLOOM: {
        "min_tasks": 76,
        "max_tasks": 200,
        "trust_requirement": 55,
        "streak_requirement": 7,
        "display_name": "Bloom",
        "description": "Blossoming into greatness",
        "pixel_size": 8,
        "color_palette": 16,
    },
    EvolutionTier.FLOURISH: {
        "min_tasks": 201,
        "max_tasks": 500,
        "trust_requirement": 70,
        "streak_requirement": 14,
        "display_name": "Flourish",
        "description": "Reaching your full potential",
        "pixel_size": 6,
        "color_palette": 32,
    },
    EvolutionTier.TRANSCEND: {
        "min_tasks": 501,
        "max_tasks": float('inf'),
        "trust_requirement": 80,
        "streak_requirement": 30,
        "display_name": "Transcend",
        "description": "Master of micro-wins",
        "pixel_size": 4,
        "color_palette": 64,
    },
}

MOOD_CONFIG = {
    CharacterMood.THRIVING: {
        "days_inactive": 0,
        "min_energy": 80,
        "animation": "bounce",
        "glow_color": "#00E5BF",
        "expression": "excited",
    },
    CharacterMood.HAPPY: {
        "days_inactive": 0,
        "min_energy": 50,
        "animation": "idle",
        "glow_color": "#4ECCA3",
        "expression": "smile",
    },
    CharacterMood.NEUTRAL: {
        "days_inactive": 0,
        "min_energy": 30,
        "animation": "idle",
        "glow_color": None,
        "expression": "neutral",
    },
    CharacterMood.TIRED: {
        "days_inactive": 1,
        "min_energy": 0,
        "animation": "droop",
        "glow_color": None,
        "expression": "tired",
        "visual_effects": ["desaturate_10"],
    },
    CharacterMood.WEAK: {
        "days_inactive": 3,
        "min_energy": 0,
        "animation": "shake",
        "glow_color": None,
        "expression": "sad",
        "visual_effects": ["desaturate_30", "dim_20"],
    },
    CharacterMood.FADING: {
        "days_inactive": 7,
        "min_energy": 0,
        "animation": "fade",
        "glow_color": None,
        "expression": "distressed",
        "visual_effects": ["desaturate_50", "dim_40", "blur_light"],
    },
}

ITEM_RARITY_CONFIG = {
    ItemRarity.COMMON: {
        "trust_requirement": 0,
        "streak_requirement": 0,
        "verified_requirement": 0,
        "price_multiplier": 1.0,
        "drop_rate": 0.5,
        "glow_color": None,
    },
    ItemRarity.UNCOMMON: {
        "trust_requirement": 40,
        "streak_requirement": 3,
        "verified_requirement": 10,
        "price_multiplier": 2.0,
        "drop_rate": 0.3,
        "glow_color": "#4CAF50",
    },
    ItemRarity.RARE: {
        "trust_requirement": 60,
        "streak_requirement": 7,
        "verified_requirement": 30,
        "price_multiplier": 4.0,
        "drop_rate": 0.15,
        "glow_color": "#2196F3",
    },
    ItemRarity.EPIC: {
        "trust_requirement": 75,
        "streak_requirement": 14,
        "verified_requirement": 75,
        "price_multiplier": 8.0,
        "drop_rate": 0.04,
        "glow_color": "#9C27B0",
    },
    ItemRarity.LEGENDARY: {
        "trust_requirement": 85,
        "streak_requirement": 21,
        "verified_requirement": 150,
        "price_multiplier": 20.0,
        "drop_rate": 0.01,
        "glow_color": "#FF9800",
    },
}

STORE_CONFIG = {
    "purchase_cooldown_hours": 48,
    "max_inventory_per_category": 50,
    "rare_item_rotation_days": 7,
    "pending_settlement_tiers": ["probation", "restricted"],
}

# ============== MODELS ==============

class CharacterStats(BaseModel):
    """Character statistics that update daily"""
    energy: int = Field(default=100, ge=0, le=100)        # Daily task completion
    integrity: int = Field(default=75, ge=0, le=100)      # Driven by Trust Score
    momentum: int = Field(default=0, ge=0, le=100)        # Driven by streak
    evolution_progress: float = Field(default=0, ge=0)    # Progress to next tier

class Character(BaseModel):
    """User's Tamagotchi-style character"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str = "Micro"
    
    # Avatar data (pixelated photo)
    avatar_original_url: Optional[str] = None
    avatar_pixelated_url: Optional[str] = None
    avatar_pixel_data: Optional[Dict[str, Any]] = None  # Stored pixel grid for rendering
    avatar_created_at: Optional[datetime] = None
    
    # Evolution
    evolution_tier: EvolutionTier = EvolutionTier.SEEDLING
    verified_task_count: int = 0
    evolution_paused: bool = False
    evolution_pause_reason: Optional[str] = None
    
    # Stats
    stats: CharacterStats = Field(default_factory=CharacterStats)
    current_mood: CharacterMood = CharacterMood.NEUTRAL
    
    # Activity tracking
    last_active_date: Optional[datetime] = None
    days_inactive: int = 0
    highest_streak: int = 0
    total_tasks_completed: int = 0
    
    # Equipped items
    equipped_items: Dict[str, str] = Field(default_factory=dict)  # category -> item_id
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CharacterItem(BaseModel):
    """Purchasable item for character customization"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: ItemCategory
    rarity: ItemRarity
    
    # Requirements
    trust_requirement: int = 0
    streak_requirement: int = 0
    verified_requirement: int = 0
    
    # Pricing
    base_price: int
    
    # Visual data
    preview_url: Optional[str] = None
    asset_data: Optional[Dict[str, Any]] = None
    
    # Availability
    is_active: bool = True
    is_seasonal: bool = False
    season_end_date: Optional[datetime] = None
    stock: int = -1  # -1 = unlimited
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ItemPurchase(BaseModel):
    """Record of item purchase"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    character_id: str
    item_id: str
    item_name: str
    rarity: ItemRarity
    
    # Transaction details
    tokens_spent: int
    status: str = "completed"  # completed, pending, refunded
    settlement_date: Optional[datetime] = None
    
    # Cooldown
    cooldown_expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=48))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserInventory(BaseModel):
    """User's owned items"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[str] = Field(default_factory=list)  # List of item_ids
    
    # Limits
    items_by_category: Dict[str, int] = Field(default_factory=dict)
    
    # Timestamps
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============== HELPER FUNCTIONS ==============

def get_evolution_tier(verified_task_count: int) -> EvolutionTier:
    """Determine evolution tier based on verified task count"""
    for tier, config in EVOLUTION_CONFIG.items():
        if config["min_tasks"] <= verified_task_count <= config["max_tasks"]:
            return tier
    return EvolutionTier.TRANSCEND

def can_evolve(
    character: Character,
    trust_score: int,
    current_streak: int
) -> Dict[str, Any]:
    """Check if character can evolve to the next tier"""
    current_tier = character.evolution_tier
    verified_count = character.verified_task_count
    
    # Find next tier
    tier_order = list(EvolutionTier)
    current_index = tier_order.index(current_tier)
    
    if current_index >= len(tier_order) - 1:
        return {
            "can_evolve": False,
            "reason": "Already at maximum evolution",
            "next_tier": None,
        }
    
    next_tier = tier_order[current_index + 1]
    next_config = EVOLUTION_CONFIG[next_tier]
    
    # Check requirements
    result = {
        "can_evolve": True,
        "next_tier": next_tier,
        "requirements": {
            "tasks": {
                "current": verified_count,
                "required": next_config["min_tasks"],
                "met": verified_count >= next_config["min_tasks"],
            },
            "trust_score": {
                "current": trust_score,
                "required": next_config["trust_requirement"],
                "met": trust_score >= next_config["trust_requirement"],
            },
            "streak": {
                "current": current_streak,
                "required": next_config["streak_requirement"],
                "met": current_streak >= next_config["streak_requirement"],
            },
        },
        "blockers": [],
    }
    
    # Check each requirement
    if not result["requirements"]["tasks"]["met"]:
        result["can_evolve"] = False
        result["blockers"].append(f"Need {next_config['min_tasks'] - verified_count} more verified tasks")
    
    if not result["requirements"]["trust_score"]["met"]:
        result["can_evolve"] = False
        result["blockers"].append(f"Trust score must be at least {next_config['trust_requirement']}")
    
    if not result["requirements"]["streak"]["met"]:
        result["can_evolve"] = False
        result["blockers"].append(f"Need a {next_config['streak_requirement']}-day streak")
    
    return result

def calculate_mood(
    days_inactive: int,
    energy: int,
    trust_score: int
) -> CharacterMood:
    """Calculate character mood based on activity and stats"""
    # Check inactivity first (takes priority)
    if days_inactive >= 7:
        return CharacterMood.FADING
    elif days_inactive >= 3:
        return CharacterMood.WEAK
    elif days_inactive >= 1:
        return CharacterMood.TIRED
    
    # Check energy and trust
    if energy >= 80 and trust_score >= 70:
        return CharacterMood.THRIVING
    elif energy >= 50 and trust_score >= 50:
        return CharacterMood.HAPPY
    else:
        return CharacterMood.NEUTRAL

def calculate_energy(
    tasks_completed_today: int,
    tasks_available_today: int
) -> int:
    """Calculate energy based on daily task completion"""
    if tasks_available_today == 0:
        return 50  # Default when no tasks
    
    completion_rate = tasks_completed_today / tasks_available_today
    energy = int(completion_rate * 100)
    
    # Bonus for completing all tasks
    if completion_rate >= 1.0:
        energy = min(100, energy + 10)
    
    return min(100, max(0, energy))

def calculate_momentum(streak_count: int, highest_streak: int) -> int:
    """Calculate momentum based on current streak"""
    if streak_count == 0:
        return 0
    
    # Base momentum from streak
    base_momentum = min(streak_count * 5, 50)
    
    # Bonus for maintaining a good streak relative to personal best
    if highest_streak > 0:
        streak_ratio = streak_count / highest_streak
        bonus = int(streak_ratio * 50)
        return min(100, base_momentum + bonus)
    
    return base_momentum

def calculate_integrity(trust_score: int) -> int:
    """Calculate integrity directly from trust score"""
    return trust_score

def apply_deterioration(
    character: Character,
    days_inactive: int
) -> Dict[str, Any]:
    """Apply deterioration effects based on inactivity"""
    changes = {
        "mood_changed": False,
        "tier_regressed": False,
        "stats_reduced": False,
        "old_mood": character.current_mood,
        "new_mood": character.current_mood,
        "old_tier": character.evolution_tier,
        "new_tier": character.evolution_tier,
    }
    
    # Update mood
    new_mood = calculate_mood(days_inactive, character.stats.energy, character.stats.integrity)
    if new_mood != character.current_mood:
        changes["mood_changed"] = True
        changes["new_mood"] = new_mood
    
    # Regress evolution tier after 7 days
    if days_inactive >= 7:
        tier_order = list(EvolutionTier)
        current_index = tier_order.index(character.evolution_tier)
        if current_index > 0:
            changes["tier_regressed"] = True
            changes["new_tier"] = tier_order[current_index - 1]
    
    # Reduce stats
    if days_inactive > 0:
        changes["stats_reduced"] = True
        # Energy decays faster
        energy_decay = min(days_inactive * 15, 80)
        # Momentum decays slower
        momentum_decay = min(days_inactive * 10, 100)
        
        changes["energy_reduction"] = energy_decay
        changes["momentum_reduction"] = momentum_decay
    
    return changes

def can_purchase_item(
    user_id: str,
    item: CharacterItem,
    trust_score: int,
    streak_count: int,
    verified_task_count: int,
    wallet_balance: int,
    last_purchase_time: Optional[datetime] = None,
    inventory_count_for_category: int = 0
) -> Dict[str, Any]:
    """Check if user can purchase an item"""
    rarity_config = ITEM_RARITY_CONFIG[item.rarity]
    
    result = {
        "can_purchase": True,
        "blockers": [],
        "warnings": [],
    }
    
    # Check trust score
    if trust_score < item.trust_requirement:
        result["can_purchase"] = False
        result["blockers"].append(f"Trust score must be at least {item.trust_requirement} (current: {trust_score})")
    
    # Check streak
    if streak_count < item.streak_requirement:
        result["can_purchase"] = False
        result["blockers"].append(f"Need a {item.streak_requirement}-day streak (current: {streak_count})")
    
    # Check verified tasks
    if verified_task_count < item.verified_requirement:
        result["can_purchase"] = False
        result["blockers"].append(f"Need {item.verified_requirement} verified tasks (current: {verified_task_count})")
    
    # Check balance
    if wallet_balance < item.base_price:
        result["can_purchase"] = False
        result["blockers"].append(f"Insufficient balance (need {item.base_price}, have {wallet_balance})")
    
    # Check cooldown
    if last_purchase_time:
        cooldown_end = last_purchase_time + timedelta(hours=STORE_CONFIG["purchase_cooldown_hours"])
        if datetime.utcnow() < cooldown_end:
            hours_remaining = (cooldown_end - datetime.utcnow()).total_seconds() / 3600
            result["can_purchase"] = False
            result["blockers"].append(f"Purchase cooldown active ({hours_remaining:.1f} hours remaining)")
    
    # Check inventory limit
    max_per_category = STORE_CONFIG["max_inventory_per_category"]
    if inventory_count_for_category >= max_per_category:
        result["can_purchase"] = False
        result["blockers"].append(f"Inventory full for this category (max {max_per_category})")
    
    # Check stock
    if item.stock == 0:
        result["can_purchase"] = False
        result["blockers"].append("Item out of stock")
    
    # Check seasonal availability
    if item.is_seasonal and item.season_end_date:
        if datetime.utcnow() > item.season_end_date:
            result["can_purchase"] = False
            result["blockers"].append("Seasonal item no longer available")
    
    return result

def get_pixel_settings(evolution_tier: EvolutionTier) -> Dict[str, Any]:
    """Get pixelation settings based on evolution tier"""
    config = EVOLUTION_CONFIG[evolution_tier]
    return {
        "pixel_size": config["pixel_size"],
        "color_palette": config["color_palette"],
        "smoothing": evolution_tier.value in ["flourish", "transcend"],
    }

def calculate_evolution_progress(
    verified_task_count: int,
    current_tier: EvolutionTier
) -> float:
    """Calculate progress towards next evolution tier (0-100%)"""
    config = EVOLUTION_CONFIG[current_tier]
    
    if current_tier == EvolutionTier.TRANSCEND:
        return 100.0
    
    tier_order = list(EvolutionTier)
    current_index = tier_order.index(current_tier)
    next_tier = tier_order[current_index + 1]
    next_config = EVOLUTION_CONFIG[next_tier]
    
    tasks_in_current_tier = verified_task_count - config["min_tasks"]
    tasks_needed_for_next = next_config["min_tasks"] - config["min_tasks"]
    
    if tasks_needed_for_next <= 0:
        return 100.0
    
    progress = (tasks_in_current_tier / tasks_needed_for_next) * 100
    return min(100.0, max(0.0, progress))

# ============== DEFAULT ITEMS ==============

DEFAULT_ITEMS = [
    # Common items
    CharacterItem(
        name="Basic Glow",
        description="A subtle ambient glow effect",
        category=ItemCategory.PARTICLE_EFFECT,
        rarity=ItemRarity.COMMON,
        base_price=50,
    ),
    CharacterItem(
        name="Simple Hat",
        description="A classic pixelated cap",
        category=ItemCategory.ACCESSORY,
        rarity=ItemRarity.COMMON,
        base_price=75,
    ),
    CharacterItem(
        name="Sky Background",
        description="Peaceful blue sky backdrop",
        category=ItemCategory.BACKGROUND,
        rarity=ItemRarity.COMMON,
        base_price=100,
    ),
    
    # Uncommon items
    CharacterItem(
        name="Sparkle Trail",
        description="Leave sparkles as you move",
        category=ItemCategory.PARTICLE_EFFECT,
        rarity=ItemRarity.UNCOMMON,
        trust_requirement=40,
        streak_requirement=3,
        verified_requirement=10,
        base_price=150,
    ),
    CharacterItem(
        name="Cool Sunglasses",
        description="Look cool while grinding",
        category=ItemCategory.ACCESSORY,
        rarity=ItemRarity.UNCOMMON,
        trust_requirement=40,
        streak_requirement=3,
        verified_requirement=10,
        base_price=175,
    ),
    CharacterItem(
        name="Forest Background",
        description="Serene forest setting",
        category=ItemCategory.BACKGROUND,
        rarity=ItemRarity.UNCOMMON,
        trust_requirement=40,
        streak_requirement=3,
        verified_requirement=10,
        base_price=200,
    ),
    
    # Rare items
    CharacterItem(
        name="Fire Aura",
        description="Blazing motivation flames",
        category=ItemCategory.PARTICLE_EFFECT,
        rarity=ItemRarity.RARE,
        trust_requirement=60,
        streak_requirement=7,
        verified_requirement=30,
        base_price=400,
    ),
    CharacterItem(
        name="Crown",
        description="Reign over your micro-wins",
        category=ItemCategory.ACCESSORY,
        rarity=ItemRarity.RARE,
        trust_requirement=60,
        streak_requirement=7,
        verified_requirement=30,
        base_price=450,
    ),
    CharacterItem(
        name="Cosmic Background",
        description="Stars and nebulas surround you",
        category=ItemCategory.BACKGROUND,
        rarity=ItemRarity.RARE,
        trust_requirement=60,
        streak_requirement=7,
        verified_requirement=30,
        base_price=500,
    ),
    CharacterItem(
        name="Mini Spirit",
        description="A tiny companion follows you",
        category=ItemCategory.COMPANION,
        rarity=ItemRarity.RARE,
        trust_requirement=60,
        streak_requirement=7,
        verified_requirement=30,
        base_price=600,
    ),
    
    # Epic items
    CharacterItem(
        name="Lightning Storm",
        description="Electric power surrounds you",
        category=ItemCategory.PARTICLE_EFFECT,
        rarity=ItemRarity.EPIC,
        trust_requirement=75,
        streak_requirement=14,
        verified_requirement=75,
        base_price=1000,
    ),
    CharacterItem(
        name="Angel Wings",
        description="Majestic wings of achievement",
        category=ItemCategory.ACCESSORY,
        rarity=ItemRarity.EPIC,
        trust_requirement=75,
        streak_requirement=14,
        verified_requirement=75,
        base_price=1200,
    ),
    CharacterItem(
        name="Phoenix Companion",
        description="A legendary phoenix by your side",
        category=ItemCategory.COMPANION,
        rarity=ItemRarity.EPIC,
        trust_requirement=75,
        streak_requirement=14,
        verified_requirement=75,
        base_price=1500,
    ),
    
    # Legendary items
    CharacterItem(
        name="Infinity Aura",
        description="The ultimate power radiates from within",
        category=ItemCategory.PARTICLE_EFFECT,
        rarity=ItemRarity.LEGENDARY,
        trust_requirement=85,
        streak_requirement=21,
        verified_requirement=150,
        base_price=3000,
    ),
    CharacterItem(
        name="Transcendent Crown",
        description="Mark of a true micro-win master",
        category=ItemCategory.ACCESSORY,
        rarity=ItemRarity.LEGENDARY,
        trust_requirement=85,
        streak_requirement=21,
        verified_requirement=150,
        base_price=3500,
    ),
    CharacterItem(
        name="Dragon Companion",
        description="An ancient dragon guards your progress",
        category=ItemCategory.COMPANION,
        rarity=ItemRarity.LEGENDARY,
        trust_requirement=85,
        streak_requirement=21,
        verified_requirement=150,
        base_price=5000,
    ),
    CharacterItem(
        name="Realm of Champions",
        description="The ultimate background for legends",
        category=ItemCategory.BACKGROUND,
        rarity=ItemRarity.LEGENDARY,
        trust_requirement=85,
        streak_requirement=21,
        verified_requirement=150,
        base_price=4000,
    ),
]

# ============== EXPORT ==============

__all__ = [
    "EvolutionTier",
    "CharacterMood",
    "ItemRarity",
    "ItemCategory",
    "EVOLUTION_CONFIG",
    "MOOD_CONFIG",
    "ITEM_RARITY_CONFIG",
    "STORE_CONFIG",
    "CharacterStats",
    "Character",
    "CharacterItem",
    "ItemPurchase",
    "UserInventory",
    "get_evolution_tier",
    "can_evolve",
    "calculate_mood",
    "calculate_energy",
    "calculate_momentum",
    "calculate_integrity",
    "apply_deterioration",
    "can_purchase_item",
    "get_pixel_settings",
    "calculate_evolution_progress",
    "DEFAULT_ITEMS",
]
