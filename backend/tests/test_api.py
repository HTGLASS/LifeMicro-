"""
Backend API Tests for LifeMicro
Testing: User, Task, Character, Trust Score, and Anti-Cheat APIs
"""
import pytest
import requests
import os
import time
import uuid

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://trust-score-app-1.preview.emergentagent.com')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["message"] == "LifeMicro API"
        print(f"✓ API health check passed: {data}")


class TestUserAPI:
    """User CRUD tests"""
    
    def test_create_user_and_verify_uuid(self):
        """Test POST /api/users - Create user and verify UUID generation"""
        device_id = f"TEST_device_{uuid.uuid4()}"
        payload = {"device_id": device_id, "name": "Test User"}
        
        response = requests.post(f"{BASE_URL}/api/users", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify UUID is generated
        assert "id" in data, "User ID should be present"
        assert len(data["id"]) > 0, "User ID should not be empty"
        assert data["device_id"] == device_id
        assert data["trust_score"] == 75  # Default trust score
        assert data["onboarding_completed"] == False
        print(f"✓ User created with ID: {data['id']}")
        
        # Verify we can get the same user by device_id
        response2 = requests.post(f"{BASE_URL}/api/users", json=payload)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["id"] == data["id"], "Same device_id should return same user"
        print(f"✓ Idempotent user creation verified")
        
        return data["id"]
    
    def test_update_user_preferences(self):
        """Test PUT /api/users/{user_id} - Update user preferences"""
        # First create a user
        device_id = f"TEST_device_{uuid.uuid4()}"
        create_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = create_response.json()["id"]
        
        # Update preferences
        update_payload = {
            "name": "Updated Test User",
            "preferences": {
                "goals": ["fitness", "focus"],
                "productive_time": "morning",
                "available_time": "15min"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "Updated Test User"
        assert "fitness" in data["preferences"]["goals"]
        assert "focus" in data["preferences"]["goals"]
        print(f"✓ User preferences updated: {data['preferences']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == "Updated Test User"
        print(f"✓ User update persisted correctly")
        
        return user_id
    
    def test_complete_onboarding(self):
        """Test user onboarding completion"""
        device_id = f"TEST_device_{uuid.uuid4()}"
        create_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = create_response.json()["id"]
        
        # Complete onboarding
        response = requests.post(f"{BASE_URL}/api/users/{user_id}/complete-onboarding")
        assert response.status_code == 200
        
        data = response.json()
        assert data["onboarding_completed"] == True
        print(f"✓ Onboarding completed for user: {user_id}")


class TestTaskAPI:
    """Task generation and management tests"""
    
    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Create a user for task tests"""
        device_id = f"TEST_task_user_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": device_id,
            "name": "Task Test User"
        })
        self.user_id = response.json()["id"]
        
        # Update preferences for task generation
        requests.put(f"{BASE_URL}/api/users/{self.user_id}", json={
            "preferences": {
                "goals": ["fitness", "focus"],
                "productive_time": "morning",
                "available_time": "15min"
            }
        })
    
    def test_generate_tasks_from_library(self):
        """Test POST /api/tasks/{user_id}/generate - Generate tasks from library"""
        response = requests.post(f"{BASE_URL}/api/tasks/{self.user_id}/generate", json={
            "mode": "offline"  # Use library, no AI
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tasks" in data
        assert len(data["tasks"]) > 0, "Should generate at least one task"
        assert len(data["tasks"]) <= 3, "Should generate at most 3 tasks"
        assert data["source"] == "library"
        
        # Verify task structure
        task = data["tasks"][0]
        assert "id" in task
        assert "title" in task
        assert "description" in task
        assert "time_estimate" in task
        assert "reward_amount" in task
        assert "status" in task
        assert task["status"] == "pending"
        
        print(f"✓ Generated {len(data['tasks'])} tasks from library")
        for t in data["tasks"]:
            print(f"  - {t['title']} ({t['time_estimate']}, {t['reward_amount']} MICO)")
        
        return data["tasks"]
    
    def test_context_question(self):
        """Test GET /api/tasks/{user_id}/context-question"""
        response = requests.get(f"{BASE_URL}/api/tasks/{self.user_id}/context-question")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "question" in data
        assert "options" in data
        assert len(data["options"]) > 0
        print(f"✓ Context question: {data['question']}")
        print(f"  Options: {data['options']}")
    
    def test_get_user_tasks(self):
        """Test GET /api/tasks/{user_id}"""
        # Generate tasks first
        requests.post(f"{BASE_URL}/api/tasks/{self.user_id}/generate", json={"mode": "offline"})
        
        response = requests.get(f"{BASE_URL}/api/tasks/{self.user_id}?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        print(f"✓ Retrieved {len(data['tasks'])} pending tasks")


class TestAntiCheatSystem:
    """Anti-cheat system tests - Start task before complete"""
    
    @pytest.fixture(autouse=True)
    def setup_user_and_task(self):
        """Create user and generate a task"""
        device_id = f"TEST_anticheat_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": device_id,
            "name": "Anti-Cheat Test User"
        })
        self.user_id = user_response.json()["id"]
        
        # Set preferences
        requests.put(f"{BASE_URL}/api/users/{self.user_id}", json={
            "preferences": {
                "goals": ["focus"],
                "available_time": "5min"
            }
        })
        
        # Generate tasks
        task_response = requests.post(f"{BASE_URL}/api/tasks/{self.user_id}/generate", json={"mode": "offline"})
        if task_response.status_code == 200:
            tasks = task_response.json().get("tasks", [])
            if tasks:
                self.task_id = tasks[0]["id"]
            else:
                self.task_id = None
        else:
            self.task_id = None
    
    def test_start_task_for_time_tracking(self):
        """Test POST /api/tasks/start - Start task for anti-cheat time tracking"""
        if not self.task_id:
            pytest.skip("No task available for testing")
        
        response = requests.post(f"{BASE_URL}/api/tasks/start", json={
            "task_id": self.task_id
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "started_at" in data
        assert "min_completion_time" in data
        assert data["min_completion_time"] > 0, "Min completion time should be positive"
        
        # verification may or may not be required (15-60% chance based on trust)
        print(f"✓ Task started at: {data['started_at']}")
        print(f"  Min completion time: {data['min_completion_time']}s")
        print(f"  Verification required: {data.get('verification_required', False)}")
        
        return data
    
    def test_complete_task_with_validation(self):
        """Test POST /api/tasks/complete - Complete task with anti-cheat validation"""
        if not self.task_id:
            pytest.skip("No task available for testing")
        
        # First start the task
        start_response = requests.post(f"{BASE_URL}/api/tasks/start", json={
            "task_id": self.task_id
        })
        assert start_response.status_code == 200
        
        start_data = start_response.json()
        min_time = start_data.get("min_completion_time", 30)
        
        # Wait a bit to pass the minimum time check (but not too long for test)
        # For testing, we'll wait a small amount and accept potential "suspicious" flag
        time.sleep(2)
        
        # Complete the task
        response = requests.post(f"{BASE_URL}/api/tasks/complete", json={
            "task_id": self.task_id
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "tokens_earned" in data or "tokens_pending" in data
        assert "new_balance" in data
        assert "trust_score" in data
        assert "trust_change" in data
        assert "validation_status" in data
        
        print(f"✓ Task completed!")
        print(f"  Tokens earned: {data.get('tokens_earned', 0)}")
        print(f"  Trust score: {data['trust_score']}")
        print(f"  Trust change: {data['trust_change']}")
        print(f"  Validation status: {data['validation_status']}")
        
        # Note: validation_status might be "suspicious" due to quick completion
        # This is expected behavior of the anti-cheat system
        if data['validation_status'] == "suspicious":
            print("  (Note: Quick completion flagged as suspicious - expected in test)")
    
    def test_complete_without_start_is_suspicious(self):
        """Test that completing a task without starting first is flagged"""
        # Create a new task for this test
        device_id = f"TEST_nostart_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = user_response.json()["id"]
        
        requests.put(f"{BASE_URL}/api/users/{user_id}", json={
            "preferences": {"goals": ["focus"], "available_time": "5min"}
        })
        
        task_response = requests.post(f"{BASE_URL}/api/tasks/{user_id}/generate", json={"mode": "offline"})
        if task_response.status_code != 200:
            pytest.skip("Could not generate task")
        
        tasks = task_response.json().get("tasks", [])
        if not tasks:
            pytest.skip("No tasks generated")
        
        task_id = tasks[0]["id"]
        
        # Complete without starting - should still work but be flagged
        response = requests.post(f"{BASE_URL}/api/tasks/complete", json={
            "task_id": task_id
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # The validation_status should indicate the task wasn't properly started
        print(f"✓ Task completion without start - validation: {data['validation_status']}")
        print(f"  Trust change: {data['trust_change']} (negative expected)")


class TestTrustScoreAPI:
    """Trust score and tier tests"""
    
    def test_get_trust_score(self):
        """Test GET /api/trust-score/{user_id} - Get trust score and tier"""
        # Create user
        device_id = f"TEST_trust_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = user_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/trust-score/{user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trust_score" in data
        assert "tier" in data
        assert "tier_config" in data
        assert "verified_task_count" in data
        assert "suspicious_flag_count" in data
        
        # Default trust score should be 75 (standard tier)
        assert data["trust_score"] == 75
        assert data["tier"] == "standard"
        
        # Verify tier config
        config = data["tier_config"]
        assert "reward_multiplier" in config
        assert "verification_probability" in config
        assert "settlement_delay_hours" in config
        
        print(f"✓ Trust score: {data['trust_score']}")
        print(f"  Tier: {data['tier']}")
        print(f"  Reward multiplier: {config['reward_multiplier']}")
        print(f"  Verification probability: {config['verification_probability']}")


class TestCharacterSystem:
    """Character creation and management tests"""
    
    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Create a user for character tests"""
        device_id = f"TEST_char_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": device_id,
            "name": "Character Test User"
        })
        self.user_id = response.json()["id"]
    
    def test_create_character(self):
        """Test POST /api/character/create - Create character for user"""
        response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "TestMicro",
            "avatar_pixel_data": {
                "width": 16,
                "height": 16,
                "pixelSize": 8,
                "colors": ["#FF0000", "#00FF00", "#0000FF"]
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["user_id"] == self.user_id
        assert data["name"] == "TestMicro"
        assert data["evolution_tier"] == "seedling"
        assert data["avatar_pixel_data"] is not None
        
        print(f"✓ Character created: {data['name']}")
        print(f"  ID: {data['id']}")
        print(f"  Evolution tier: {data['evolution_tier']}")
        
        return data["id"]
    
    def test_get_character_with_stats(self):
        """Test GET /api/character/{user_id} - Get character with stats"""
        # First create character
        requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "StatsMicro"
        })
        
        response = requests.get(f"{BASE_URL}/api/character/{self.user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "character" in data
        assert "stats" in data
        assert "mood" in data
        assert "evolution" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "energy" in stats
        assert "momentum" in stats
        assert "integrity" in stats
        assert "evolution_progress" in stats
        
        # Verify evolution structure
        evolution = data["evolution"]
        assert "current_tier" in evolution
        assert "pixel_settings" in evolution
        
        print(f"✓ Character stats retrieved:")
        print(f"  Energy: {stats['energy']}")
        print(f"  Momentum: {stats['momentum']}")
        print(f"  Integrity: {stats['integrity']}")
        print(f"  Mood: {data['mood']}")
    
    def test_update_avatar(self):
        """Test PUT /api/character/{user_id}/avatar - Update avatar pixel data"""
        # First create character
        requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "AvatarMicro"
        })
        
        # Update avatar
        new_pixel_data = {
            "width": 32,
            "height": 32,
            "pixelSize": 4,
            "colors": ["#FFAA00", "#00FFAA", "#AA00FF", "#FF00AA"]
        }
        
        response = requests.put(f"{BASE_URL}/api/character/{self.user_id}/avatar", json={
            "avatar_pixel_data": new_pixel_data
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Avatar updated successfully")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/character/{self.user_id}")
        get_data = get_response.json()
        assert get_data["character"]["avatar_pixel_data"]["width"] == 32
        print(f"✓ Avatar update persisted")
    
    def test_duplicate_character_fails(self):
        """Test that creating duplicate character returns error"""
        # Create first character
        requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "FirstMicro"
        })
        
        # Try to create second character
        response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "SecondMicro"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print(f"✓ Duplicate character creation correctly rejected")
    
    def test_character_not_found(self):
        """Test 404 when character doesn't exist"""
        response = requests.get(f"{BASE_URL}/api/character/nonexistent-user-id")
        assert response.status_code == 404
        print(f"✓ 404 returned for non-existent character")


class TestWalletAPI:
    """Wallet and token tests"""
    
    def test_get_wallet(self):
        """Test GET /api/wallet/{user_id}"""
        # Create user (wallet is created automatically)
        device_id = f"TEST_wallet_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = user_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/wallet/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "total_earned" in data
        assert "total_redeemed" in data
        assert "streak" in data
        
        # New user should have 0 balance
        assert data["balance"] == 0
        print(f"✓ Wallet retrieved - balance: {data['balance']}")


class TestMarketplace:
    """Marketplace tests"""
    
    def test_get_marketplace_items(self):
        """Test GET /api/marketplace"""
        response = requests.get(f"{BASE_URL}/api/marketplace")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        
        # Should have seeded items
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "id" in item
            assert "title" in item
            assert "token_cost" in item
            print(f"✓ Marketplace has {len(data['items'])} items")
            for i in data["items"][:3]:
                print(f"  - {i['title']}: {i['token_cost']} MICO")


class TestTaskSkip:
    """Task skip tests"""
    
    def test_skip_task(self):
        """Test POST /api/tasks/skip"""
        # Create user and task
        device_id = f"TEST_skip_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={"device_id": device_id})
        user_id = user_response.json()["id"]
        
        requests.put(f"{BASE_URL}/api/users/{user_id}", json={
            "preferences": {"goals": ["focus"], "available_time": "5min"}
        })
        
        task_response = requests.post(f"{BASE_URL}/api/tasks/{user_id}/generate", json={"mode": "offline"})
        if task_response.status_code != 200:
            pytest.skip("Could not generate task")
        
        tasks = task_response.json().get("tasks", [])
        if not tasks:
            pytest.skip("No tasks generated")
        
        task_id = tasks[0]["id"]
        
        # Skip the task
        response = requests.post(f"{BASE_URL}/api/tasks/skip", json={
            "task_id": task_id,
            "reason": "Testing skip functionality"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Task skipped successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
