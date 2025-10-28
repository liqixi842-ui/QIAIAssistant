# 动「QI」来 - 智能CRM系统

## Overview
动「QI」来 (Dong Qi Lai - "Get Moving") is an AI-powered intelligent CRM system designed for sales teams in financial and securities industries. It offers comprehensive customer relationship management, including customer tracking, task management, AI-powered sales recommendations, team collaboration, and analytics, aiming to boost conversion rates and customer engagement. The system balances professional enterprise functionality with a modern, energetic design.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Tooling**: React 18 with TypeScript, Vite, Wouter for routing, TanStack React Query for server state management, Framer Motion for animations.
- **UI Component System**: Radix UI primitives, shadcn/ui design system ("new-york" style), Tailwind CSS for styling with custom themes, custom CSS variables for light/dark modes, responsive design.
- **State Management**: React Query for server state, React hooks for local component state, react-hook-form with Zod for form state and validation.
- **Key Features**: Authentication, Dashboard with AI recommendations, 18-field Customer Management with AI analysis, Scripts Library, AI-Powered Task System, 10-stage Kanban Task management, Analytics Reports, Team Chat, AI Chat, Team Management (equipment/user/role-based access), Feedback system.
- **UI/UX Decisions**: White and gold (#D4AF37) brand colors, elevation effects, enhanced dashboard animations, customer detail dialog with split input boxes for AI context supporting multilingual replies.

### Backend Architecture
- **Runtime & Framework**: Node.js with Express.js, TypeScript, ESM module system.
- **Database Layer**: Drizzle ORM, PostgreSQL via Neon serverless, schema-first approach, basic user schema with role, nickname, supervisorId, position, and team fields.
- **Data Access Pattern**: `IStorage` interface abstraction.
- **API Design**: RESTful API (`/api` prefix), JSON format, session-based authentication, request logging.
- **Key Backend Features**:
    - **User Authentication System**: Complete user schema with roles (后勤/业务/经理/总监/主管), pre-configured supervisor account (ID=7), role hierarchy enforcement, and registration controls.
    - **AI Analysis Integration**: Real AI-powered customer analysis with structured prompts returning actionable insights, `aiAnalysis` field in customer schema.
    - **Task Management System**: Full CRUD for tasks with PostgresStorage, authentication/ownership validation, `drizzle-zod` schema validation, AI auto-generation of tasks from customer data, tasks schema with `guidanceSteps`, `script`, `priority` fields, English status values.
    - **Feedback System**: Universal access for submission/viewing, anonymous display for most roles, resolution tracking, management controls for supervisors/directors.
    - **Registration System Overhaul**: Requires only nickname, enforces alphanumeric username (`/^[a-zA-Z0-9]+$/`), strict role hierarchy enforcement for supervisor assignments, dynamic frontend hints, security against API bypass.
    - **Registration UX Enhancement**: `/api/auth/supervisors` public endpoint provides dropdown of supervisors (managers/directors/supervisors) filtered by role hierarchy, displays nickname + role, submits UUID; auto-clears on role change.
    - **Session Security**: Non-persistent session cookies (`maxAge` removed), `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production, complete logout flow with `req.session.destroy()` and `res.clearCookie()`.
    - **Chat Room Isolation**: `chat_id` column added to `chat_messages` table for filtering, `getChatMessagesByChatId()` method, API accepts `chatId` parameter, WebSocket messages include `chatId`, frontend filters messages by `chatId`.
    - **Reports System**: 4-Dimensional Analysis (By Channel, By Date, By Team, By Agent) via `/api/reports/summary-tables` endpoint, returning 4 summary datasets with 15 key metrics, date range filtering, handling for orphaned customers/teams.
    - **Team Management Enhancement**: Reads logged-in user from localStorage instead of default props, ensuring team members can view/edit their own equipment and see themselves in the team list. ID-based filtering (not name-based) ensures business users always see their own row. Equipment editing fully implemented via `PATCH /api/users/:id/equipment` endpoint.
    - **Chat System Enhancements**: 
        - **Message Persistence**: `POST /api/chat/messages` API saves messages to database before WebSocket broadcast, preventing message loss on refresh.
        - **Auto-Reconnection**: WebSocket implements exponential backoff reconnection (up to 10 attempts), allowing offline message sending.
        - **Read Status**: `PATCH /api/chats/:chatId/read` API with `markChatAsRead()` storage method tracks unread messages accurately.
        - **Direct Chat Naming**: Private chats automatically named with counterpart's nickname (resolves "未命名通话" issue).
        - **Reliable Delivery**: Messages persist even when recipient is offline, visible upon their next login.
    - **Hierarchical Permission System**: Complete role-based data access control across all modules (except team chat which remains accessible to all users):
        - **业务 (Salesperson)**: Access only to own customers, tasks, and dashboard statistics.
        - **经理 (Manager)**: Access to own data + direct subordinates' data.
        - **总监 (Director)**: Access to own data + managers' data + managers' subordinates' data (2-level hierarchy).
        - **主管 (Supervisor)**: Full access to all data across the organization.
        - **Implementation**: `getCustomersByUser()` and `getAuthorizedUserIds()` helper methods enforce hierarchy in Dashboard stats, Customer pages, and Reports pages; `/api/customers`, `/api/dashboard/stats`, `/api/reports`, and `/api/reports/summary-tables` endpoints correctly apply user context before filtering; team chat pages exempt from restrictions.
        - **Fix (Oct 28)**: Reports summary-tables endpoint now correctly passes `userId` and `userRole` to `getReportsData()`, ensuring supervisors can view all subordinate data.
    - **WhatsApp Chat History Upload** (Oct 28):
        - **Parser**: `parseWhatsAppChat()` function supports format `[DD/MM/YY HH:MM:SS] Sender: Message`, normalizes all line break formats (\r\n, \n, \r), handles multi-line messages, filters system messages, returns array of {timestamp, sender, message} objects.
        - **AI Role Detection**: `identifyRolesWithAI()` analyzes conversations to distinguish customer vs agent messages based on tone and content, with schema validation to prevent prompt injection attacks.
        - **API**: `POST /api/customers/:id/upload-chat` receives chat text, parses it, identifies roles using AI, and stores in `conversations` JSONB field.
        - **Frontend**: Upload button in Customer Details dialog (Conversation tab), modal with textarea for pasting chat history, displays imported conversations as individual message bubbles with role-based styling (agent: right-aligned primary, customer: left-aligned muted).
        - **Database**: Added `conversations` field to `updateCustomer()` method in PostgresStorage, conversations stored as JSONB array with {timestamp, sender, role, message} structure.
    - **Knowledge Base Integration for AI Scripts** (Oct 28):
        - **Knowledge Base API**: `GET /api/knowledge-base` aggregates all learning materials by category with titles and metadata for AI reference.
        - **AI Script Enhancement**: `generateSalesScript()` function now queries knowledge base and includes material titles in prompt context, enabling AI to reference professional resources when generating sales recommendations.
        - **Auto-Learning**: AI automatically incorporates available learning materials (grouped by category) into script generation, making recommendations more professional and data-backed.

## External Dependencies

**Database:**
- Neon Serverless PostgreSQL (`@neondatabase/serverless`)

**Real-time Communication:**
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
- @replit/vite-plugin-* (Replit-specific tooling)

**Session Management:**
- connect-pg-simple (prepared for PostgreSQL session store)

**Utilities:**
- date-fns for date manipulation
- nanoid for unique ID generation
- framer-motion for animations