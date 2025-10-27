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
    - **Session Security**: Non-persistent session cookies (`maxAge` removed), `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production, complete logout flow with `req.session.destroy()` and `res.clearCookie()`.
    - **Chat Room Isolation**: `chat_id` column added to `chat_messages` table for filtering, `getChatMessagesByChatId()` method, API accepts `chatId` parameter, WebSocket messages include `chatId`, frontend filters messages by `chatId`.
    - **Reports System**: 4-Dimensional Analysis (By Channel, By Date, By Team, By Agent) via `/api/reports/summary-tables` endpoint, returning 4 summary datasets with 15 key metrics, date range filtering, handling for orphaned customers/teams.

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