# Artisan Tile Project Tracker & Client Portal

A comprehensive project management system with customizable phases, client portal, and real-time progress tracking.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Pages](#frontend-pages)
- [Client Portal](#client-portal)
- [Email Notifications](#email-notifications)
- [Configuration](#configuration)

---

## Overview

The Project Tracker system allows Artisan Tile to:

- Create and manage projects with customizable phases and tasks
- Track progress automatically as tasks are completed
- Use templates to quickly create standardized projects
- Give clients portal access to view progress and approve changes
- Track deliveries, change orders, time, and pricing
- Manage files and photos with Google Drive integration
- Send automated email notifications

---

## Features

### Project Management

| Feature | Description |
|---------|-------------|
| **Projects** | Create projects linked to customers with status tracking |
| **Phases** | Break projects into phases (drag-to-reorder supported) |
| **Tasks** | Add tasks to phases with checkbox completion |
| **Progress** | Auto-calculated from task/phase completion |
| **Templates** | Create reusable project templates |

### Financial Tracking

| Feature | Description |
|---------|-------------|
| **Change Orders** | Track scope changes with approval workflow |
| **Time Tracking** | Log billable/non-billable hours |
| **Line Items** | Itemized pricing by category |
| **Payments** | Track payment schedule and status |
| **Deliveries** | Track material orders and shipments |

### Client Portal

| Feature | Description |
|---------|-------------|
| **Separate Auth** | Clients log in with their own credentials |
| **Progress View** | See project phases and tasks (client-visible only) |
| **Change Order Approval** | Sign and approve changes digitally |
| **File Access** | View project photos and documents |
| **Messaging** | Two-way communication with admin |
| **Feedback** | Submit ratings and comments |

### Additional Features

| Feature | Description |
|---------|-------------|
| **Out of Scope** | Document excluded items with client acknowledgment |
| **Custom Fields** | Flexible data capture on projects/phases/tasks |
| **Activity Feed** | Chronological log of all project activity |
| **Email Notifications** | Automated emails for key events |
| **File Uploads** | Google Drive integration for documents/photos |

---

## Database Schema

### Core Tables

```
projects
├── id, name, description, status
├── customer_id → customers
├── address fields (street, city, state, zip)
├── dates (estimated_start/end, actual_start/end)
├── original_estimate, overall_progress
├── current_phase_id → project_phases
└── timestamps

project_phases
├── id, project_id → projects
├── name, description, display_order
├── status (not_started|in_progress|on_hold|completed|skipped)
├── client_visible, requires_approval
├── approval fields (signature, date, approved_by)
├── dates (started_at, completed_at, estimated_start/end)
└── progress (0-100)

project_tasks
├── id, phase_id → project_phases
├── name, description, display_order
├── status (pending|in_progress|completed|skipped)
├── assigned_to → users, due_date
├── client_visible, requires_approval
└── completed_at, completed_by
```

### Template Tables

```
project_templates
├── id, name, description, is_active
└── timestamps

phase_templates
├── id, project_template_id → project_templates
├── name, description, display_order
├── client_visible, requires_approval
└── timestamps

task_templates
├── id, phase_template_id → phase_templates
├── name, description, display_order
├── client_visible, requires_approval
└── timestamps
```

### Supporting Tables

```
project_deliveries
├── id, project_id, linked_phase_id
├── description, vendor, status
├── expected_date, actual_date
├── tracking_number, carrier, cost
├── delay_reason, client_visible
└── timestamps

change_orders
├── id, project_id, linked_phase_id
├── co_number (auto-generated per project)
├── title, description, reason
├── cost_impact, time_impact_days
├── status (draft|pending_approval|approved|rejected|void)
├── approval fields (signature, date, approved_by)
└── timestamps

time_entries
├── id, project_id, linked_phase_id, user_id
├── entry_date, hours, category, description
├── is_billable, hourly_rate, client_visible
└── timestamps

project_line_items
├── id, project_id, linked_phase_id, linked_change_order_id
├── category, description
├── quantity, unit, unit_price, total
├── client_visible
└── timestamps

project_payments
├── id, project_id
├── description, amount, due_date, paid_date
├── status (pending|paid|overdue|cancelled)
├── payment_method, reference_number
└── timestamps

project_files
├── id, project_id, linked_phase_id
├── file_name, file_url, file_size, mime_type
├── category (contract|design|selection|progress_photo|completion_photo|invoice|receipt|warranty|other)
├── thumbnail_url, is_photo, client_visible
└── timestamps

project_updates
├── id, project_id, linked_phase_id
├── update_type (note|status_change|photo|document|message|milestone|system|task_completed|phase_completed)
├── title, content
├── created_by_user_id, created_by_name
├── is_internal
└── timestamps

out_of_scope_items
├── id, project_id
├── item, reason
├── client_acknowledged, acknowledged_at, acknowledged_by
├── client_visible
└── timestamps

custom_field_definitions
├── id, entity_type (project|phase|task)
├── field_name, field_label, field_type
├── options (JSON for select fields)
├── is_required, default_value
├── display_order, placeholder, help_text
├── client_visible, is_active
├── project_template_id (optional)
└── timestamps

custom_field_values
├── id, field_definition_id
├── entity_type, entity_id
├── value
└── timestamps

client_feedback
├── id, project_id, linked_phase_id
├── client_portal_user_id, client_name
├── feedback_type (rating|comment|issue|suggestion|compliment)
├── rating (1-5), title, content
├── status (new|reviewed|responded|resolved)
├── admin_response, responded_by, responded_at
├── internal_notes
└── timestamps
```

### Portal Access

```
client_portal_access
├── id, customer_id → customers
├── email, password_hash
├── is_active, last_login_at
├── show_pricing, show_internal_notes
├── email_on_new_message, email_on_delivery_update
└── timestamps

project_messages
├── id, project_id
├── sender_type (admin|client)
├── sender_user_id / sender_portal_user_id
├── sender_name, subject, content
├── read_by_admin, read_by_admin_at
├── read_by_client, read_by_client_at
├── reply_to_id
└── created_at
```

---

## API Endpoints

### Projects

```
GET    /api/projects                     List projects (with filters)
POST   /api/projects                     Create project
GET    /api/projects/:id                 Get project with details
PATCH  /api/projects/:id                 Update project
DELETE /api/projects/:id                 Delete project
POST   /api/projects/from-template/:id   Create from template
```

### Phases

```
GET    /api/projects/:id/phases          List phases
POST   /api/projects/:id/phases          Create phase
PATCH  /api/phases/:id                   Update phase
DELETE /api/phases/:id                   Delete phase
POST   /api/projects/:id/phases/reorder  Reorder phases
```

### Tasks

```
GET    /api/phases/:id/tasks             List tasks
POST   /api/phases/:id/tasks             Create task
PATCH  /api/tasks/:id                    Update task
DELETE /api/tasks/:id                    Delete task
```

### Templates

```
GET    /api/project-templates            List templates
POST   /api/project-templates            Create template
GET    /api/project-templates/:id        Get template with details
PATCH  /api/project-templates/:id        Update template
DELETE /api/project-templates/:id        Delete template
POST   /api/project-templates/:id/phases Add phase to template
```

### Deliveries

```
GET    /api/projects/:id/deliveries      List deliveries
POST   /api/projects/:id/deliveries      Create delivery
PATCH  /api/deliveries/:id               Update delivery
DELETE /api/deliveries/:id               Delete delivery
```

### Change Orders

```
GET    /api/projects/:id/change-orders   List change orders
POST   /api/projects/:id/change-orders   Create change order
PATCH  /api/change-orders/:id            Update change order
POST   /api/change-orders/:id/submit     Submit for approval
POST   /api/change-orders/:id/approve    Approve (admin)
POST   /api/change-orders/:id/reject     Reject
DELETE /api/change-orders/:id            Delete/void
```

### Time Tracking

```
GET    /api/projects/:id/time-entries    List time entries
POST   /api/projects/:id/time-entries    Create entry
PATCH  /api/time-entries/:id             Update entry
DELETE /api/time-entries/:id             Delete entry
GET    /api/projects/:id/time-total      Get total hours
```

### Pricing

```
GET    /api/projects/:id/line-items      List line items
POST   /api/projects/:id/line-items      Create line item
PATCH  /api/line-items/:id               Update line item
DELETE /api/line-items/:id               Delete line item

GET    /api/projects/:id/payments        List payments
POST   /api/projects/:id/payments        Create payment
PATCH  /api/payments/:id                 Update payment
DELETE /api/payments/:id                 Delete payment
```

### Files

```
GET    /api/projects/:id/files           List files
POST   /api/projects/:id/files/upload    Upload file
PATCH  /api/files/:id                    Update file metadata
DELETE /api/files/:id                    Delete file
```

### Activity/Updates

```
GET    /api/projects/:id/updates         List updates
POST   /api/projects/:id/updates         Create update/note
DELETE /api/updates/:id                  Delete update
```

### Messages

```
GET    /api/projects/:id/messages        List messages
POST   /api/projects/:id/messages        Send message
POST   /api/projects/:id/messages/mark-read  Mark as read
DELETE /api/messages/:id                 Delete message
```

### Out of Scope

```
GET    /api/projects/:id/out-of-scope    List items
POST   /api/projects/:id/out-of-scope    Create item
PATCH  /api/out-of-scope/:id             Update item
DELETE /api/out-of-scope/:id             Delete item
```

### Custom Fields

```
GET    /api/custom-field-definitions     List definitions
POST   /api/custom-field-definitions     Create definition
PATCH  /api/custom-field-definitions/:id Update definition
DELETE /api/custom-field-definitions/:id Delete definition
GET    /api/custom-field-values/:type/:id Get values for entity
POST   /api/custom-field-values          Set field value
```

### Client Feedback

```
GET    /api/projects/:id/feedback        List feedback (admin)
PATCH  /api/feedback/:id                 Update/respond to feedback
DELETE /api/feedback/:id                 Delete feedback
```

### Portal Access Management

```
GET    /api/client-portal-access                    List all access
GET    /api/client-portal-access/customer/:id       Get by customer
POST   /api/client-portal-access                    Create access
PATCH  /api/client-portal-access/:id                Update access
POST   /api/client-portal-access/:id/send-invite    Send invite email
POST   /api/client-portal-access/:id/reset-password Reset password
DELETE /api/client-portal-access/:id                Delete access
```

### Portal API (Client-facing)

```
POST   /api/portal/login                 Client login
POST   /api/portal/logout                Client logout
GET    /api/portal/me                    Get current user
GET    /api/portal/projects              List client's projects
GET    /api/portal/projects/:id          Get project details
GET    /api/portal/projects/:id/files    Get files
GET    /api/portal/projects/:id/updates  Get updates
GET    /api/portal/projects/:id/deliveries Get deliveries
GET    /api/portal/projects/:id/change-orders Get change orders
POST   /api/portal/change-orders/:id/approve Approve with signature
POST   /api/portal/change-orders/:id/reject  Reject change order
GET    /api/portal/projects/:id/messages Get messages
POST   /api/portal/projects/:id/messages Send message
POST   /api/portal/projects/:id/messages/mark-read Mark read
POST   /api/portal/projects/:id/feedback Submit feedback
```

---

## Frontend Pages

### Admin Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/projects` | `Projects.tsx` | Project list with filters, search, status |
| `/projects/:id` | `ProjectDetail.tsx` | Full project view with all tabs |
| `/project-templates` | `ProjectTemplates.tsx` | Template management |
| `/customers` | `Customers.tsx` | Customer list with portal access management |

### Project Detail Sections

| Section | Component | Description |
|---------|-----------|-------------|
| Phases | Built-in | Drag-to-reorder, tasks, progress |
| Deliveries | `ProjectDeliveries.tsx` | Delivery tracking |
| Change Orders | `ProjectChangeOrders.tsx` | CO workflow |
| Time Tracking | `ProjectTimeTracking.tsx` | Time entries |
| Pricing | `ProjectPricing.tsx` | Line items & payments |
| Out of Scope | `ProjectOutOfScope.tsx` | Excluded items |
| Files | `ProjectFiles.tsx` | Documents & photos |
| Activity | `ProjectActivityFeed.tsx` | Update timeline |
| Messages | `ProjectMessages.tsx` | Client messaging |

### Portal Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/portal/login` | `PortalLogin.tsx` | Client login |
| `/portal` | `PortalDashboard.tsx` | Project overview |
| `/portal/project/:id` | `PortalProject.tsx` | Project details |

---

## Client Portal

### Access Setup

1. Go to **Customers** page
2. Click on a customer to edit
3. In the **Client Portal Access** section:
   - Click "Enable Portal Access"
   - Set an initial password
   - Click "Create & Send Invite"

### Portal Features

**Dashboard:**
- Lists all projects the client has access to
- Shows status and overall progress for each

**Project View:**
- Phase timeline with task checklists (client-visible only)
- Pending change orders requiring approval
- Project files and photos
- Delivery tracking
- Two-way messaging

**Change Order Approval:**
1. Client views pending change order details
2. Reviews cost/time impact
3. Signs using signature canvas
4. Clicks Approve or Reject

### Visibility Controls

- **Phase visibility**: `client_visible` field
- **Task visibility**: `client_visible` field
- **File visibility**: `client_visible` field
- **Update visibility**: `is_internal` field
- **Pricing visibility**: `show_pricing` on portal access

---

## Email Notifications

### Available Templates

| Template | Trigger | Description |
|----------|---------|-------------|
| Portal Invite | Manual | Welcome email with login credentials |
| Password Reset | Manual | New password notification |
| New Message | Auto | When admin sends message |
| Change Order Approval | Auto | When CO submitted for approval |
| Phase Completed | Auto | When phase marked complete |
| Delivery Update | Auto | When delivery status changes |

### Configuration

Emails are sent via **Resend**. Set the `RESEND_API_KEY` environment variable.

Notification preferences per client are stored in `client_portal_access`:
- `email_on_new_message` (yes/no)
- `email_on_delivery_update` (yes/no)

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Email (Resend)
RESEND_API_KEY=re_...

# Google Drive (for file uploads)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_DRIVE_FOLDER_ID=...

# Session
SESSION_SECRET=...
```

### Default Template

A default "General Renovation" template is seeded with:

1. **Initial Consultation**
   - Site visit
   - Take measurements
   - Prepare quote

2. **Design & Selection**
   - Material selection
   - Design review
   - Client approval (requires approval)

3. **Ordering**
   - Place orders
   - Track shipments
   - Confirm delivery

4. **Installation**
   - Prep work
   - Tile installation
   - Grouting
   - Quality check (internal only)

5. **Completion**
   - Final cleanup
   - Final walkthrough
   - Client sign-off (requires approval)

To seed: `npx tsx server/seedDefaultTemplate.ts`

---

## Component Reference

### Reusable Components

| Component | Location | Usage |
|-----------|----------|-------|
| `SignatureCapture` | `components/SignatureCapture.tsx` | Signature canvas with clear/accept |
| `SignatureCanvasInline` | `components/SignatureCapture.tsx` | Simpler inline variant |

### UI Patterns

- **Mobile Responsive**: All pages use `sm:` and `md:` breakpoints
- **Loading States**: `Loader2` spinner from lucide-react
- **Error Handling**: Toast notifications via `useToast`
- **Drag & Drop**: `@hello-pangea/dnd` for phase reordering

---

## Permissions

Project management requires `manage_projects` permission:
- Create/edit/delete projects
- Manage phases and tasks
- Handle change orders
- Track time and pricing

Portal access management requires `manage_customers` permission:
- Create portal accounts
- Send invites
- Reset passwords
