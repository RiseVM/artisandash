# Artisan Tile Project Tracker - Build Prompts for Claude in Replit

Use these prompts in order. Wait for Claude to complete each step before moving to the next. Test as you go.

---

## Phase 1: Setup & Understanding

### Prompt 1.1 - Read the Plan
```
Read the files artisan-tile-client-portal-v2.md and artisan-tile-implementation-v2.md in this project. These contain the full plan for adding a client portal and customizable project tracker. Summarize what you understand about what we're building.
```

### Prompt 1.2 - Analyze Existing Code
```
Now analyze my existing codebase. Look at:
1. The database schema - what tables exist, how are they structured
2. The backend structure - routes, controllers, services patterns
3. The frontend structure - component organization, styling approach
4. How authentication works for the admin side

Give me a summary of the patterns and conventions I'm already using so we can match them.
```

### Prompt 1.3 - Integration Plan
```
Based on the PRD and my existing code structure, create a brief integration plan. How will the new project tracker tables relate to my existing clients table? What existing patterns will we reuse? Are there any potential conflicts or things we need to be careful about?
```

---

## Phase 2: Database

### Prompt 2.1 - Core Tables Migration
```
Create the database migration for the core project tracker tables following my existing migration patterns:
- project_templates
- phase_templates  
- task_templates
- projects
- project_phases
- project_tasks

Include all columns from the PRD schema. Add appropriate indexes.
```

### Prompt 2.2 - Run and Verify
```
Run the migration. Then show me how to verify the tables were created correctly.
```

### Prompt 2.3 - Custom Fields Tables
```
Create the migration for custom fields:
- custom_field_definitions
- custom_field_values

These allow admins to add flexible data capture to projects and phases.
```

### Prompt 2.4 - Supporting Tables
```
Create migrations for the remaining tables:
- project_deliveries
- change_orders
- out_of_scope_items
- time_entries
- project_line_items
- project_payments
- project_files
- project_updates
- client_portal_access
- client_feedback

Do these one migration file at a time or grouped logically.
```

---

## Phase 3: Backend - Projects & Phases

### Prompt 3.1 - Project Types
```
Create the TypeScript types/interfaces for:
- Project
- Phase
- Task
- All related types (status enums, etc.)

Put them in the appropriate types file following my existing patterns.
```

### Prompt 3.2 - Project Service
```
Create a project service with methods for:
- list (with filtering by status, client)
- getById (with phases and tasks populated)
- create (optionally from template)
- update
- archive

Follow my existing service patterns.
```

### Prompt 3.3 - Phase Service
```
Create a phase service with methods for:
- addPhase (to a project)
- updatePhase
- deletePhase
- reorderPhases
- completePhase

Include logic to update project progress when phases change.
```

### Prompt 3.4 - Task Service
```
Create a task service with methods for:
- addTask (to a phase)
- updateTask
- deleteTask
- completeTask
- reorderTasks

Include logic to update phase progress when tasks change.
```

### Prompt 3.5 - Progress Service
```
Create a progress calculation service that:
- Calculates phase progress from tasks
- Calculates project progress from phases
- Updates current_phase_id when phases complete
- Has a recalculateAll method for bulk updates

Reference the progressService.ts example in the implementation guide.
```

### Prompt 3.6 - Project Routes
```
Create the admin API routes for projects:
- GET /api/admin/projects (list with filters)
- POST /api/admin/projects (create)
- GET /api/admin/projects/:id (detail)
- PUT /api/admin/projects/:id (update)
- DELETE /api/admin/projects/:id (archive)

Include routes for phases and tasks as sub-resources.
```

### Prompt 3.7 - Test the API
```
Help me test the project API. Create a simple test that:
1. Creates a new project
2. Adds 3 phases to it
3. Adds tasks to each phase
4. Completes some tasks
5. Verifies progress calculates correctly
```

---

## Phase 4: Backend - Templates

### Prompt 4.1 - Template Service
```
Create a template service for project templates:
- list
- getById (with phase and task templates)
- create
- update
- delete
- duplicate
- createProjectFromTemplate

The createProjectFromTemplate method should copy all phases, tasks, and custom field definitions.
```

### Prompt 4.2 - Template Routes
```
Create admin API routes for templates:
- GET /api/admin/templates
- POST /api/admin/templates
- GET /api/admin/templates/:id
- PUT /api/admin/templates/:id
- DELETE /api/admin/templates/:id
- POST /api/admin/templates/:id/duplicate
```

### Prompt 4.3 - Seed Default Template
```
Create a seed file with one default template called "General Renovation" with these phases:
1. Initial Consultation (tasks: Site visit, Measurements, Quote)
2. Design & Selection (tasks: Material selection, Design review, Client approval)
3. Ordering (tasks: Place orders, Track shipments, Confirm delivery)
4. Installation (tasks: Prep work, Installation, Quality check)
5. Completion (tasks: Final walkthrough, Client sign-off)

This gives Artisan Tile a starting point they can customize.
```

---

## Phase 5: Frontend - Admin Project Management

### Prompt 5.1 - Project List Page
```
Create the admin project list page that shows:
- All projects in a list/table format
- Status, client name, progress bar, current phase
- Filters for status
- Search by project or client name
- Link to create new project

Follow my existing page and component patterns.
```

### Prompt 5.2 - Project Detail Page
```
Create the admin project detail page with:
- Header showing project name, client info, status, overall progress
- Tabs for: Phases, Deliveries, Change Orders, Time, Pricing, Files, Activity
- For now just implement the Phases tab, we'll add others later

The Phases tab should show all phases with their tasks.
```

### Prompt 5.3 - Phase Manager Component
```
Create the PhaseManager component that:
- Shows all phases in order with drag-to-reorder
- Expands/collapses to show tasks
- Has checkboxes to complete tasks
- Shows progress per phase
- Has buttons to add phase, add task, edit phase settings
- Shows badges for "Approval Required" and "Internal Only"

Reference the PhaseManager example in the implementation guide.
```

### Prompt 5.4 - Phase Settings Modal
```
Create a modal for editing phase settings:
- Phase name
- Description
- Client visible toggle
- Requires approval toggle
- Estimated start/end dates
- Delete phase button

This opens when clicking the settings icon on a phase.
```

### Prompt 5.5 - New Project Flow
```
Create the new project creation flow:
1. Choose: Start blank OR Start from template (dropdown of templates)
2. Enter: Project name, client (select from existing), address, description
3. If blank: Add initial phases or start empty
4. If from template: Show preview of phases that will be created
5. Create button

After creation, redirect to the project detail page.
```

---

## Phase 6: Files & Updates

### Prompt 6.1 - File Upload Service
```
Create a file upload service that:
- Handles file uploads to local storage (or S3 if configured)
- Generates thumbnails for images
- Returns file URL and metadata
- Supports associating files with project, phase, task, etc.

Follow my existing file handling patterns if any exist.
```

### Prompt 6.2 - File Management Routes
```
Create file management routes:
- POST /api/admin/projects/:id/files (upload)
- GET /api/admin/projects/:id/files (list)
- PUT /api/admin/files/:id (update metadata)
- DELETE /api/admin/files/:id (delete)
```

### Prompt 6.3 - Files Tab UI
```
Add the Files tab to the project detail page:
- Grid view of files organized by category
- Upload button with drag-and-drop zone
- File cards showing name, thumbnail (for images), upload date
- Click to view/download
- Toggle visibility (client can see / internal only)
- Categories: Contracts, Design, Selections, Photos, Invoices, Warranties, Other
```

### Prompt 6.4 - Project Updates Service
```
Create a project updates/activity service that:
- Logs all project activity (status changes, files added, messages, etc.)
- Supports different update types
- Tracks read/unread status
- Filters internal vs client-visible updates
```

### Prompt 6.5 - Activity Tab
```
Add an Activity tab to project detail that shows:
- Chronological feed of all updates
- Filter by type (all, notes, files, status changes)
- Toggle to show/hide internal notes
- Ability to add a new note/update
```

---

## Phase 7: Deliveries

### Prompt 7.1 - Delivery Service
```
Create a delivery service with:
- list (by project, with optional status filter)
- create
- update
- delete
- updateStatus (with optional delay reason)
```

### Prompt 7.2 - Delivery Routes
```
Create delivery routes:
- GET /api/admin/projects/:id/deliveries
- POST /api/admin/projects/:id/deliveries
- PUT /api/admin/deliveries/:id
- DELETE /api/admin/deliveries/:id
- GET /api/admin/deliveries (all deliveries dashboard)
```

### Prompt 7.3 - Deliveries Tab UI
```
Add the Deliveries tab to project detail:
- List of deliveries grouped by status (Delayed, Upcoming, Completed)
- Each shows description, vendor, expected date, status badge
- Click to edit
- Add delivery button
- Status can be: Ordered, Shipped, In Transit, Delivered, Delayed, Cancelled
```

### Prompt 7.4 - Delivery Form Modal
```
Create a modal for adding/editing deliveries:
- Description (required)
- Vendor
- Expected date (required)
- Actual date (for delivered items)
- Status dropdown
- Tracking number
- Carrier
- Cost
- Link to phase (optional dropdown)
- Notes
- Delay reason (shows if status is Delayed)
- Client visible toggle
```

---

## Phase 8: Change Orders

### Prompt 8.1 - Change Order Service
```
Create a change order service with:
- list (by project)
- create (auto-generates CO number per project)
- update
- sendToClient (changes status to pending_approval)
- approve (with signature data)
- reject (with reason)
- void
```

### Prompt 8.2 - Change Order Routes
```
Create change order routes:
- GET /api/admin/projects/:id/change-orders
- POST /api/admin/projects/:id/change-orders
- GET /api/admin/change-orders/:id
- PUT /api/admin/change-orders/:id
- POST /api/admin/change-orders/:id/send
- POST /api/admin/change-orders/:id/void
```

### Prompt 8.3 - Change Orders Tab UI
```
Add the Change Orders tab to project detail:
- List of all change orders with CO number, title, cost impact, status
- Status badges: Draft, Pending Approval, Approved, Rejected, Void
- Click to view/edit
- Add change order button
- Show total cost impact at top
```

### Prompt 8.4 - Change Order Detail/Form
```
Create the change order form/detail view:
- CO number (auto, read-only)
- Title
- Description (rich text or textarea)
- Reason dropdown (Client Request, Unforeseen Condition, Design Change, etc.)
- Cost impact (can be negative)
- Time impact (text field)
- Linked phase (optional)
- File attachments
- Internal notes
- Status
- Actions: Save Draft, Send to Client, Void
- If approved: show signature and date
```

### Prompt 8.5 - Signature Capture Component
```
Create a reusable SignatureCapture component that:
- Shows a canvas for drawing signature
- Has Clear and Accept buttons
- Returns base64 signature data
- Can be used for change orders and phase approvals
```

---

## Phase 9: Additional Modules

### Prompt 9.1 - Out of Scope
```
Add out of scope tracking:
- Service with CRUD methods
- Routes for the project
- Tab in project detail showing list of excluded items
- Form to add/edit items with: Item, Reason, Client Acknowledged checkbox
```

### Prompt 9.2 - Time Tracking
```
Add time tracking:
- Service with CRUD and summary methods
- Routes for the project
- Tab in project detail showing time entries
- Group by date, show team member, hours, category, description
- Add entry form
- Summary at top (total hours, billable hours)
- Toggle for client visibility per entry
```

### Prompt 9.3 - Pricing Tab
```
Add the Pricing tab with:
- Budget summary (original estimate, change orders, current total)
- Line items editor (add/edit/remove line items)
- Categories: Materials, Labor, Other
- Payment schedule (add/edit payments with status)
- Total paid vs balance due
```

---

## Phase 10: Client Portal

### Prompt 10.1 - Portal Auth
```
Create client portal authentication:
- Separate JWT from admin auth
- Login endpoint: POST /api/portal/login
- Password reset flow
- Middleware to verify portal token and load client + project access
- Portal access is per-project (a client may have multiple projects)
```

### Prompt 10.2 - Portal Access Management
```
Add to admin project detail:
- "Manage Portal Access" button
- Shows if portal is enabled for this client
- Can send invite email
- Can reset password
- Settings: show pricing, show time tracking
```

### Prompt 10.3 - Portal Dashboard
```
Create the client portal pages:
- Login page (simple, branded)
- Dashboard showing:
  - Project name and address
  - Overall progress bar
  - Current phase
  - Estimated completion
  - Action items (pending approvals)
  - Recent updates
  - Upcoming deliveries
```

### Prompt 10.4 - Portal Progress View
```
Create the portal progress/phases view:
- Visual timeline or list of phases
- Only show phases marked client_visible
- Expand to see tasks (only client_visible ones)
- Completed items show dates
- Current phase highlighted
```

### Prompt 10.5 - Portal Files & Photos
```
Create portal document and photo views:
- Only show files marked client_visible
- Photos in gallery view
- Documents in list by category
- Download button for each
```

### Prompt 10.6 - Portal Change Order Approval
```
Create the change order approval flow in portal:
- List pending approvals
- View change order details
- Approve button opens signature capture
- Reject button asks for reason
- Confirmation after action
```

### Prompt 10.7 - Portal Messaging
```
Add messaging to the portal:
- Simple message thread view
- Client can send messages
- Shows updates/messages from admin
- Mark as read functionality
```

---

## Phase 11: Notifications

### Prompt 11.1 - Email Service
```
Create an email service that:
- Sends emails using [Resend/SendGrid/your provider]
- Has templates for: Portal invite, Password reset, New update, Approval needed
- Logs sent emails
```

### Prompt 11.2 - Notification Triggers
```
Add notification triggers for:
- Portal invite sent
- New update posted (if client has email notifications on)
- Change order needs approval
- Delivery status changed (optional)
- Phase completed (optional)

Make these configurable per portal access.
```

---

## Phase 12: Polish & Testing

### Prompt 12.1 - Mobile Responsive
```
Review all new pages and components for mobile responsiveness. Fix any issues with:
- Project list
- Project detail tabs
- Phase manager
- Portal dashboard
- Portal progress view

Make sure touch targets are large enough and layouts stack properly.
```

### Prompt 12.2 - Error Handling
```
Review and improve error handling:
- API error responses are consistent
- Frontend shows user-friendly error messages
- Network errors are handled gracefully
- Form validation is clear
```

### Prompt 12.3 - Loading States
```
Add proper loading states to:
- Project list
- Project detail (each tab)
- Portal dashboard
- File uploads (progress indicator)
```

### Prompt 12.4 - End-to-End Test
```
Help me manually test the full flow:
1. Create a project template
2. Create a project from that template
3. Add and complete some tasks
4. Add a delivery
5. Create and send a change order
6. Set up portal access for client
7. Log into portal as client
8. Approve the change order
9. Send a message

Document any bugs we find.
```

---

## Notes

- **Don't skip steps** - Each prompt builds on the previous
- **Test after each phase** - Make sure it works before moving on
- **Adjust prompts** - If Claude needs more context about your specific code, add it
- **Save your work** - Commit after each working phase

Good luck! 🚀
