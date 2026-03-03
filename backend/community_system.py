"""
Community System for LifeMicro
- User profiles (public/private)
- Follow/friend system
- Open groups
- Community challenges with voting
- Leaderboards and activity feed
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid


class ProfileVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class ChallengeStatus(str, Enum):
    PROPOSED = "proposed"      # Waiting for votes
    ACTIVE = "active"          # Currently running
    COMPLETED = "completed"    # Finished
    CANCELLED = "cancelled"    # Not enough votes


class ChallengeType(str, Enum):
    TASK_COUNT = "task_count"           # Complete X tasks
    STREAK = "streak"                   # Maintain X day streak
    CATEGORY_SPECIFIC = "category"      # Complete X tasks in category
    POINTS = "points"                   # Earn X MICO points


# ============== Pydantic Models ==============

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    visibility: ProfileVisibility = ProfileVisibility.PRIVATE
    avatar_preview: Optional[Dict] = None  # Simplified avatar data for display
    
    # Stats (public if profile is public)
    total_tasks_completed: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    trust_score: int = 75
    evolution_tier: str = "seedling"
    equipped_items_count: int = 0
    
    # Achievements
    achievements: List[str] = Field(default_factory=list)
    
    # Social
    followers_count: int = 0
    following_count: int = 0
    groups_count: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FollowRelation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str  # The user doing the following
    following_id: str  # The user being followed
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    creator_id: str
    
    # Group settings (open groups - anyone can join)
    is_open: bool = True
    
    # Stats
    member_count: int = 0
    total_tasks_completed: int = 0
    active_challenges: int = 0
    
    # Members list (stored separately for scalability)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GroupMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    user_id: str
    role: str = "member"  # member, admin
    tasks_contributed: int = 0
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class CommunityChallenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    creator_id: str
    
    # Challenge details
    title: str
    description: Optional[str] = None
    challenge_type: ChallengeType
    target_value: int  # e.g., 100 tasks, 7 days streak
    category: Optional[str] = None  # For category-specific challenges
    
    # Timing
    voting_ends_at: datetime  # When voting period ends
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    duration_days: int = 7
    
    # Status
    status: ChallengeStatus = ChallengeStatus.PROPOSED
    
    # Voting
    votes_for: int = 0
    votes_against: int = 0
    votes_needed: int = 5  # Minimum votes to proceed
    voters: List[str] = Field(default_factory=list)  # User IDs who voted
    
    # Progress (once active)
    participants: List[str] = Field(default_factory=list)
    current_progress: int = 0
    
    # Rewards
    reward_per_participant: int = 50  # MICO bonus for completion
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChallengeParticipant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    challenge_id: str
    user_id: str
    progress: int = 0
    completed: bool = False
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class GroupMessage(BaseModel):
    """Public group chat message"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    user_id: str
    username: str
    message_type: str = "message"  # message, announcement, system
    content: str
    is_pinned: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReportReason(str, Enum):
    SPAM = "spam"
    HARASSMENT = "harassment"
    CHEATING = "cheating"
    INAPPROPRIATE = "inappropriate"
    IMPERSONATION = "impersonation"
    OTHER = "other"


class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    ACTIONED = "actioned"
    DISMISSED = "dismissed"


class UserReport(BaseModel):
    """Report a user for abuse"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    reported_user_id: str
    reason: ReportReason
    description: Optional[str] = None
    evidence_type: Optional[str] = None  # message_id, profile, challenge, etc.
    evidence_id: Optional[str] = None
    status: ReportStatus = ReportStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None


class UserBlock(BaseModel):
    """Block a user from appearing in your feed"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    blocker_id: str
    blocked_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityFeedItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    activity_type: str  # achievement, task_milestone, item_equipped, streak, evolution, challenge_completed
    title: str
    description: Optional[str] = None
    metadata: Dict = Field(default_factory=dict)  # Extra data like item rarity, task count, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============== Request/Response Models ==============

class CreateProfileRequest(BaseModel):
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    visibility: ProfileVisibility = ProfileVisibility.PRIVATE


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    visibility: Optional[ProfileVisibility] = None


class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None


class CreateChallengeRequest(BaseModel):
    title: str
    description: Optional[str] = None
    challenge_type: ChallengeType
    target_value: int
    category: Optional[str] = None
    duration_days: int = 7
    voting_hours: int = 24  # How long voting lasts


class VoteChallengeRequest(BaseModel):
    vote: bool  # True = for, False = against


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "message"  # message, announcement


class ReportUserRequest(BaseModel):
    reason: ReportReason
    description: Optional[str] = None
    evidence_type: Optional[str] = None
    evidence_id: Optional[str] = None


# ============== Achievement Definitions ==============

ACHIEVEMENTS = {
    "first_task": {"name": "First Step", "description": "Complete your first task", "icon": "footsteps"},
    "streak_7": {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "flame"},
    "streak_30": {"name": "Monthly Master", "description": "Maintain a 30-day streak", "icon": "trophy"},
    "tasks_10": {"name": "Getting Started", "description": "Complete 10 tasks", "icon": "checkmark-done"},
    "tasks_50": {"name": "Task Veteran", "description": "Complete 50 tasks", "icon": "medal"},
    "tasks_100": {"name": "Century Club", "description": "Complete 100 tasks", "icon": "ribbon"},
    "tasks_500": {"name": "Task Legend", "description": "Complete 500 tasks", "icon": "star"},
    "trust_90": {"name": "Trusted Member", "description": "Reach 90+ trust score", "icon": "shield-checkmark"},
    "evolution_bloom": {"name": "In Bloom", "description": "Evolve to Bloom tier", "icon": "flower"},
    "evolution_transcend": {"name": "Transcendent", "description": "Reach Transcend tier", "icon": "sparkles"},
    "first_item": {"name": "Collector", "description": "Purchase your first item", "icon": "cube"},
    "items_10": {"name": "Fashionista", "description": "Own 10 items", "icon": "shirt"},
    "legendary_item": {"name": "Legendary Find", "description": "Own a legendary item", "icon": "diamond"},
    "group_creator": {"name": "Community Builder", "description": "Create a group", "icon": "people"},
    "challenge_complete": {"name": "Challenge Accepted", "description": "Complete a group challenge", "icon": "flag"},
    "social_10": {"name": "Social Butterfly", "description": "Gain 10 followers", "icon": "heart"},
}


# ============== Helper Functions ==============

def check_achievements(user_data: Dict) -> List[str]:
    """Check which achievements a user has earned"""
    earned = []
    
    tasks = user_data.get("total_tasks_completed", 0)
    streak = user_data.get("current_streak", 0)
    trust = user_data.get("trust_score", 75)
    evolution = user_data.get("evolution_tier", "seedling")
    items_owned = user_data.get("items_owned", 0)
    has_legendary = user_data.get("has_legendary_item", False)
    followers = user_data.get("followers_count", 0)
    groups_created = user_data.get("groups_created", 0)
    challenges_completed = user_data.get("challenges_completed", 0)
    
    if tasks >= 1:
        earned.append("first_task")
    if tasks >= 10:
        earned.append("tasks_10")
    if tasks >= 50:
        earned.append("tasks_50")
    if tasks >= 100:
        earned.append("tasks_100")
    if tasks >= 500:
        earned.append("tasks_500")
    
    if streak >= 7:
        earned.append("streak_7")
    if streak >= 30:
        earned.append("streak_30")
    
    if trust >= 90:
        earned.append("trust_90")
    
    if evolution in ["bloom", "flourish", "transcend"]:
        earned.append("evolution_bloom")
    if evolution == "transcend":
        earned.append("evolution_transcend")
    
    if items_owned >= 1:
        earned.append("first_item")
    if items_owned >= 10:
        earned.append("items_10")
    if has_legendary:
        earned.append("legendary_item")
    
    if groups_created >= 1:
        earned.append("group_creator")
    if challenges_completed >= 1:
        earned.append("challenge_complete")
    if followers >= 10:
        earned.append("social_10")
    
    return earned


def create_activity_item(
    user_id: str,
    username: str,
    activity_type: str,
    title: str,
    description: str = None,
    metadata: Dict = None
) -> ActivityFeedItem:
    """Create an activity feed item"""
    return ActivityFeedItem(
        user_id=user_id,
        username=username,
        activity_type=activity_type,
        title=title,
        description=description,
        metadata=metadata or {}
    )


# Exports
__all__ = [
    "ProfileVisibility",
    "ChallengeStatus",
    "ChallengeType",
    "ReportReason",
    "ReportStatus",
    "UserProfile",
    "FollowRelation",
    "Group",
    "GroupMember",
    "CommunityChallenge",
    "ChallengeParticipant",
    "GroupMessage",
    "UserReport",
    "UserBlock",
    "ActivityFeedItem",
    "CreateProfileRequest",
    "UpdateProfileRequest",
    "CreateGroupRequest",
    "CreateChallengeRequest",
    "VoteChallengeRequest",
    "SendMessageRequest",
    "ReportUserRequest",
    "ACHIEVEMENTS",
    "check_achievements",
    "create_activity_item",
]
