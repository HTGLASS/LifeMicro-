"""
Anti-Cheat System for LifeMicro
Production-grade cheat resistance with Trust Score system
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from enum import Enum
import random
import math

# ============== ENUMS ==============

class VerificationType(str, Enum):
    TEXT_REFLECTION = "text_reflection"
    CONTEXTUAL_QUESTION = "contextual_question"
    PHOTO_UPLOAD = "photo_upload"
    VOICE_REFLECTION = "voice_reflection"

class TaskValidationStatus(str, Enum):
    VALIDATED = "validated"
    PENDING_REVIEW = "pending_review"
    SUSPICIOUS = "suspicious"
    REJECTED = "rejected"

class TrustTier(str, Enum):
    EXEMPLARY = "exemplary"      # 80-100
    STANDARD = "standard"        # 50-79
    PROBATION = "probation"      # 30-49
    RESTRICTED = "restricted"    # 0-29

# ============== TRUST SCORE CONFIGURATION ==============

TRUST_SCORE_CONFIG = {
    # Starting score for new users
    "initial_score": 75,
    
    # Maximum and minimum bounds
    "max_score": 100,
    "min_score": 0,
    
    # Tier thresholds
    "tiers": {
        TrustTier.EXEMPLARY: {"min": 80, "max": 100},
        TrustTier.STANDARD: {"min": 50, "max": 79},
        TrustTier.PROBATION: {"min": 30, "max": 49},
        TrustTier.RESTRICTED: {"min": 0, "max": 29},
    },
    
    # Positive adjustments
    "positive": {
        "sensor_verified_task": 3,
        "reflection_completed": 2,
        "streak_day": 1,
        "realistic_completion_time": 1,
        "photo_verification": 4,
        "voice_verification": 3,
        "contextual_question_correct": 2,
        "weekly_consistency_bonus": 5,
    },
    
    # Negative adjustments
    "negative": {
        "rapid_completion": -5,
        "skipped_verification": -3,
        "suspicious_pattern": -8,
        "instant_daily_completion": -10,
        "sensor_validation_failed": -4,
        "reflection_too_short": -2,
        "contextual_question_wrong": -2,
        "streak_broken": -2,
    },
    
    # Daily decay (inactivity penalty)
    "daily_decay": -1,
    
    # Tier-based multipliers for rewards
    "reward_multipliers": {
        TrustTier.EXEMPLARY: 1.3,
        TrustTier.STANDARD: 1.0,
        TrustTier.PROBATION: 0.8,
        TrustTier.RESTRICTED: 0.5,
    },
    
    # Verification probability by tier
    "verification_probability": {
        TrustTier.EXEMPLARY: 0.15,    # 15% chance
        TrustTier.STANDARD: 0.20,     # 20% chance
        TrustTier.PROBATION: 0.35,    # 35% chance
        TrustTier.RESTRICTED: 0.60,   # 60% chance
    },
    
    # Verification strictness by tier
    "verification_strictness": {
        TrustTier.EXEMPLARY: "lenient",     # Just log, no blocking
        TrustTier.STANDARD: "moderate",     # Partial points if skipped
        TrustTier.PROBATION: "strict",      # Must complete, reduced points if skipped
        TrustTier.RESTRICTED: "mandatory",  # Must complete to get any points
    },
    
    # Point settlement delays (hours)
    "settlement_delay": {
        TrustTier.EXEMPLARY: 0,
        TrustTier.STANDARD: 0,
        TrustTier.PROBATION: 12,
        TrustTier.RESTRICTED: 24,
    },
}

# ============== TIME VALIDATION CONFIG ==============

TIME_VALIDATION_CONFIG = {
    # Minimum time (seconds) based on estimated task duration
    "min_time_ratios": {
        "1 min": 30,      # At least 30 seconds for 1-min task
        "2 min": 60,      # At least 1 minute for 2-min task
        "3 min": 90,
        "5 min": 150,
        "10 min": 300,
        "15 min": 450,
        "20 min": 600,
        "30 min": 900,
    },
    
    # Suspicious threshold (too fast)
    "suspicious_ratio": 0.3,  # Less than 30% of estimated time
    
    # Realistic threshold (normal completion)
    "realistic_ratio": 0.5,   # At least 50% of estimated time
    
    # Maximum time between completions (anti-bot)
    "min_gap_between_tasks": 30,  # seconds
    
    # Maximum tasks per hour
    "max_tasks_per_hour": 10,
    
    # Rapid tap prevention (milliseconds)
    "rapid_tap_threshold": 500,
}

# ============== CONTEXTUAL QUESTIONS ==============

CONTEXTUAL_QUESTIONS = {
    "fitness": [
        {"question": "Which muscle group did you focus on?", "options": ["Arms", "Legs", "Core", "Full body", "Cardio"]},
        {"question": "How would you rate your effort?", "options": ["Light", "Moderate", "Challenging", "Intense"]},
        {"question": "Did you break a sweat?", "options": ["Yes, definitely", "A little", "Not really"]},
        {"question": "What was your heart rate like?", "options": ["Elevated", "Normal", "Resting"]},
    ],
    "focus": [
        {"question": "What did you accomplish during this focus session?", "options": ["Deep work", "Planning", "Reading", "Writing", "Organizing"]},
        {"question": "Were you able to avoid distractions?", "options": ["Completely", "Mostly", "Some interruptions", "Very distracted"]},
        {"question": "How clear is your mind now?", "options": ["Very clear", "Clearer", "About the same", "Still foggy"]},
    ],
    "business": [
        {"question": "What type of business activity was this?", "options": ["Networking", "Planning", "Learning", "Creating", "Communicating"]},
        {"question": "Did this move you closer to a goal?", "options": ["Definitely", "Somewhat", "Not sure"]},
    ],
    "relationships": [
        {"question": "Who did you connect with?", "options": ["Family", "Friend", "Partner", "Colleague", "Myself"]},
        {"question": "How meaningful was the interaction?", "options": ["Very meaningful", "Pleasant", "Routine", "Challenging"]},
    ],
    "spiritual": [
        {"question": "How do you feel after this practice?", "options": ["Peaceful", "Centered", "Reflective", "Grateful", "Unchanged"]},
        {"question": "Were you able to be fully present?", "options": ["Completely", "Mostly", "Partially", "Struggled"]},
    ],
    "creativity": [
        {"question": "What did you create or explore?", "options": ["Art/Drawing", "Writing", "Music", "Ideas", "Problem-solving"]},
        {"question": "Did you surprise yourself?", "options": ["Yes!", "A little", "Not really"]},
    ],
    "health": [
        {"question": "How does your body feel now?", "options": ["Energized", "Relaxed", "Neutral", "Tired but good"]},
        {"question": "Did you stay hydrated?", "options": ["Yes", "Some", "Need more water"]},
    ],
}

# ============== HELPER FUNCTIONS ==============

def get_trust_tier(trust_score: int) -> TrustTier:
    """Determine trust tier based on score"""
    if trust_score >= 80:
        return TrustTier.EXEMPLARY
    elif trust_score >= 50:
        return TrustTier.STANDARD
    elif trust_score >= 30:
        return TrustTier.PROBATION
    else:
        return TrustTier.RESTRICTED

def calculate_trust_score_change(
    action: str,
    is_positive: bool = True
) -> int:
    """Calculate trust score change for an action"""
    if is_positive:
        return TRUST_SCORE_CONFIG["positive"].get(action, 0)
    else:
        return TRUST_SCORE_CONFIG["negative"].get(action, 0)

def get_min_completion_time(time_estimate: str) -> int:
    """Get minimum completion time in seconds for a task"""
    return TIME_VALIDATION_CONFIG["min_time_ratios"].get(time_estimate, 30)

def should_trigger_verification(trust_score: int) -> bool:
    """Determine if verification should be triggered based on trust score"""
    tier = get_trust_tier(trust_score)
    probability = TRUST_SCORE_CONFIG["verification_probability"][tier]
    return random.random() < probability

def get_verification_strictness(trust_score: int) -> str:
    """Get verification strictness level based on trust score"""
    tier = get_trust_tier(trust_score)
    return TRUST_SCORE_CONFIG["verification_strictness"][tier]

def get_reward_multiplier(trust_score: int) -> float:
    """Get reward multiplier based on trust score"""
    tier = get_trust_tier(trust_score)
    return TRUST_SCORE_CONFIG["reward_multipliers"][tier]

def get_settlement_delay(trust_score: int) -> int:
    """Get point settlement delay in hours based on trust score"""
    tier = get_trust_tier(trust_score)
    return TRUST_SCORE_CONFIG["settlement_delay"][tier]

def get_contextual_question(goal_category: str) -> Optional[Dict]:
    """Get a random contextual question for a goal category"""
    questions = CONTEXTUAL_QUESTIONS.get(goal_category, [])
    if questions:
        return random.choice(questions)
    return None

def validate_completion_time(
    started_at: datetime,
    completed_at: datetime,
    time_estimate: str
) -> Dict[str, Any]:
    """Validate task completion time"""
    elapsed_seconds = (completed_at - started_at).total_seconds()
    min_time = get_min_completion_time(time_estimate)
    
    # Parse estimated minutes
    try:
        estimated_minutes = int(time_estimate.replace(" min", "").replace("min", ""))
    except:
        estimated_minutes = 5
    
    estimated_seconds = estimated_minutes * 60
    completion_ratio = elapsed_seconds / estimated_seconds if estimated_seconds > 0 else 0
    
    result = {
        "elapsed_seconds": elapsed_seconds,
        "estimated_seconds": estimated_seconds,
        "completion_ratio": completion_ratio,
        "is_valid": True,
        "is_suspicious": False,
        "is_realistic": False,
        "trust_adjustment": 0,
        "reason": None,
    }
    
    # Check for suspicious rapid completion
    if elapsed_seconds < min_time * TIME_VALIDATION_CONFIG["suspicious_ratio"]:
        result["is_valid"] = False
        result["is_suspicious"] = True
        result["trust_adjustment"] = calculate_trust_score_change("rapid_completion", False)
        result["reason"] = "Completion too fast"
    elif completion_ratio < TIME_VALIDATION_CONFIG["suspicious_ratio"]:
        result["is_suspicious"] = True
        result["trust_adjustment"] = calculate_trust_score_change("rapid_completion", False)
        result["reason"] = "Suspiciously fast completion"
    elif completion_ratio >= TIME_VALIDATION_CONFIG["realistic_ratio"]:
        result["is_realistic"] = True
        result["trust_adjustment"] = calculate_trust_score_change("realistic_completion_time", True)
    
    return result

def validate_reflection(text: str, min_length: int = 50) -> Dict[str, Any]:
    """Validate text reflection"""
    result = {
        "is_valid": False,
        "trust_adjustment": 0,
        "reason": None,
    }
    
    if not text or len(text.strip()) < min_length:
        result["trust_adjustment"] = calculate_trust_score_change("reflection_too_short", False)
        result["reason"] = f"Reflection too short (min {min_length} characters)"
    else:
        result["is_valid"] = True
        result["trust_adjustment"] = calculate_trust_score_change("reflection_completed", True)
    
    return result

def detect_suspicious_patterns(
    user_id: str,
    recent_completions: List[Dict],
    current_completion: datetime
) -> Dict[str, Any]:
    """Detect suspicious completion patterns"""
    result = {
        "is_suspicious": False,
        "patterns_detected": [],
        "trust_adjustment": 0,
    }
    
    if not recent_completions:
        return result
    
    # Check for rapid consecutive completions
    recent_times = [c.get("completed_at") for c in recent_completions if c.get("completed_at")]
    if recent_times:
        # Check gap between last completion and current
        last_completion = max(recent_times) if isinstance(recent_times[0], datetime) else datetime.fromisoformat(max(recent_times))
        gap_seconds = (current_completion - last_completion).total_seconds()
        
        if gap_seconds < TIME_VALIDATION_CONFIG["min_gap_between_tasks"]:
            result["is_suspicious"] = True
            result["patterns_detected"].append("rapid_consecutive_completions")
    
    # Check for too many completions in last hour
    hour_ago = current_completion - timedelta(hours=1)
    completions_last_hour = sum(
        1 for c in recent_completions 
        if c.get("completed_at") and 
        (c["completed_at"] if isinstance(c["completed_at"], datetime) else datetime.fromisoformat(c["completed_at"])) > hour_ago
    )
    
    if completions_last_hour >= TIME_VALIDATION_CONFIG["max_tasks_per_hour"]:
        result["is_suspicious"] = True
        result["patterns_detected"].append("too_many_completions_per_hour")
    
    # Check for 100% daily completion (suspicious if all done instantly)
    today_start = current_completion.replace(hour=0, minute=0, second=0, microsecond=0)
    todays_completions = [
        c for c in recent_completions 
        if c.get("completed_at") and 
        (c["completed_at"] if isinstance(c["completed_at"], datetime) else datetime.fromisoformat(c["completed_at"])) > today_start
    ]
    
    if len(todays_completions) >= 5:
        # Check if all completed within 10 minutes
        completion_times = sorted([
            c["completed_at"] if isinstance(c["completed_at"], datetime) else datetime.fromisoformat(c["completed_at"])
            for c in todays_completions if c.get("completed_at")
        ])
        if len(completion_times) >= 2:
            time_span = (completion_times[-1] - completion_times[0]).total_seconds()
            if time_span < 600:  # All within 10 minutes
                result["is_suspicious"] = True
                result["patterns_detected"].append("instant_daily_completion")
                result["trust_adjustment"] += calculate_trust_score_change("instant_daily_completion", False)
    
    if result["patterns_detected"] and not result["trust_adjustment"]:
        result["trust_adjustment"] = calculate_trust_score_change("suspicious_pattern", False)
    
    return result

def calculate_daily_trust_decay(last_active: Optional[datetime], current_date: datetime) -> int:
    """Calculate trust score decay for inactivity"""
    if not last_active:
        return 0
    
    days_inactive = (current_date - last_active).days
    if days_inactive <= 0:
        return 0
    
    # Cap decay at 7 days (max -7 points)
    days_to_penalize = min(days_inactive, 7)
    return TRUST_SCORE_CONFIG["daily_decay"] * days_to_penalize

def generate_verification_request(
    task: Dict,
    trust_score: int
) -> Optional[Dict[str, Any]]:
    """Generate a verification request for a task"""
    if not should_trigger_verification(trust_score):
        return None
    
    strictness = get_verification_strictness(trust_score)
    goal_category = task.get("goal_category", "focus")
    
    # Choose verification type based on strictness
    tier = get_trust_tier(trust_score)
    
    if tier == TrustTier.RESTRICTED:
        # Mandatory - require photo or contextual question
        verification_types = [VerificationType.PHOTO_UPLOAD, VerificationType.CONTEXTUAL_QUESTION]
    elif tier == TrustTier.PROBATION:
        # Strict - text reflection or contextual question
        verification_types = [VerificationType.TEXT_REFLECTION, VerificationType.CONTEXTUAL_QUESTION]
    elif tier == TrustTier.STANDARD:
        # Moderate - any type
        verification_types = list(VerificationType)
    else:
        # Lenient - simpler verifications
        verification_types = [VerificationType.CONTEXTUAL_QUESTION]
    
    chosen_type = random.choice(verification_types)
    
    verification = {
        "type": chosen_type,
        "strictness": strictness,
        "required": strictness in ["strict", "mandatory"],
        "partial_points_if_skipped": strictness == "moderate",
        "skip_penalty": 0.5 if strictness == "moderate" else (0 if strictness == "lenient" else 1.0),
    }
    
    if chosen_type == VerificationType.CONTEXTUAL_QUESTION:
        question = get_contextual_question(goal_category)
        if question:
            verification["question"] = question["question"]
            verification["options"] = question["options"]
        else:
            verification["question"] = "How did completing this task make you feel?"
            verification["options"] = ["Great", "Good", "Okay", "Neutral"]
    
    elif chosen_type == VerificationType.TEXT_REFLECTION:
        verification["prompt"] = "Share a brief reflection on this task (min 50 characters)"
        verification["min_length"] = 50
    
    elif chosen_type == VerificationType.PHOTO_UPLOAD:
        verification["prompt"] = "Take a photo showing your completed task"
    
    elif chosen_type == VerificationType.VOICE_REFLECTION:
        verification["prompt"] = "Record a 10-second voice reflection"
        verification["min_duration"] = 10
    
    return verification

# ============== SENSOR VALIDATION ==============

def validate_movement_data(
    movement_data: Dict[str, Any],
    task_type: str,
    expected_duration_minutes: int
) -> Dict[str, Any]:
    """Validate sensor/movement data for physical tasks"""
    result = {
        "is_valid": False,
        "validation_status": TaskValidationStatus.PENDING_REVIEW,
        "trust_adjustment": 0,
        "reason": None,
    }
    
    if not movement_data:
        result["reason"] = "No movement data provided"
        return result
    
    # Check accelerometer data
    accelerometer_samples = movement_data.get("accelerometer_samples", [])
    if accelerometer_samples:
        # Calculate movement intensity
        total_movement = 0
        for sample in accelerometer_samples:
            x, y, z = sample.get("x", 0), sample.get("y", 0), sample.get("z", 0)
            magnitude = math.sqrt(x**2 + y**2 + z**2)
            total_movement += magnitude
        
        avg_movement = total_movement / len(accelerometer_samples) if accelerometer_samples else 0
        
        # Threshold for "real" movement (not just phone sitting still)
        movement_threshold = 0.5  # Adjust based on testing
        
        if avg_movement > movement_threshold:
            result["is_valid"] = True
            result["validation_status"] = TaskValidationStatus.VALIDATED
            result["trust_adjustment"] = calculate_trust_score_change("sensor_verified_task", True)
        else:
            result["reason"] = "Insufficient movement detected"
            result["trust_adjustment"] = calculate_trust_score_change("sensor_validation_failed", False)
    
    # Check step count if available
    step_count = movement_data.get("step_count", 0)
    if step_count > 0:
        # For walking tasks, expect ~100 steps per minute
        expected_steps = expected_duration_minutes * 50  # Lower threshold
        if step_count >= expected_steps * 0.5:  # At least 50% of expected
            result["is_valid"] = True
            result["validation_status"] = TaskValidationStatus.VALIDATED
            result["trust_adjustment"] = calculate_trust_score_change("sensor_verified_task", True)
    
    # Check GPS movement for outdoor tasks
    gps_data = movement_data.get("gps_positions", [])
    if gps_data and len(gps_data) >= 2:
        # Calculate total distance moved
        total_distance = 0
        for i in range(1, len(gps_data)):
            lat1, lon1 = gps_data[i-1].get("lat", 0), gps_data[i-1].get("lon", 0)
            lat2, lon2 = gps_data[i].get("lat", 0), gps_data[i].get("lon", 0)
            # Haversine formula for distance
            R = 6371000  # Earth's radius in meters
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            total_distance += R * c
        
        # Expect at least 10 meters of movement for outdoor tasks
        if total_distance >= 10:
            result["is_valid"] = True
            result["validation_status"] = TaskValidationStatus.VALIDATED
    
    return result

# ============== TRUST SCORE CALCULATION ==============

def calculate_new_trust_score(
    current_score: int,
    adjustments: List[int],
    apply_decay: bool = False,
    days_inactive: int = 0
) -> int:
    """Calculate new trust score with all adjustments"""
    new_score = current_score
    
    # Apply all adjustments
    for adjustment in adjustments:
        new_score += adjustment
    
    # Apply decay if applicable
    if apply_decay and days_inactive > 0:
        decay = TRUST_SCORE_CONFIG["daily_decay"] * min(days_inactive, 7)
        new_score += decay
    
    # Clamp to bounds
    new_score = max(TRUST_SCORE_CONFIG["min_score"], min(TRUST_SCORE_CONFIG["max_score"], new_score))
    
    return new_score

# ============== EXPORT CONFIGURATION ==============

__all__ = [
    "VerificationType",
    "TaskValidationStatus", 
    "TrustTier",
    "TRUST_SCORE_CONFIG",
    "TIME_VALIDATION_CONFIG",
    "CONTEXTUAL_QUESTIONS",
    "get_trust_tier",
    "calculate_trust_score_change",
    "get_min_completion_time",
    "should_trigger_verification",
    "get_verification_strictness",
    "get_reward_multiplier",
    "get_settlement_delay",
    "get_contextual_question",
    "validate_completion_time",
    "validate_reflection",
    "detect_suspicious_patterns",
    "calculate_daily_trust_decay",
    "generate_verification_request",
    "validate_movement_data",
    "calculate_new_trust_score",
]
