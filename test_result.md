#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "LifeMicro - AI-powered life coach app with crypto rewards (MICO tokens), marketplace, and task generation"

backend:
  - task: "User Registration/Login via Device ID"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/users creates or retrieves user by device_id. Tested manually - working."

  - task: "User Preferences Update"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "PUT /api/users/{user_id} updates goals, productive_time, available_time. Tested manually."

  - task: "AI Task Generation"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/tasks/{user_id}/generate uses OpenAI via Emergent LLM key. Generates 3 personalized tasks."

  - task: "Task Completion with Token Rewards"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/tasks/complete awards tokens to wallet and updates streak."

  - task: "Task Skip"
    implemented: true
    working: NA
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: NA
        agent: "main"
        comment: "POST /api/tasks/skip marks task as skipped."

  - task: "Wallet Balance and Transactions"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/wallet/{user_id} returns balance, total_earned, streak, transactions."

  - task: "Marketplace Items"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/marketplace returns seeded marketplace items. Auto-seeds if empty."

  - task: "Marketplace Redemption"
    implemented: true
    working: NA
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: NA
        agent: "main"
        comment: "POST /api/marketplace/redeem burns tokens and returns reward code."

frontend:
  - task: "Welcome/Onboarding Screen"
    implemented: true
    working: true
    file: "/app/frontend/app/(onboarding)/welcome.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Beautiful welcome screen with app features. Screenshot verified."

  - task: "Goals Selection"
    implemented: true
    working: NA
    file: "/app/frontend/app/(onboarding)/goals.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: NA
        agent: "main"
        comment: "Multi-select goal cards (fitness, focus, business, etc.)"

  - task: "Time Preferences"
    implemented: true
    working: NA
    file: "/app/frontend/app/(onboarding)/time.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: NA
        agent: "main"
        comment: "Productive time and available time selection"

  - task: "Home/Tasks Screen"
    implemented: true
    working: NA
    file: "/app/frontend/app/(tabs)/home.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: NA
        agent: "main"
        comment: "Task cards with complete/skip, celebration modal, context question modal"

  - task: "Wallet Screen"
    implemented: true
    working: NA
    file: "/app/frontend/app/(tabs)/wallet.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: NA
        agent: "main"
        comment: "Balance display, transaction history, redemption history"

  - task: "Shop/Marketplace Screen"
    implemented: true
    working: NA
    file: "/app/frontend/app/(tabs)/shop.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: NA
        agent: "main"
        comment: "Item grid, category filter, redemption modal"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "User Registration/Login via Device ID"
    - "AI Task Generation"
    - "Task Completion with Token Rewards"
    - "Wallet Balance and Transactions"
    - "Marketplace Items"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "LifeMicro MVP implemented with: User management, AI task generation via OpenAI, token rewards, wallet, marketplace. All backend APIs tested manually. Frontend onboarding and tab screens created. Please test all backend endpoints comprehensively."
