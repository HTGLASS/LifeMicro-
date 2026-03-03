"""
Backend API Tests for LifeMicro Character Store System
Testing: Character Store, Inventory, Purchase, Equip/Unequip
"""
import pytest
import requests
import os
import uuid

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://trust-score-app-1.preview.emergentagent.com')


class TestCharacterStore:
    """Character store endpoint tests - 14 categories with 78 items"""
    
    def test_get_character_store_all_items(self):
        """Test GET /api/character-store - Get all store items"""
        response = requests.get(f"{BASE_URL}/api/character-store")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data
        
        items = data["items"]
        print(f"✓ Character store has {len(items)} total items")
        
        # Should have items across all 14 categories
        categories = set(item["category"] for item in items)
        expected_categories = {
            "skin", "head", "face", "eyes", "mouth", "body", "back",
            "hands", "feet", "background", "foreground", "aura", "particle", "companion"
        }
        
        print(f"  Categories found: {len(categories)}")
        for cat in sorted(categories):
            count = sum(1 for item in items if item["category"] == cat)
            print(f"    - {cat}: {count} items")
        
        # Verify all expected categories exist
        missing_categories = expected_categories - categories
        assert len(missing_categories) == 0, f"Missing categories: {missing_categories}"
        
        # Verify item structure
        if items:
            item = items[0]
            assert "id" in item
            assert "name" in item
            assert "description" in item
            assert "category" in item
            assert "rarity" in item
            assert "base_price" in item
            assert "trust_requirement" in item
            assert "streak_requirement" in item
            assert "verified_requirement" in item
    
    def test_get_character_store_by_category(self):
        """Test GET /api/character-store?category=skin - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/character-store?category=skin")
        
        assert response.status_code == 200
        data = response.json()
        
        items = data["items"]
        assert all(item["category"] == "skin" for item in items), "All items should be skin category"
        print(f"✓ Filtered skin category: {len(items)} items")
    
    def test_get_character_store_by_rarity(self):
        """Test GET /api/character-store?rarity=legendary - Filter by rarity"""
        response = requests.get(f"{BASE_URL}/api/character-store?rarity=legendary")
        
        assert response.status_code == 200
        data = response.json()
        
        items = data["items"]
        assert all(item["rarity"] == "legendary" for item in items), "All items should be legendary"
        print(f"✓ Filtered legendary rarity: {len(items)} items")
        for item in items[:5]:
            print(f"    - {item['name']} ({item['category']}): {item['base_price']} MICO")
    
    def test_character_store_rarity_distribution(self):
        """Test that store has items across all rarities"""
        response = requests.get(f"{BASE_URL}/api/character-store")
        items = response.json()["items"]
        
        rarities = {}
        for item in items:
            rarity = item["rarity"]
            rarities[rarity] = rarities.get(rarity, 0) + 1
        
        expected_rarities = ["common", "uncommon", "rare", "epic", "legendary"]
        print(f"✓ Rarity distribution:")
        for rarity in expected_rarities:
            count = rarities.get(rarity, 0)
            print(f"    - {rarity}: {count} items")
            assert count > 0, f"Missing items for rarity: {rarity}"


class TestInventory:
    """User inventory tests"""
    
    @pytest.fixture(autouse=True)
    def setup_user_with_character(self):
        """Create user with character for inventory tests"""
        self.device_id = f"TEST_inv_{uuid.uuid4()}"
        
        # Create user
        user_response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": self.device_id,
            "name": "Inventory Test User"
        })
        self.user_id = user_response.json()["id"]
        
        # Create character
        char_response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "InvTestChar"
        })
        if char_response.status_code == 200:
            self.character = char_response.json()
        else:
            self.character = None
    
    def test_get_empty_inventory(self):
        """Test GET /api/character/{user_id}/inventory - Empty inventory"""
        response = requests.get(f"{BASE_URL}/api/character/{self.user_id}/inventory")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "items_by_category" in data
        assert len(data["items"]) == 0, "New user should have empty inventory"
        print(f"✓ Empty inventory retrieved correctly")
    
    def test_inventory_structure(self):
        """Test inventory response structure"""
        response = requests.get(f"{BASE_URL}/api/character/{self.user_id}/inventory")
        data = response.json()
        
        assert isinstance(data["items"], list)
        assert isinstance(data["items_by_category"], dict)
        print(f"✓ Inventory structure is correct")


class TestPurchase:
    """Character item purchase tests"""
    
    @pytest.fixture(autouse=True)
    def setup_user_with_balance(self):
        """Create user with character and add balance for purchase tests"""
        self.device_id = f"TEST_purch_{uuid.uuid4()}"
        
        # Create user
        user_response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": self.device_id,
            "name": "Purchase Test User"
        })
        self.user_id = user_response.json()["id"]
        
        # Update user preferences and complete tasks to earn MICO
        requests.put(f"{BASE_URL}/api/users/{self.user_id}", json={
            "preferences": {
                "goals": ["fitness", "focus"],
                "productive_time": "morning",
                "available_time": "15min"
            }
        })
        
        # Create character
        char_response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "PurchTestChar"
        })
        if char_response.status_code == 200:
            self.character = char_response.json()
        
        # Complete tasks to earn MICO tokens
        for _ in range(5):
            task_response = requests.post(f"{BASE_URL}/api/tasks/{self.user_id}/generate", json={"mode": "offline"})
            if task_response.status_code == 200:
                tasks = task_response.json().get("tasks", [])
                for task in tasks:
                    # Start task
                    requests.post(f"{BASE_URL}/api/tasks/start", json={"task_id": task["id"]})
                    # Complete task
                    requests.post(f"{BASE_URL}/api/tasks/complete", json={"task_id": task["id"]})
        
        # Get current balance
        wallet_response = requests.get(f"{BASE_URL}/api/wallet/{self.user_id}")
        self.balance = wallet_response.json().get("balance", 0)
        print(f"  Setup complete - Balance: {self.balance} MICO")
    
    def test_purchase_common_item_success(self):
        """Test POST /api/character/{user_id}/purchase - Purchase a common item"""
        # Get a cheap common item
        store_response = requests.get(f"{BASE_URL}/api/character-store?rarity=common")
        items = store_response.json()["items"]
        
        if not items:
            pytest.skip("No common items available")
        
        # Find cheapest common item
        cheapest_item = min(items, key=lambda x: x["base_price"])
        
        if self.balance < cheapest_item["base_price"]:
            pytest.skip(f"Insufficient balance ({self.balance}) for cheapest item ({cheapest_item['base_price']})")
        
        print(f"  Attempting to purchase: {cheapest_item['name']} for {cheapest_item['base_price']} MICO")
        
        response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
            "item_id": cheapest_item["id"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "purchase_id" in data
        assert data["item_name"] == cheapest_item["name"]
        assert data["tokens_spent"] == cheapest_item["base_price"]
        
        print(f"✓ Successfully purchased: {data['item_name']}")
        print(f"  Tokens spent: {data['tokens_spent']}")
        print(f"  Status: {data['status']}")
        
        # Verify item appears in inventory
        inv_response = requests.get(f"{BASE_URL}/api/character/{self.user_id}/inventory")
        inv_data = inv_response.json()
        
        item_ids = [item["id"] for item in inv_data["items"]]
        assert cheapest_item["id"] in item_ids, "Purchased item should be in inventory"
        print(f"✓ Item verified in inventory")
        
        # Verify wallet balance decreased
        wallet_response = requests.get(f"{BASE_URL}/api/wallet/{self.user_id}")
        new_balance = wallet_response.json()["balance"]
        assert new_balance == self.balance - cheapest_item["base_price"], "Balance should decrease by item price"
        print(f"✓ Wallet balance correctly updated: {self.balance} -> {new_balance}")
    
    def test_purchase_insufficient_balance(self):
        """Test purchase fails with insufficient balance"""
        # Get an expensive item
        store_response = requests.get(f"{BASE_URL}/api/character-store?rarity=legendary")
        items = store_response.json()["items"]
        
        if not items:
            pytest.skip("No legendary items available")
        
        expensive_item = max(items, key=lambda x: x["base_price"])
        
        # This should fail if user doesn't have enough balance
        if self.balance >= expensive_item["base_price"]:
            pytest.skip("User has enough balance for legendary item")
        
        response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
            "item_id": expensive_item["id"]
        })
        
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        print(f"✓ Correctly rejected purchase with insufficient balance")
    
    def test_purchase_already_owned_item(self):
        """Test purchasing an already owned item fails"""
        # First purchase an item
        store_response = requests.get(f"{BASE_URL}/api/character-store?rarity=common")
        items = store_response.json()["items"]
        
        if not items:
            pytest.skip("No common items available")
        
        cheapest_item = min(items, key=lambda x: x["base_price"])
        
        if self.balance < cheapest_item["base_price"]:
            pytest.skip("Insufficient balance")
        
        # First purchase
        first_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
            "item_id": cheapest_item["id"]
        })
        
        if first_response.status_code != 200:
            pytest.skip("First purchase failed")
        
        # Try to purchase same item again
        second_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
            "item_id": cheapest_item["id"]
        })
        
        assert second_response.status_code == 400, f"Expected 400 for duplicate purchase, got {second_response.status_code}"
        print(f"✓ Correctly rejected duplicate purchase")


class TestEquipUnequip:
    """Equip and unequip item tests"""
    
    @pytest.fixture(autouse=True)
    def setup_user_with_item(self):
        """Create user with character and purchase an item"""
        self.device_id = f"TEST_equip_{uuid.uuid4()}"
        
        # Create user
        user_response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": self.device_id,
            "name": "Equip Test User"
        })
        self.user_id = user_response.json()["id"]
        
        # Set preferences
        requests.put(f"{BASE_URL}/api/users/{self.user_id}", json={
            "preferences": {
                "goals": ["fitness", "focus"],
                "productive_time": "morning",
                "available_time": "15min"
            }
        })
        
        # Create character
        char_response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": self.user_id,
            "name": "EquipTestChar"
        })
        if char_response.status_code == 200:
            self.character = char_response.json()
        
        # Complete many tasks to earn MICO tokens
        for _ in range(10):
            task_response = requests.post(f"{BASE_URL}/api/tasks/{self.user_id}/generate", json={"mode": "offline"})
            if task_response.status_code == 200:
                tasks = task_response.json().get("tasks", [])
                for task in tasks:
                    requests.post(f"{BASE_URL}/api/tasks/start", json={"task_id": task["id"]})
                    requests.post(f"{BASE_URL}/api/tasks/complete", json={"task_id": task["id"]})
        
        # Get balance and purchase a common item
        wallet_response = requests.get(f"{BASE_URL}/api/wallet/{self.user_id}")
        self.balance = wallet_response.json().get("balance", 0)
        
        store_response = requests.get(f"{BASE_URL}/api/character-store?rarity=common")
        items = store_response.json()["items"]
        
        self.purchased_item = None
        if items and self.balance >= items[0]["base_price"]:
            cheapest = min(items, key=lambda x: x["base_price"])
            purch_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
                "item_id": cheapest["id"]
            })
            if purch_response.status_code == 200:
                self.purchased_item = cheapest
                print(f"  Setup complete - Purchased: {cheapest['name']} ({cheapest['category']})")
    
    def test_equip_item_success(self):
        """Test PUT /api/character/{user_id}/equip - Equip an owned item"""
        if not self.purchased_item:
            pytest.skip("No purchased item available")
        
        response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/equip", json={
            "item_id": self.purchased_item["id"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "equipped" in data
        
        category = self.purchased_item["category"]
        assert category in data["equipped"], f"Item should be equipped in {category} slot"
        assert data["equipped"][category] == self.purchased_item["id"]
        
        print(f"✓ Item equipped successfully")
        print(f"  Category: {category}")
        print(f"  Item ID: {self.purchased_item['id']}")
        
        # Verify in character data
        char_response = requests.get(f"{BASE_URL}/api/character/{self.user_id}")
        char_data = char_response.json()
        
        equipped_items = char_data["character"].get("equipped_items", {})
        assert category in equipped_items, f"Item should be in character's equipped_items"
        assert equipped_items[category] == self.purchased_item["id"]
        print(f"✓ Item verified in character equipped_items")
    
    def test_equip_item_not_in_inventory(self):
        """Test equipping an item not in inventory fails"""
        response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/equip", json={
            "item_id": "nonexistent-item-id"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Correctly rejected equipping unowned item")
    
    def test_unequip_item_success(self):
        """Test POST /api/character/{user_id}/unequip - Unequip an item"""
        if not self.purchased_item:
            pytest.skip("No purchased item available")
        
        # First equip the item
        equip_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/equip", json={
            "item_id": self.purchased_item["id"]
        })
        
        if equip_response.status_code != 200:
            pytest.skip("Could not equip item")
        
        category = self.purchased_item["category"]
        
        # Now unequip
        response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/unequip?category={category}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["unequipped_category"] == category
        
        print(f"✓ Item unequipped from {category} slot")
        
        # Verify in character data
        char_response = requests.get(f"{BASE_URL}/api/character/{self.user_id}")
        char_data = char_response.json()
        
        equipped_items = char_data["character"].get("equipped_items", {})
        assert category not in equipped_items, f"{category} slot should be empty"
        print(f"✓ Slot verified empty in character data")
    
    def test_equip_replaces_previous_item(self):
        """Test equipping an item replaces the previous item in that slot"""
        if not self.purchased_item:
            pytest.skip("No purchased item available")
        
        # First equip the item
        equip_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/equip", json={
            "item_id": self.purchased_item["id"]
        })
        
        if equip_response.status_code != 200:
            pytest.skip("Could not equip item")
        
        category = self.purchased_item["category"]
        
        # Purchase another item of the same category
        store_response = requests.get(f"{BASE_URL}/api/character-store?category={category}")
        items = store_response.json()["items"]
        
        # Find a different item in same category
        other_item = None
        wallet_response = requests.get(f"{BASE_URL}/api/wallet/{self.user_id}")
        balance = wallet_response.json().get("balance", 0)
        
        for item in items:
            if item["id"] != self.purchased_item["id"] and balance >= item["base_price"]:
                other_item = item
                break
        
        if not other_item:
            pytest.skip("No other item available in same category")
        
        # Purchase and equip the other item
        purch_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/purchase", json={
            "item_id": other_item["id"]
        })
        
        if purch_response.status_code != 200:
            pytest.skip("Could not purchase second item")
        
        equip2_response = requests.post(f"{BASE_URL}/api/character/{self.user_id}/equip", json={
            "item_id": other_item["id"]
        })
        
        assert equip2_response.status_code == 200
        
        # Verify the new item replaced the old one
        char_response = requests.get(f"{BASE_URL}/api/character/{self.user_id}")
        char_data = char_response.json()
        
        equipped_items = char_data["character"].get("equipped_items", {})
        assert equipped_items[category] == other_item["id"], "New item should replace old one"
        print(f"✓ New item correctly replaced previous item in {category} slot")


class TestFullPurchaseEquipFlow:
    """Full integration test: Create user → Character → Tasks → Earn MICO → Purchase → Equip"""
    
    def test_full_flow(self):
        """Test complete flow from user creation to equipping an item"""
        print("\n=== Full Integration Test: Purchase & Equip Flow ===")
        
        # Step 1: Create user
        device_id = f"TEST_full_{uuid.uuid4()}"
        user_response = requests.post(f"{BASE_URL}/api/users", json={
            "device_id": device_id,
            "name": "Full Flow Test User"
        })
        assert user_response.status_code == 200
        user_id = user_response.json()["id"]
        print(f"✓ Step 1: User created - {user_id}")
        
        # Step 2: Create character
        char_response = requests.post(f"{BASE_URL}/api/character/create", json={
            "user_id": user_id,
            "name": "FullFlowMicro"
        })
        assert char_response.status_code == 200
        print(f"✓ Step 2: Character created - FullFlowMicro")
        
        # Step 3: Complete tasks to earn MICO
        requests.put(f"{BASE_URL}/api/users/{user_id}", json={
            "preferences": {
                "goals": ["fitness", "focus"],
                "available_time": "5min"
            }
        })
        
        total_earned = 0
        for i in range(5):
            task_response = requests.post(f"{BASE_URL}/api/tasks/{user_id}/generate", json={"mode": "offline"})
            if task_response.status_code == 200:
                tasks = task_response.json().get("tasks", [])
                for task in tasks:
                    requests.post(f"{BASE_URL}/api/tasks/start", json={"task_id": task["id"]})
                    complete_response = requests.post(f"{BASE_URL}/api/tasks/complete", json={"task_id": task["id"]})
                    if complete_response.status_code == 200:
                        earned = complete_response.json().get("tokens_earned", 0)
                        total_earned += earned
        
        wallet_response = requests.get(f"{BASE_URL}/api/wallet/{user_id}")
        balance = wallet_response.json()["balance"]
        print(f"✓ Step 3: Completed tasks - Earned {total_earned} MICO, Balance: {balance}")
        
        # Step 4: Browse character store
        store_response = requests.get(f"{BASE_URL}/api/character-store")
        items = store_response.json()["items"]
        print(f"✓ Step 4: Character store has {len(items)} items")
        
        # Step 5: Purchase a cheap item
        affordable_items = [item for item in items if item["base_price"] <= balance]
        
        if not affordable_items:
            print(f"⚠ Step 5: Skipped - No affordable items (balance: {balance})")
            return
        
        cheapest = min(affordable_items, key=lambda x: x["base_price"])
        purch_response = requests.post(f"{BASE_URL}/api/character/{user_id}/purchase", json={
            "item_id": cheapest["id"]
        })
        assert purch_response.status_code == 200
        print(f"✓ Step 5: Purchased '{cheapest['name']}' ({cheapest['category']}) for {cheapest['base_price']} MICO")
        
        # Step 6: Verify in inventory
        inv_response = requests.get(f"{BASE_URL}/api/character/{user_id}/inventory")
        inv_items = inv_response.json()["items"]
        item_ids = [item["id"] for item in inv_items]
        assert cheapest["id"] in item_ids
        print(f"✓ Step 6: Item verified in inventory ({len(inv_items)} total items)")
        
        # Step 7: Equip the item
        equip_response = requests.post(f"{BASE_URL}/api/character/{user_id}/equip", json={
            "item_id": cheapest["id"]
        })
        assert equip_response.status_code == 200
        print(f"✓ Step 7: Item equipped to {cheapest['category']} slot")
        
        # Step 8: Verify character has equipped item
        char_response = requests.get(f"{BASE_URL}/api/character/{user_id}")
        equipped = char_response.json()["character"].get("equipped_items", {})
        assert cheapest["category"] in equipped
        assert equipped[cheapest["category"]] == cheapest["id"]
        print(f"✓ Step 8: Character equipped_items verified")
        
        print("\n=== Full Flow Test Complete! ===")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
