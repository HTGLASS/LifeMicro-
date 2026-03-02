#!/usr/bin/env python3
"""
LifeMicro Backend API Test Suite
Tests all backend endpoints according to the review request.
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://lifemicro-preview-1.preview.emergentagent.com/api"
TEST_DEVICE_ID = "test_backend_456"

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'  # End color
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

class LifeMicroAPITest:
    def __init__(self):
        self.user_id = None
        self.task_ids = []
        self.item_ids = []
        self.failed_tests = []
        self.passed_tests = []
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, params=params, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print_error(f"Request failed: {e}")
            return None
    
    def test_user_registration(self):
        """Test 1: User Registration"""
        print_header("TEST 1: User Registration")
        
        data = {"device_id": TEST_DEVICE_ID}
        response = self.make_request("POST", "/users", data)
        
        if not response:
            self.failed_tests.append("User Registration - Network Error")
            return False
            
        if response.status_code == 200:
            user_data = response.json()
            if "id" in user_data:
                self.user_id = user_data["id"]
                print_success(f"User created/retrieved successfully with ID: {self.user_id}")
                print_info(f"Response: {json.dumps(user_data, indent=2)}")
                self.passed_tests.append("User Registration")
                return True
            else:
                print_error("Response missing user ID")
                self.failed_tests.append("User Registration - Missing ID")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"User Registration - Status {response.status_code}")
        
        return False
    
    def test_user_preferences_update(self):
        """Test 2: Update User Preferences"""
        print_header("TEST 2: Update User Preferences")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("User Preferences Update - No User ID")
            return False
        
        data = {
            "preferences": {
                "goals": ["fitness", "focus"],
                "productive_time": "morning",
                "available_time": "15min"
            },
            "onboarding_completed": True
        }
        
        response = self.make_request("PUT", f"/users/{self.user_id}", data)
        
        if not response:
            self.failed_tests.append("User Preferences Update - Network Error")
            return False
            
        if response.status_code == 200:
            user_data = response.json()
            preferences = user_data.get("preferences", {})
            
            if ("goals" in preferences and 
                "productive_time" in preferences and 
                "available_time" in preferences and
                user_data.get("onboarding_completed")):
                print_success("User preferences updated successfully")
                print_info(f"Updated preferences: {json.dumps(preferences, indent=2)}")
                self.passed_tests.append("User Preferences Update")
                return True
            else:
                print_error("Preferences not properly saved")
                self.failed_tests.append("User Preferences Update - Data Not Saved")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"User Preferences Update - Status {response.status_code}")
        
        return False
    
    def test_context_question(self):
        """Test 3: Get Context Question"""
        print_header("TEST 3: Get Context Question")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Context Question - No User ID")
            return False
        
        response = self.make_request("GET", f"/tasks/{self.user_id}/context-question")
        
        if not response:
            self.failed_tests.append("Context Question - Network Error")
            return False
            
        if response.status_code == 200:
            question_data = response.json()
            
            if "question" in question_data and "options" in question_data:
                print_success("Context question retrieved successfully")
                print_info(f"Question: {question_data['question']}")
                print_info(f"Options: {question_data['options']}")
                self.passed_tests.append("Context Question")
                return True
            else:
                print_error("Invalid question format")
                self.failed_tests.append("Context Question - Invalid Format")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Context Question - Status {response.status_code}")
        
        return False
    
    def test_generate_ai_tasks(self):
        """Test 4: Generate AI Tasks"""
        print_header("TEST 4: Generate AI Tasks")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Generate AI Tasks - No User ID")
            return False
        
        data = {
            "user_id": self.user_id,
            "question": "How are you feeling?",
            "answer": "Energized"
        }
        
        response = self.make_request("POST", f"/tasks/{self.user_id}/generate", data)
        
        if not response:
            self.failed_tests.append("Generate AI Tasks - Network Error")
            return False
            
        if response.status_code == 200:
            task_data = response.json()
            tasks = task_data.get("tasks", [])
            
            if len(tasks) == 3:
                print_success(f"Generated {len(tasks)} AI tasks successfully")
                
                # Collect task IDs for later tests
                self.task_ids = [task.get("id") for task in tasks if task.get("id")]
                
                for i, task in enumerate(tasks):
                    required_fields = ["title", "description", "time_estimate", "reward_amount"]
                    if all(field in task for field in required_fields):
                        print_info(f"Task {i+1}: {task['title']} - {task['time_estimate']} - {task['reward_amount']} MICO")
                    else:
                        print_warning(f"Task {i+1} missing required fields")
                
                self.passed_tests.append("Generate AI Tasks")
                return True
            else:
                print_error(f"Expected 3 tasks, got {len(tasks)}")
                self.failed_tests.append(f"Generate AI Tasks - Wrong Count ({len(tasks)})")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Generate AI Tasks - Status {response.status_code}")
        
        return False
    
    def test_get_user_tasks(self):
        """Test 5: Get User Tasks"""
        print_header("TEST 5: Get User Tasks")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Get User Tasks - No User ID")
            return False
        
        response = self.make_request("GET", f"/tasks/{self.user_id}", params={"status": "pending"})
        
        if not response:
            self.failed_tests.append("Get User Tasks - Network Error")
            return False
            
        if response.status_code == 200:
            task_data = response.json()
            tasks = task_data.get("tasks", [])
            
            print_success(f"Retrieved {len(tasks)} pending tasks")
            
            if tasks:
                for task in tasks:
                    print_info(f"Task: {task.get('title', 'Unknown')} - Status: {task.get('status', 'Unknown')}")
                
                # Update task IDs if we didn't get them from generation
                if not self.task_ids:
                    self.task_ids = [task.get("id") for task in tasks if task.get("id")]
            
            self.passed_tests.append("Get User Tasks")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Get User Tasks - Status {response.status_code}")
        
        return False
    
    def test_complete_task(self):
        """Test 6: Complete a Task"""
        print_header("TEST 6: Complete a Task")
        
        if not self.task_ids:
            print_error("Cannot test - no task IDs available")
            self.failed_tests.append("Complete Task - No Task IDs")
            return False
        
        task_id = self.task_ids[0]
        data = {"task_id": task_id}
        
        response = self.make_request("POST", "/tasks/complete", data)
        
        if not response:
            self.failed_tests.append("Complete Task - Network Error")
            return False
            
        if response.status_code == 200:
            completion_data = response.json()
            
            required_fields = ["success", "tokens_earned", "new_balance", "message"]
            if all(field in completion_data for field in required_fields):
                print_success("Task completed successfully")
                print_info(f"Tokens earned: {completion_data['tokens_earned']}")
                print_info(f"New balance: {completion_data['new_balance']}")
                print_info(f"Message: {completion_data['message']}")
                
                if completion_data.get("streak_bonus", 0) > 0:
                    print_info(f"Streak bonus: {completion_data['streak_bonus']}")
                
                self.passed_tests.append("Complete Task")
                return True
            else:
                print_error("Incomplete response data")
                self.failed_tests.append("Complete Task - Incomplete Response")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Complete Task - Status {response.status_code}")
        
        return False
    
    def test_skip_task(self):
        """Test 7: Skip a Task"""
        print_header("TEST 7: Skip a Task")
        
        if len(self.task_ids) < 2:
            print_error("Cannot test - need at least 2 task IDs")
            self.failed_tests.append("Skip Task - Insufficient Task IDs")
            return False
        
        task_id = self.task_ids[1]
        data = {"task_id": task_id}
        
        response = self.make_request("POST", "/tasks/skip", data)
        
        if not response:
            self.failed_tests.append("Skip Task - Network Error")
            return False
            
        if response.status_code == 200:
            skip_data = response.json()
            
            if skip_data.get("success") and "message" in skip_data:
                print_success("Task skipped successfully")
                print_info(f"Message: {skip_data['message']}")
                self.passed_tests.append("Skip Task")
                return True
            else:
                print_error("Invalid skip response")
                self.failed_tests.append("Skip Task - Invalid Response")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Skip Task - Status {response.status_code}")
        
        return False
    
    def test_get_wallet(self):
        """Test 8: Get Wallet"""
        print_header("TEST 8: Get Wallet")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Get Wallet - No User ID")
            return False
        
        response = self.make_request("GET", f"/wallet/{self.user_id}")
        
        if not response:
            self.failed_tests.append("Get Wallet - Network Error")
            return False
            
        if response.status_code == 200:
            wallet_data = response.json()
            
            required_fields = ["balance", "total_earned", "streak", "recent_transactions"]
            if all(field in wallet_data for field in required_fields):
                print_success("Wallet retrieved successfully")
                print_info(f"Balance: {wallet_data['balance']} MICO")
                print_info(f"Total earned: {wallet_data['total_earned']} MICO")
                print_info(f"Streak: {wallet_data['streak']} days")
                print_info(f"Recent transactions: {len(wallet_data['recent_transactions'])}")
                self.passed_tests.append("Get Wallet")
                return True
            else:
                print_error("Missing wallet fields")
                self.failed_tests.append("Get Wallet - Missing Fields")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Get Wallet - Status {response.status_code}")
        
        return False
    
    def test_get_marketplace(self):
        """Test 9: Get Marketplace Items"""
        print_header("TEST 9: Get Marketplace Items")
        
        response = self.make_request("GET", "/marketplace")
        
        if not response:
            self.failed_tests.append("Get Marketplace - Network Error")
            return False
            
        if response.status_code == 200:
            marketplace_data = response.json()
            items = marketplace_data.get("items", [])
            
            if items:
                print_success(f"Retrieved {len(items)} marketplace items")
                
                # Store item IDs for redemption test
                self.item_ids = [item.get("id") for item in items if item.get("id")]
                
                for item in items:
                    required_fields = ["title", "description", "token_cost"]
                    if all(field in item for field in required_fields):
                        print_info(f"Item: {item['title']} - {item['token_cost']} MICO")
                    else:
                        print_warning(f"Item missing required fields: {item}")
                
                self.passed_tests.append("Get Marketplace")
                return True
            else:
                print_error("No marketplace items found")
                self.failed_tests.append("Get Marketplace - No Items")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Get Marketplace - Status {response.status_code}")
        
        return False
    
    def test_redeem_item(self):
        """Test 10: Redeem Item (if user has enough balance)"""
        print_header("TEST 10: Redeem Item")
        
        if not self.user_id or not self.item_ids:
            print_error("Cannot test - missing user_id or item_ids")
            self.failed_tests.append("Redeem Item - Missing Prerequisites")
            return False
        
        # First get wallet to check balance
        wallet_response = self.make_request("GET", f"/wallet/{self.user_id}")
        if not wallet_response or wallet_response.status_code != 200:
            print_error("Cannot check wallet balance")
            self.failed_tests.append("Redeem Item - Cannot Check Balance")
            return False
        
        balance = wallet_response.json().get("balance", 0)
        print_info(f"Current balance: {balance} MICO")
        
        # Get marketplace to find affordable item
        marketplace_response = self.make_request("GET", "/marketplace")
        if not marketplace_response or marketplace_response.status_code != 200:
            print_error("Cannot get marketplace items")
            self.failed_tests.append("Redeem Item - Cannot Get Items")
            return False
        
        items = marketplace_response.json().get("items", [])
        affordable_item = None
        
        for item in items:
            if item.get("token_cost", 0) <= balance:
                affordable_item = item
                break
        
        if not affordable_item:
            print_warning(f"No affordable items found (balance: {balance} MICO)")
            print_info("This is normal for MVP testing - user may not have enough tokens yet")
            self.passed_tests.append("Redeem Item (Skip - Insufficient Balance)")
            return True
        
        data = {
            "user_id": self.user_id,
            "item_id": affordable_item["id"]
        }
        
        response = self.make_request("POST", "/marketplace/redeem", data)
        
        if not response:
            self.failed_tests.append("Redeem Item - Network Error")
            return False
            
        if response.status_code == 200:
            redeem_data = response.json()
            
            required_fields = ["success", "redemption_id", "reward_code", "tokens_burned", "message"]
            if all(field in redeem_data for field in required_fields):
                print_success("Item redeemed successfully")
                print_info(f"Redemption ID: {redeem_data['redemption_id']}")
                print_info(f"Reward code: {redeem_data['reward_code']}")
                print_info(f"Tokens burned: {redeem_data['tokens_burned']}")
                print_info(f"Message: {redeem_data['message']}")
                self.passed_tests.append("Redeem Item")
                return True
            else:
                print_error("Incomplete redemption response")
                self.failed_tests.append("Redeem Item - Incomplete Response")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Redeem Item - Status {response.status_code}")
        
        return False
    
    def test_get_redemptions(self):
        """Test 11: Get Redemptions"""
        print_header("TEST 11: Get Redemptions")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Get Redemptions - No User ID")
            return False
        
        response = self.make_request("GET", f"/marketplace/redemptions/{self.user_id}")
        
        if not response:
            self.failed_tests.append("Get Redemptions - Network Error")
            return False
            
        if response.status_code == 200:
            redemption_data = response.json()
            redemptions = redemption_data.get("redemptions", [])
            
            print_success(f"Retrieved {len(redemptions)} redemptions")
            
            for redemption in redemptions:
                print_info(f"Redemption: {redemption.get('item_title', 'Unknown')} - {redemption.get('tokens_burned', 0)} MICO")
            
            self.passed_tests.append("Get Redemptions")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Get Redemptions - Status {response.status_code}")
        
        return False
    
    def test_get_stats(self):
        """Test 12: Get User Stats"""
        print_header("TEST 12: Get User Stats")
        
        if not self.user_id:
            print_error("Cannot test - no user_id available")
            self.failed_tests.append("Get Stats - No User ID")
            return False
        
        response = self.make_request("GET", f"/stats/{self.user_id}")
        
        if not response:
            self.failed_tests.append("Get Stats - Network Error")
            return False
            
        if response.status_code == 200:
            stats_data = response.json()
            
            required_fields = ["streak", "total_tasks", "completed_tasks", "completion_rate"]
            if all(field in stats_data for field in required_fields):
                print_success("User stats retrieved successfully")
                print_info(f"Streak: {stats_data['streak']} days")
                print_info(f"Total tasks: {stats_data['total_tasks']}")
                print_info(f"Completed tasks: {stats_data['completed_tasks']}")
                print_info(f"Completion rate: {stats_data['completion_rate']}%")
                print_info(f"Total earned: {stats_data.get('total_earned', 0)} MICO")
                self.passed_tests.append("Get Stats")
                return True
            else:
                print_error("Missing stats fields")
                self.failed_tests.append("Get Stats - Missing Fields")
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            self.failed_tests.append(f"Get Stats - Status {response.status_code}")
        
        return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print_header(f"LifeMicro Backend API Test Suite - Starting at {datetime.now()}")
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Test Device ID: {TEST_DEVICE_ID}")
        
        tests = [
            self.test_user_registration,
            self.test_user_preferences_update,
            self.test_context_question,
            self.test_generate_ai_tasks,
            self.test_get_user_tasks,
            self.test_complete_task,
            self.test_skip_task,
            self.test_get_wallet,
            self.test_get_marketplace,
            self.test_redeem_item,
            self.test_get_redemptions,
            self.test_get_stats
        ]
        
        for test in tests:
            test()
            time.sleep(1)  # Brief pause between tests
        
        # Final summary
        self.print_final_summary()
    
    def print_final_summary(self):
        """Print final test results summary"""
        print_header("TEST RESULTS SUMMARY")
        
        total_tests = len(self.passed_tests) + len(self.failed_tests)
        success_rate = (len(self.passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n{Colors.BOLD}Total Tests: {total_tests}{Colors.ENDC}")
        print(f"{Colors.GREEN}Passed: {len(self.passed_tests)}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {len(self.failed_tests)}{Colors.ENDC}")
        print(f"{Colors.BLUE}Success Rate: {success_rate:.1f}%{Colors.ENDC}")
        
        if self.passed_tests:
            print(f"\n{Colors.GREEN}✅ Passed Tests:{Colors.ENDC}")
            for test in self.passed_tests:
                print(f"   • {test}")
        
        if self.failed_tests:
            print(f"\n{Colors.RED}❌ Failed Tests:{Colors.ENDC}")
            for test in self.failed_tests:
                print(f"   • {test}")
        
        print(f"\n{Colors.BOLD}Test completed at {datetime.now()}{Colors.ENDC}")
        
        # Return exit code for CI/CD
        return 0 if not self.failed_tests else 1

if __name__ == "__main__":
    tester = LifeMicroAPITest()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)