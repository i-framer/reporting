# DataDeck - MySQL Reporting Dashboard

## Overview

DataDeck is a MySQL reporting and visualization application that allows users to connect to MySQL databases, write SQL queries, and build interactive dashboards with charts and tables. The application includes an AI assistant powered by OpenAI for natural language database querying.

**Core Features:**
- Connect to external MySQL databases and manage data sources
- SQL editor with syntax highlighting for writing and saving queries
- Dashboard builder with support for tables, bar charts, and line charts
- AI assistant that can translate natural language to SQL and execute queries
- Custom Framer ID authentication with two access levels (framer-specific and admin)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18 with TypeScript, Vite bundler, TanStack Query for data fetching

**UI Framework:** shadcn/ui component library built on Radix UI primitives with Tailwind CSS. The design system uses a blue/slate color palette with custom CSS variables for theming (light/dark mode support).

**Routing:** Uses wouter (lightweight router) for client-side navigation. Main routes include dashboard categories, individual dashboard views, query editor, data sources management, and AI assistant.

**State Management:** 
- Server state managed via TanStack Query with custom hooks (`use-dashboards.ts`, `use-queries.ts`, `use-data-sources.ts`, `use-mysql.ts`)
- Local UI state with React useState
- Authentication state via `use-auth.ts` hook

**Key Components:**
- `SqlEditor` - Code editor using react-simple-code-editor with Prism.js syntax highlighting
- `ResultsTable` - Scrollable data table for query results
- `Sidebar` - Navigation component with dashboard categories and tool links
- Chart components using Recharts (BarChart, LineChart)

### Backend Architecture

**Technology Stack:** Express.js with TypeScript, running on Node.js

**Database:** 
- PostgreSQL for application data (users, dashboards, queries, reports, sessions)
- Drizzle ORM for database operations with Zod schema validation
- External MySQL connections for user data sources (using mysql2 driver)

**API Design:** RESTful API with typed contracts defined in `shared/routes.ts`. All API routes use Zod schemas for request/response validation. The API contract is shared between frontend and backend for type safety.

**Authentication:** Custom Framer ID authentication system (server/customAuth.ts). Two access modes:
- **Framer login:** User enters their FramerID from the external MySQL database. Queries are restricted to their data (sale, customer, job, saleline tables filtered by FramerID).
- **Administration login:** Full access to all data without FramerID filtering.
Session management via express-session with PostgreSQL session store (connect-pg-simple).
Server-side enforcement blocks non-admin queries on framer-specific tables that don't include the user's FramerID.

Operational portal SSO details and the incident handoff checklist are in
[docs/portal-sso-handoff.md](docs/portal-sso-handoff.md).

**AI Integration:** OpenAI API (via Replit AI Integrations) for the natural language SQL assistant. The AI can generate SQL queries from plain English and execute them against connected MySQL databases.

### Data Storage

**PostgreSQL Tables (managed by Drizzle):**
- `users` - User profiles from Replit Auth
- `sessions` - Session storage for authentication
- `data_sources` - MySQL connection configurations (host, user, password, database, port stored as JSONB)
- `saved_queries` - User's saved SQL queries with name, description, and associated data source
- `dashboards` - Dashboard containers with name and description
- `reports` - Dashboard widgets/visualizations with chart type and configuration
- `conversations` / `messages` - AI chat history storage

**Security Note:** MySQL credentials are stored in the database. The seed script automatically configures the default data source from environment variables.

**Query Placeholder System:**
- Saved queries can use `{{FRAMER_ID}}` placeholder for automatic FramerID filtering
- For framer users: placeholder is replaced with their actual FramerID
- For admin users: placeholder condition is replaced with `1=1` tautology (returns all data)
- Server-side enforcement ensures framers can only query their own data

**Query Timeout Protection:**
- MySQL queries have a 30-second timeout via `SET SESSION MAX_EXECUTION_TIME`
- Additional 35-second Promise.race wrapper as failsafe
- Prevents hung queries from blocking the server

### Build System

**Development:** Vite dev server with HMR, proxied through Express for API routes

**Production Build:** 
- Client: Vite builds to `dist/public`
- Server: esbuild bundles to `dist/index.cjs` with selected dependencies bundled for faster cold starts
- Custom build script in `script/build.ts`

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required for application database)
- `SESSION_SECRET` - Secret for session encryption
- `REPL_ID` - Replit environment identifier (for auth)
- `ISSUER_URL` - OpenID Connect issuer URL (defaults to Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key for AI assistant
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL (Replit AI proxy)

### Optional MySQL Environment Variables (for default data source)
- `MYSQL_HOST` - MySQL server hostname
- `MYSQL_PORT` - MySQL server port (default: 3306)
- `MYSQL_USER` - MySQL username
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - MySQL database name

### Third-Party Services
- **Custom Framer Auth** - Authentication via FramerID from external MySQL database (framer table)
- **OpenAI API** - Powers the AI SQL assistant (model: gpt-4.1 via Replit AI Integrations)
- **PostgreSQL** - Application database (Replit provisioned)
- **External MySQL** - User's data sources for querying (Frame Visualiser database)

### Key NPM Dependencies
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `mysql2` - MySQL client for external database connections
- `openai` - OpenAI API client
- `passport` / `openid-client` - Authentication
- `recharts` - Chart visualizations
- `react-simple-code-editor` / `prismjs` - SQL code editor with highlighting
- `jspdf` / `jspdf-autotable` - PDF export for query reports