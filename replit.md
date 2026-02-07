# PM Command Center - RFP Proposal Management Platform

## Overview
PM Command Center is a comprehensive platform for proposal managers to manage RFPs (Requests for Proposals) from state and federal governments. The application provides AI-powered analysis, collaborative response editing, budget management, and multi-stage review workflows.

## Key Features
- **RFP Upload & Preview**: Upload RFP documents with full document viewing and requirement highlighting
- **AI-Powered Analysis**: Uses GPT-5.2 to automatically extract requirements from RFP documents
- **Collaborative Response Editor**: Rich text editing with TipTap (fonts, headings, lists, highlights, alignment), document upload (PDF/Word), and export (Word/PDF/SharePoint)
- **Budget Spreadsheet**: Multi-year budget planning with editable hourly rates, role-based color coding, filter tabs, and export (Excel CSV/Word)
- **Template Management**: Reusable response templates organized by category
- **CRM Search**: Search existing proposals by various filters including consultant assignments
- **Review Workflow**: Multi-stage review process (Copy Editing → Budget Review → Final Submission)
- **Team Management**: View and manage team members with roles
- **Tasks Management**: View and manage assigned sections/tasks per RFP
- **AI Assistant Chatbot**: GPT-5.2 powered chat for proposal management assistance
- **Dashboard with Filters**: Status-based filtering (All, Draft, Analyzing, In Progress, Review, Submitted)

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations
- **State Management**: TanStack React Query

## Project Structure
```
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── budget-sheet.tsx
│   │   │   ├── document-viewer.tsx
│   │   │   ├── insights-panel.tsx
│   │   │   ├── requirements-panel.tsx
│   │   │   ├── response-editor.tsx
│   │   │   ├── rich-text-editor.tsx
│   │   │   ├── top-nav.tsx
│   │   │   ├── ai-chat.tsx
│   │   │   └── theme-*.tsx
│   │   ├── pages/          # Route pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── rfp-list.tsx
│   │   │   ├── rfp-new.tsx
│   │   │   ├── rfp-detail.tsx
│   │   │   ├── crm-search.tsx
│   │   │   ├── templates.tsx
│   │   │   ├── reviews.tsx
│   │   │   ├── team.tsx
│   │   │   └── tasks.tsx
│   │   └── App.tsx         # Main app with routing
│   └── index.html
├── server/
│   ├── index.ts            # Server entry
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   ├── db.ts               # Database connection
│   └── seed.ts             # Sample data seeding
├── shared/
│   └── schema.ts           # Drizzle schema + types
└── replit.md               # This file
```

## Database Schema
- **users**: Team members (PMs, Consultants, Copy Editors, Managing Directors)
- **rfps**: RFP documents with status tracking
- **requirements**: Extracted requirements linked to RFPs
- **templates**: Reusable response templates
- **responses**: Proposal response content
- **responseSections**: Response sections with assignments and locking
- **budgetItems**: Budget line items by user and year
- **insights**: AI-generated improvement suggestions
- **reviews**: Review workflow tracking

## User Roles
- **pm** (Proposal Manager): Full access, can lock sections
- **consultant**: Can edit assigned sections
- **copy_editor**: Reviews and edits for quality
- **managing_director**: Final approval authority

## Hourly Rates (Default)
- Principal: $250/hr
- Consultant: $175/hr
- Research Associate: $125/hr

## Design Theme
Professional navy/slate color theme with cyan accents for enterprise proposal management.

## API Endpoints
### RFPs
- `GET /api/rfps` - List all RFPs
- `GET /api/rfps/:id` - Get single RFP
- `POST /api/rfps` - Create RFP
- `PATCH /api/rfps/:id` - Update RFP
- `DELETE /api/rfps/:id` - Delete RFP
- `POST /api/rfps/:id/analyze` - AI analysis

### Requirements
- `GET /api/rfps/:id/requirements` - Get RFP requirements
- `PATCH /api/requirements/:id` - Update requirement

### Response & Sections
- `GET /api/rfps/:id/response` - Get response with sections
- `PATCH /api/rfps/:id/response` - Update response
- `POST /api/rfps/:id/response/sections` - Add section
- `PATCH /api/response-sections/:id` - Update section
- `DELETE /api/response-sections/:id` - Delete section

### Budget
- `GET /api/rfps/:id/budget` - Get budget items
- `POST /api/rfps/:id/budget` - Save budget items

### AI Insights
- `GET /api/rfps/:id/insights` - Get insights
- `POST /api/rfps/:id/insights` - Generate new insights
- `PATCH /api/insights/:id` - Mark insight resolved

### Reviews
- `GET /api/reviews` - List all reviews
- `POST /api/rfps/:id/reviews` - Create review
- `PATCH /api/reviews/:id` - Update review status

### Other
- `GET /api/users` - List team members
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PATCH /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `GET /api/rfps/search` - Search CRM
