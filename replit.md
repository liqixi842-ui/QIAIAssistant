# 动「QI」来 - 智能CRM系统

## Overview

动「QI」来 (Dong Qi Lai - "Get Moving") is an AI-powered intelligent CRM system designed for sales teams in financial and securities industries. It offers comprehensive customer relationship management, including customer tracking, task management, AI-powered sales recommendations, team collaboration, and analytics, aiming to boost conversion rates and customer engagement. The system balances professional enterprise functionality with a modern, energetic design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript
- Vite for building and development
- Wouter for routing
- TanStack React Query for server state management
- Framer Motion for animations

**UI Component System:**
- Radix UI primitives
- shadcn/ui design system ("new-york" style)
- Tailwind CSS for styling with custom themes
- Custom CSS variables for light/dark modes
- Responsive design optimized for desktop

**State Management:**
- React Query for server state
- React hooks for local component state
- react-hook-form with Zod for form state and validation

**Key Features:**
- **Authentication:** Login and registration.
- **Dashboard:** Metrics, AI recommendations, task lists.
- **Customer Management:** Detailed 18-field customer profiles with AI analysis support.
- **Scripts Library:** Simplified to focus on reusable sales scripts only (learning materials removed).
- **AI-Powered Task System:** Tasks with detailed completion guidance steps and recommended scripts.
- **Tasks & Kanban:** 10-stage customer lifecycle management with task detail modals.
- **Reports:** Analytics with charts.
- **Team Chat:** Internal messaging with organization-wide user search.
- **AI Chat:** Conversational AI assistance.
- **Team Management:** Equipment tracking and user management with role-based access.
- **Feedback:** Submission and tracking with role-based visibility.

**UI/UX Decisions:**
- Brand colors: White and gold (#D4AF37) using an HSL-based system.
- Hover and active state elevation effects.
- Enhanced dashboard welcome animation with bouncing characters.
- Customer detail dialog features split input boxes ("Our Messages", "Customer Reply") for AI context, supporting multilingual customer replies.

### Backend Architecture

**Runtime & Framework:**
- Node.js with Express.js
- TypeScript
- ESM module system

**Database Layer:**
- Drizzle ORM
- PostgreSQL via Neon serverless (prepared for integration)
- Schema-first approach with migrations
- Basic user schema with role, nickname, supervisorId, position, and team fields.

**Data Access Pattern:**
- `IStorage` interface abstraction for flexible storage implementation.

**API Design:**
- RESTful API with `/api` prefix.
- JSON format.
- Session-based authentication (prepared).
- Request logging middleware.

**Key Backend Features:**
- **User Authentication System:** Complete user schema with roles (后勤/业务/经理/总监/主管), pre-configured supervisor account, role hierarchy enforcement (e.g., directors under supervisor ID=7), and registration controls.
- **AI Analysis Integration:** Real AI-powered customer analysis with structured prompts returning actionable insights. Customer schema includes aiAnalysis field for persistent storage.
- **Task Management System:** 
  - Complete Tasks CRUD with PostgresStorage implementation
  - All endpoints enforce authentication and ownership validation
  - Schema validation using insertTaskSchema from drizzle-zod
  - API endpoints: GET/POST/PATCH /api/tasks with security controls
  - AI auto-generation: POST /api/tasks/auto-generate creates contextual tasks from customer data
  - Tasks schema with guidanceSteps[], script, priority fields
  - Status field uses English values (pending/active/completed)
- **Feedback System:** Universal access for submission and viewing, anonymous display for most roles, resolution tracking, and management controls for supervisors/directors.

## Recent Changes (2025-10-26)

1. **Reports System - 4-Dimensional Analysis Table (Latest)**:
   - **User Requirement**: Expanded from 2 to 4 dimensions based on explicit user requirement
   - **Backend API**: GET /api/reports/summary-tables endpoint
     - Returns 4 summary datasets: channelSummary, dateSummary, teamSummary, agentSummary
     - Date range filtering support (dateStart, dateEnd)
     - All 15 key metrics for each dimension
     - **Orphaned Customer Handling**: Customers with missing/deleted createdBy → "未知业务员"
     - **Team Fallback Handling**: Customers whose creators lack team → "未知团队"
   - **Frontend ReportsPage**:
     - Single table component with dimension selector
     - **Four dimensions**: 按渠道 (By Channel), 按日期 (By Date), 按团队 (By Team), 按业务员 (By Agent)
     - All 15 metrics displayed for each dimension
     - Date range filter for temporal analysis
     - **Data Integrity**: All dimensions show complete data with no loss
   - **Key Implementation Details**:
     - Agent list derived from actual customer creator IDs (not role-based filtering)
     - Team list includes "未知团队" for customers without team assignment
     - Date aggregation groups by customer creation date
     - Verified data consistency across all 4 dimensions
   - **Design Philosophy**: Simple dimension-switchable view with complete, accurate data across 4 key business perspectives

2. **AI Recommended Scripts - Full Chinese Output**:
   - Modified AI prompts to generate 100% Chinese scripts regardless of customer nationality
   - Updated cultural insight examples to show Chinese-only communication templates
   - Business requirement: Sales staff can only read Chinese, so all scripts must be in Chinese
   - Fixed recommendedScript storage bug in server/storage.ts updateCustomer method

3. **15 Key Metrics** (Used across all reports):
   1. total (进线) - Total customers
   2. readNoReply (已读不回) - Read but no reply
   3. noReadNoReply (不读不回) - No read no reply
   4. joinedGroup (进群) - Joined group
   5. answeredCall (接电话) - Answered call
   6. investor (股民) - Investor type
   7. beginner (小白) - Beginner type
   8. followStock (跟票) - Following stocks
   9. hotChat (热聊) - Hot conversation (3+ messages)
   10. repliedToday (当日回复) - Replied today
   11. stockTracking (持股跟踪) - Stock holding tracking
   12. sincere (走心) - Engaged/sincere
   13. openedAccount (开户) - Opened account
   14. firstDeposit (首冲) - First deposit
   15. addedFunds (加金) - Added funds

4. **Previous Session (2025-01-25)**:
   - Complete Frontend-Backend Integration for Tasks
   - AI Auto-Generate Tasks Feature
   - Data Flow Alignment fixes

## External Dependencies

**Database:**
- Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- `ws` package for WebSocket support

**UI Libraries:**
- Radix UI (multiple packages)
- Recharts for data visualization
- Lucide React for iconography
- cmdk for command palette

**Validation & Forms:**
- Zod for schema validation
- react-hook-form for form management
- @hookform/resolvers for validation integration
- drizzle-zod for database schema validation

**Styling:**
- Tailwind CSS
- class-variance-authority
- tailwind-merge, clsx

**Development:**
- tsx for TypeScript execution
- esbuild for production builds
- Replit-specific development tooling (`@replit/vite-plugin-*`)

**Session Management:**
- connect-pg-simple (prepared for PostgreSQL session store)

**Utilities:**
- date-fns for date manipulation
- nanoid for unique ID generation
- framer-motion for animations