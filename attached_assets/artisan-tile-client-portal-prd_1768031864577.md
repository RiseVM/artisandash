# Artisan Tile Client Portal - Project Progress Tracker
## Product Requirements Document (PRD)

---

## 1. Executive Summary

### Purpose
Add a client-facing portal to the existing Artisan Tile dashboard that allows customers to track their tile project progress in real-time, communicate with the Artisan Tile team, and provide feedback throughout the project lifecycle.

### Goals
- Increase customer satisfaction through transparency and communication
- Reduce inbound "status check" calls and emails
- Streamline project management workflow for Artisan Tile staff
- Create a professional, modern client experience
- Capture feedback to improve services

### Integration Context
This feature integrates with the existing Artisan Tile application which currently handles:
- Sample lending/tracking system
- Contract creation and digital signing

---

## 2. User Personas

### Customer (Client Portal User)
- Homeowners or contractors working with Artisan Tile
- Want visibility into their project without calling
- Need access to documents and selections
- May not be tech-savvy; needs intuitive interface

### Artisan Tile Admin (Internal User)
- Staff managing multiple projects simultaneously
- Needs efficient tools to update many clients at once
- Requires overview of all projects in pipeline
- Manages team member assignments

### Artisan Tile Team Member
- Installers, designers, or sales staff
- Updates specific project phases they're responsible for
- Uploads photos and progress notes

---

## 3. Project Phases & Workflow

### Standard Project Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARTISAN TILE PROJECT PHASES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐│
│  │  INQUIRY │───▶│  DESIGN  │───▶│ ORDERING │───▶│ INSTALL  │───▶│COMPLETE││
│  │          │    │ & SELECT │    │          │    │          │    │        ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘│
│       │              │               │               │              │      │
│       ▼              ▼               ▼               ▼              ▼      │
│  • Initial      • Tile         • Materials     • Scheduling   • Final    │
│    contact        selection      ordered        confirmed      walkthrough│
│  • Site visit   • Layout       • Lead time     • In progress  • Warranty │
│  • Quote          design         tracking      • Inspections    info      │
│  • Contract     • Sample       • Delivery      • Photos       • Review   │
│    signed         approval       confirmed                      request   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Details

| Phase | Sub-Stages | Client Actions | Admin Actions |
|-------|------------|----------------|---------------|
| **Inquiry** | Initial Contact, Consultation Scheduled, Site Visit Complete, Quote Provided, Contract Signed | View quote, Sign contract, Ask questions | Create project, Upload quote, Send contract |
| **Design & Selection** | Tile Selection, Layout Design, Design Review, Client Approval | Browse selections, Approve designs, Request changes | Upload design mockups, Add tile specs, Request approval |
| **Ordering** | Materials Ordered, In Production, Shipped, Delivered | Track delivery, Confirm receipt | Update order status, Add tracking info |
| **Installation** | Prep Scheduled, Prep Complete, Installation Scheduled, In Progress, Inspection | View schedule, Approve work, Report issues | Update daily progress, Upload photos, Log hours |
| **Complete** | Final Walkthrough, Project Closed, Warranty Active | Complete survey, Access warranty info, Leave review | Close project, Send warranty docs, Request review |

---

## 4. Feature Specifications

### 4.1 Client Portal Features

#### Dashboard Overview
- **Project Summary Card**: Current phase, overall progress %, next milestone
- **Quick Actions**: View updates, Send message, Upload file
- **Recent Activity Feed**: Last 5-10 updates with timestamps
- **Upcoming Milestones**: What's next with estimated dates

#### Progress Tracker
- **Visual Timeline**: Interactive timeline showing all phases
- **Phase Expansion**: Click phase to see sub-stages and details
- **Progress Bar**: Overall percentage complete
- **Status Badges**: On Track, Delayed, Needs Attention, Awaiting Client
- **Estimated Completion Date**: Dynamic based on current progress

#### Updates & Communication
- **Update Feed**: Chronological list of all project updates
- **Update Types**: 
  - Status changes
  - Notes/messages from team
  - Photo uploads
  - Document additions
  - Milestone completions
- **Threaded Replies**: Client can respond to specific updates
- **Message Composer**: Send new messages to project team
- **Read Receipts**: Shows when messages are seen

#### Photo Gallery
- **Progress Photos**: Organized by date and phase
- **Before/After Comparisons**: Side-by-side view
- **Photo Zoom**: Full-screen lightbox view
- **Download Options**: Individual or bulk download
- **Client Uploads**: Clients can add their own photos

#### Documents
- **Document Library**: All project-related files
- **Categories**: Contracts, Invoices, Designs, Warranties, Receipts
- **Version History**: See previous versions of documents
- **Digital Signatures**: Sign documents directly in portal
- **Download/Print**: Easy access to all documents

#### Selections & Specifications
- **Tile Selections**: Photos, names, SKUs of selected materials
- **Quantities**: Square footage, piece counts
- **Specifications**: Technical specs, care instructions
- **Alternates**: Backup selections if primary unavailable

#### Scheduling
- **Appointment Calendar**: Upcoming appointments
- **Installation Schedule**: Day-by-day installation plan
- **Calendar Sync**: Add to Google/Apple/Outlook calendar
- **Reschedule Requests**: Request appointment changes

#### Feedback System
- **Phase Feedback**: Rate satisfaction at each phase completion
- **Feedback Prompts**: Contextual questions based on phase
- **Issue Reporting**: Flag problems with priority levels
- **Suggestions**: Submit improvement ideas
- **Final Survey**: Comprehensive end-of-project survey

#### Approvals & Sign-offs
- **Pending Approvals Queue**: Items needing client action
- **Design Approvals**: Approve/request changes on designs
- **Change Order Approvals**: Accept additional work/costs
- **Completion Sign-off**: Confirm project completion
- **Digital Signature Capture**: For formal approvals

#### Financial Overview
- **Project Budget**: Original estimate vs. current
- **Payment Schedule**: Upcoming and completed payments
- **Invoice History**: All invoices with payment status
- **Change Orders**: Additional costs with approval status
- **Payment Portal**: Link to make payments (or integrate)

#### Notifications
- **Email Notifications**: Configurable by type
- **SMS Notifications**: Optional for urgent updates (if implemented)
- **In-App Notifications**: Bell icon with unread count
- **Notification Preferences**: Client controls what they receive

---

### 4.2 Admin Portal Features

#### Project Management Dashboard
- **Pipeline View**: Kanban board of all projects by phase
- **List View**: Sortable, filterable table of all projects
- **Calendar View**: Timeline of all project milestones
- **Search & Filter**: By client, phase, team member, date range, status

#### Project Creation & Setup
- **New Project Wizard**: Step-by-step project creation
- **Client Linking**: Connect to existing client or create new
- **Template Selection**: Pre-built phase templates by project type
- **Custom Phases**: Add/remove/rename phases per project
- **Team Assignment**: Assign team members to project
- **Initial Documents**: Upload contracts, quotes

#### Project Detail Management
- **Phase Controls**: Move project through phases
- **Sub-Stage Checkboxes**: Mark individual tasks complete
- **Bulk Actions**: Update multiple sub-stages at once
- **Status Overrides**: Mark as delayed, on hold, etc.
- **Date Management**: Set/adjust milestone dates

#### Update & Communication Tools
- **Quick Update**: Fast status update with template options
- **Detailed Update**: Rich text with photos and attachments
- **Update Templates**: Pre-written updates for common situations
- **Broadcast Updates**: Send same update to multiple projects
- **Internal Notes**: Team-only notes not visible to client
- **Client Message Management**: View and respond to client messages

#### Photo Management
- **Bulk Upload**: Multiple photos at once
- **Photo Tagging**: Tag by phase, type, location
- **Caption Editor**: Add descriptions to photos
- **Visibility Toggle**: Choose which photos client sees
- **Before/After Pairing**: Link related photos

#### Document Management
- **Upload Documents**: Drag-and-drop interface
- **Document Templates**: Generate from templates
- **Signature Requests**: Send documents for signing
- **Expiration Tracking**: Alert for expiring warranties, etc.

#### Scheduling Tools
- **Appointment Scheduler**: Create appointments linked to project
- **Availability Management**: Set team availability
- **Conflict Detection**: Warn of scheduling conflicts
- **Client Self-Scheduling**: Optional client booking for consultations

#### Feedback & Issue Management
- **Feedback Dashboard**: Overview of all client feedback
- **Issue Tracker**: Manage reported issues
- **Response Tools**: Reply to feedback with actions taken
- **Satisfaction Metrics**: Track ratings over time
- **Alert Triggers**: Notify on low ratings or urgent issues

#### Approval Management
- **Approval Queue**: All pending client approvals
- **Approval Reminders**: Automated follow-ups
- **Approval History**: Audit trail of all approvals
- **Expedite Options**: Mark approvals as urgent

#### Financial Tools
- **Budget Tracking**: Monitor costs against estimate
- **Invoice Generation**: Create invoices from project data
- **Payment Recording**: Log received payments
- **Change Order Creation**: Generate change orders for approval
- **Financial Reports**: Project profitability analysis

#### Reporting & Analytics
- **Project Reports**: Individual project summaries
- **Pipeline Reports**: Projects by phase, bottlenecks
- **Team Performance**: Projects per team member, completion rates
- **Client Satisfaction**: Aggregate feedback scores
- **Timeline Analysis**: Average time in each phase
- **Revenue Reports**: By project type, time period

#### Client Management
- **Client Directory**: All clients with contact info
- **Client History**: All projects for a client
- **Communication Log**: All interactions with client
- **Client Preferences**: Notes on preferences, special needs

---

### 4.3 Team Member Features

#### My Projects
- **Assigned Projects**: List of projects assigned to team member
- **My Tasks**: Sub-stages assigned to team member
- **Daily Schedule**: Today's appointments and tasks

#### Quick Actions
- **Update Project**: Add updates to assigned projects
- **Upload Photos**: Mobile-friendly photo upload
- **Log Hours**: Track time spent (optional)
- **Complete Task**: Mark sub-stages done

---

## 5. Database Schema

### New Tables

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(100), -- bathroom, kitchen, floor, custom
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, cancelled
  current_phase_id UUID REFERENCES project_phases(id),
  overall_progress INTEGER DEFAULT 0, -- 0-100
  estimated_start_date DATE,
  estimated_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  budget_estimate DECIMAL(10,2),
  budget_actual DECIMAL(10,2),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  notes TEXT, -- internal notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Project phases template
CREATE TABLE phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- Inquiry, Design, Ordering, etc.
  description TEXT,
  default_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sub-stage templates
CREATE TABLE substage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id UUID REFERENCES phase_templates(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_order INTEGER,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project phases (instances)
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_template_id UUID REFERENCES phase_templates(id),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_duration_days INTEGER,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project sub-stages (instances)
CREATE TABLE project_substages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  substage_template_id UUID REFERENCES substage_templates(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255), -- client name/email
  display_order INTEGER,
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project updates/activity log
CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_phase_id UUID REFERENCES project_phases(id),
  user_id UUID REFERENCES users(id), -- null if from client
  client_id UUID REFERENCES clients(id), -- null if from admin
  update_type VARCHAR(50) NOT NULL, -- status_change, note, photo, document, message, milestone, feedback
  title VARCHAR(255),
  content TEXT,
  is_internal BOOLEAN DEFAULT false, -- true = not visible to client
  is_read_by_client BOOLEAN DEFAULT false,
  is_read_by_admin BOOLEAN DEFAULT false,
  metadata JSONB, -- flexible field for type-specific data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project photos
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_phase_id UUID REFERENCES project_phases(id),
  update_id UUID REFERENCES project_updates(id),
  uploaded_by_user_id UUID REFERENCES users(id),
  uploaded_by_client_id UUID REFERENCES clients(id),
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  filename VARCHAR(255),
  caption TEXT,
  photo_type VARCHAR(50), -- progress, before, after, issue, design
  is_visible_to_client BOOLEAN DEFAULT true,
  display_order INTEGER,
  taken_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project documents
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_phase_id UUID REFERENCES project_phases(id),
  uploaded_by UUID REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL, -- contract, invoice, design, warranty, receipt, change_order
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES project_documents(id),
  requires_signature BOOLEAN DEFAULT false,
  signed_at TIMESTAMP,
  signed_by VARCHAR(255),
  signature_data TEXT, -- base64 signature if captured
  is_visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Material selections
CREATE TABLE project_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  selection_type VARCHAR(50) NOT NULL, -- primary_tile, accent_tile, grout, trim, etc.
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  manufacturer VARCHAR(255),
  color VARCHAR(100),
  size VARCHAR(100),
  quantity DECIMAL(10,2),
  quantity_unit VARCHAR(50), -- sqft, pieces, linear_ft
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  image_url VARCHAR(500),
  specifications TEXT,
  is_alternate BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'selected', -- selected, ordered, received, installed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project appointments/scheduling
CREATE TABLE project_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  appointment_type VARCHAR(50) NOT NULL, -- consultation, site_visit, installation, inspection, walkthrough
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, rescheduled
  location VARCHAR(255),
  notes TEXT,
  client_confirmed BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Client feedback
CREATE TABLE project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_phase_id UUID REFERENCES project_phases(id),
  client_id UUID REFERENCES clients(id),
  feedback_type VARCHAR(50) NOT NULL, -- phase_rating, issue, suggestion, final_survey
  rating INTEGER, -- 1-5 stars
  title VARCHAR(255),
  content TEXT,
  is_issue BOOLEAN DEFAULT false,
  issue_priority VARCHAR(50), -- low, medium, high, urgent
  issue_status VARCHAR(50), -- open, in_progress, resolved, closed
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  is_public_testimonial BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Change orders
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  change_order_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  cost_change DECIMAL(10,2), -- positive or negative
  time_impact_days INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by VARCHAR(255), -- client name
  signature_data TEXT,
  created_by UUID REFERENCES users(id),
  notes TEXT
);

-- Project payments
CREATE TABLE project_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL, -- deposit, progress, final, change_order
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, waived
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project team assignments
CREATE TABLE project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role VARCHAR(100) NOT NULL, -- project_manager, designer, installer, sales
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Client portal access
CREATE TABLE client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  access_token VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255), -- if using password auth
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, project_id)
);

-- Notification log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  notification_type VARCHAR(50) NOT NULL, -- email, sms, in_app
  category VARCHAR(50) NOT NULL, -- update, approval_needed, appointment, message
  subject VARCHAR(255),
  content TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity audit log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- project, phase, update, document, etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_updates_project ON project_updates(project_id);
CREATE INDEX idx_project_updates_created ON project_updates(created_at DESC);
CREATE INDEX idx_project_photos_project ON project_photos(project_id);
CREATE INDEX idx_project_documents_project ON project_documents(project_id);
CREATE INDEX idx_project_feedback_project ON project_feedback(project_id);
CREATE INDEX idx_notifications_client ON notifications(client_id);
CREATE INDEX idx_activity_log_project ON activity_log(project_id);
```

---

## 6. API Endpoints

### Client Portal API

```
Authentication
POST   /api/client-portal/login              - Client login
POST   /api/client-portal/logout             - Client logout
POST   /api/client-portal/forgot-password    - Request password reset
POST   /api/client-portal/reset-password     - Reset password
GET    /api/client-portal/me                 - Get current client info

Projects
GET    /api/client-portal/projects           - List client's projects
GET    /api/client-portal/projects/:id       - Get project details
GET    /api/client-portal/projects/:id/timeline - Get project timeline

Updates & Messages
GET    /api/client-portal/projects/:id/updates  - Get project updates
POST   /api/client-portal/projects/:id/messages - Send message
PUT    /api/client-portal/updates/:id/read      - Mark update as read

Photos
GET    /api/client-portal/projects/:id/photos   - Get project photos
POST   /api/client-portal/projects/:id/photos   - Upload client photo

Documents
GET    /api/client-portal/projects/:id/documents   - Get project documents
GET    /api/client-portal/documents/:id/download   - Download document
POST   /api/client-portal/documents/:id/sign       - Sign document

Selections
GET    /api/client-portal/projects/:id/selections  - Get material selections

Appointments
GET    /api/client-portal/projects/:id/appointments - Get appointments
PUT    /api/client-portal/appointments/:id/confirm  - Confirm appointment
POST   /api/client-portal/appointments/:id/reschedule - Request reschedule

Approvals
GET    /api/client-portal/projects/:id/approvals    - Get pending approvals
POST   /api/client-portal/approvals/:id/approve     - Approve item
POST   /api/client-portal/approvals/:id/reject      - Reject/request changes

Feedback
POST   /api/client-portal/projects/:id/feedback     - Submit feedback
GET    /api/client-portal/projects/:id/feedback     - Get submitted feedback

Payments
GET    /api/client-portal/projects/:id/payments     - Get payment info

Notifications
GET    /api/client-portal/notifications             - Get notifications
PUT    /api/client-portal/notifications/preferences - Update preferences
```

### Admin API

```
Projects
GET    /api/admin/projects                    - List all projects (with filters)
POST   /api/admin/projects                    - Create new project
GET    /api/admin/projects/:id                - Get project details
PUT    /api/admin/projects/:id                - Update project
DELETE /api/admin/projects/:id                - Archive/delete project
GET    /api/admin/projects/pipeline           - Get pipeline view data

Phases & Substages
PUT    /api/admin/projects/:id/phases/:phaseId           - Update phase
PUT    /api/admin/projects/:id/substages/:substageId     - Update substage
POST   /api/admin/projects/:id/phases/:phaseId/complete  - Complete phase
POST   /api/admin/projects/:id/advance                   - Advance to next phase

Updates
GET    /api/admin/projects/:id/updates        - Get all updates
POST   /api/admin/projects/:id/updates        - Create update
PUT    /api/admin/updates/:id                 - Edit update
DELETE /api/admin/updates/:id                 - Delete update

Photos
GET    /api/admin/projects/:id/photos         - Get all photos
POST   /api/admin/projects/:id/photos         - Upload photos
PUT    /api/admin/photos/:id                  - Update photo details
DELETE /api/admin/photos/:id                  - Delete photo

Documents
GET    /api/admin/projects/:id/documents      - Get all documents
POST   /api/admin/projects/:id/documents      - Upload document
PUT    /api/admin/documents/:id               - Update document
DELETE /api/admin/documents/:id               - Delete document
POST   /api/admin/documents/:id/request-signature - Request client signature

Selections
GET    /api/admin/projects/:id/selections     - Get selections
POST   /api/admin/projects/:id/selections     - Add selection
PUT    /api/admin/selections/:id              - Update selection
DELETE /api/admin/selections/:id              - Remove selection

Appointments
GET    /api/admin/appointments                - Get all appointments
POST   /api/admin/projects/:id/appointments   - Create appointment
PUT    /api/admin/appointments/:id            - Update appointment
DELETE /api/admin/appointments/:id            - Cancel appointment

Feedback & Issues
GET    /api/admin/feedback                    - Get all feedback
GET    /api/admin/projects/:id/feedback       - Get project feedback
PUT    /api/admin/feedback/:id                - Update/respond to feedback
PUT    /api/admin/feedback/:id/resolve        - Resolve issue

Change Orders
GET    /api/admin/projects/:id/change-orders  - Get change orders
POST   /api/admin/projects/:id/change-orders  - Create change order
PUT    /api/admin/change-orders/:id           - Update change order

Payments
GET    /api/admin/projects/:id/payments       - Get payments
POST   /api/admin/projects/:id/payments       - Add payment record
PUT    /api/admin/payments/:id                - Update payment

Team
GET    /api/admin/projects/:id/team           - Get project team
POST   /api/admin/projects/:id/team           - Add team member
DELETE /api/admin/projects/:id/team/:userId   - Remove team member

Client Portal Access
POST   /api/admin/projects/:id/portal-access  - Create client portal access
PUT    /api/admin/portal-access/:id           - Update access
POST   /api/admin/portal-access/:id/reset-password - Reset client password
POST   /api/admin/portal-access/:id/send-invite    - Send portal invite

Templates
GET    /api/admin/templates/phases            - Get phase templates
POST   /api/admin/templates/phases            - Create phase template
PUT    /api/admin/templates/phases/:id        - Update phase template
GET    /api/admin/templates/updates           - Get update templates

Reports
GET    /api/admin/reports/pipeline            - Pipeline report
GET    /api/admin/reports/satisfaction        - Satisfaction metrics
GET    /api/admin/reports/team-performance    - Team performance
GET    /api/admin/reports/financials          - Financial reports

Notifications
POST   /api/admin/projects/:id/notify         - Send notification to client
GET    /api/admin/notifications/log           - Get notification history
```

---

## 7. User Interface Specifications

### 7.1 Client Portal UI

#### Login Page
- Clean, branded login form
- Email/password or magic link option
- "Forgot password" link
- Company logo and branding

#### Main Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                              [Notifications] [Account]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back, [Client Name]                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Project Name]                              72% Complete │   │
│  │  ════════════════════════════░░░░░░░░░░                  │   │
│  │                                                          │   │
│  │  Current Phase: INSTALLATION                             │   │
│  │  Status: ● On Track                                      │   │
│  │  Est. Completion: March 15, 2025                         │   │
│  │                                                          │   │
│  │  [View Project Details →]                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  📋 Pending Actions  │  │  📬 Recent Updates   │            │
│  │  ─────────────────   │  │  ─────────────────   │            │
│  │  • Approve design    │  │  • Photos added      │            │
│  │  • Sign change order │  │  • Phase completed   │            │
│  │  • Confirm appt      │  │  • Message from team │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Project Detail Page - Progress Tab
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    [Project Name]                      [Message Team]   │
├─────────────────────────────────────────────────────────────────┤
│  [Progress] [Photos] [Documents] [Selections] [Messages]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROJECT TIMELINE                                               │
│                                                                 │
│  ●━━━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━○                         │
│  Inquiry  Design   Ordering  Install  Complete                  │
│  ✓        ✓        ✓         ◐                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ▼ INSTALLATION (In Progress)                           │   │
│  │    ──────────────────────────────────────               │   │
│  │    ✓ Prep work scheduled                                │   │
│  │    ✓ Prep work completed                                │   │
│  │    ✓ Installation scheduled - March 10-14               │   │
│  │    ◐ Installation in progress (Day 2 of 4)              │   │
│  │    ○ Final inspection                                   │   │
│  │                                                          │   │
│  │    Latest Update (Mar 11, 2:30 PM):                     │   │
│  │    "Day 2 complete! Bathroom floor finished,            │   │
│  │     starting shower walls tomorrow."                     │   │
│  │    [View 4 new photos →]                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ▶ ORDERING (Completed Jan 28)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Admin UI

#### Project Pipeline View
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Projects    [+ New Project]    [Search...]    [Filter ▼]    [View ▼]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INQUIRY (3)    DESIGN (5)     ORDERING (2)    INSTALL (4)   DONE (12) │
│  ───────────    ──────────     ────────────    ───────────   ───────── │
│  ┌─────────┐   ┌─────────┐    ┌─────────┐     ┌─────────┐             │
│  │ Smith   │   │ Johnson │    │ Davis   │     │ Wilson  │             │
│  │ Kitchen │   │ Master  │    │ Floor   │     │ Bathroom│             │
│  │ $12,500 │   │ Bath    │    │ $8,200  │     │ $15,000 │             │
│  │ ⚠️ 3 days│   │ $22,000 │    │ On Track│     │ Day 2/4 │             │
│  └─────────┘   │ Pending │    └─────────┘     └─────────┘             │
│  ┌─────────┐   │ Approval│    ┌─────────┐     ┌─────────┐             │
│  │ Brown   │   └─────────┘    │ Miller  │     │ Moore   │             │
│  │ Entry   │   ┌─────────┐    │ Laundry │     │ Kitchen │             │
│  │ $4,500  │   │ Taylor  │    │ $3,800  │     │ $28,000 │             │
│  └─────────┘   │ Full    │    └─────────┘     │ ⚠️ Issue│             │
│               │ Bath    │                    └─────────┘             │
│               │ $18,500 │                                            │
│               └─────────┘                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Project Detail - Admin View
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Projects    Wilson Bathroom Renovation    [⚙️ Settings] [Archive]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Client: Michael Wilson                    Status: ● In Progress        │
│  Phone: (555) 123-4567                     Progress: 72%                │
│  Email: m.wilson@email.com                 Est. Complete: Mar 15        │
│  Address: 123 Oak Street, Hartford CT      Budget: $15,000              │
│                                                                         │
│  [Send Update] [Upload Photos] [Add Document] [Schedule] [Portal Link]  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [Overview] [Timeline] [Updates] [Photos] [Docs] [Feedback] [Financial] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PHASE MANAGEMENT                                                       │
│  ───────────────────────────────────────────────────────────────────   │
│                                                                         │
│  [✓] Inquiry ──── [✓] Design ──── [✓] Ordering ──── [◐] Install ─── [ ]│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  INSTALLATION                              [Mark Complete]       │   │
│  │  Started: Mar 10    |    Due: Mar 14    |    Team: Mike, John    │   │
│  │  ─────────────────────────────────────────────────────────────   │   │
│  │  [✓] Prep work scheduled                                         │   │
│  │  [✓] Prep work completed                                         │   │
│  │  [✓] Installation scheduled                                      │   │
│  │  [◐] Installation in progress          [+ Add Note]              │   │
│  │      Progress: Day 2 of 4                                        │   │
│  │  [ ] Final inspection                                            │   │
│  │                                                                   │   │
│  │  Internal Note: Client works from home, prefers afternoon work   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  RECENT ACTIVITY                                     [View All →]       │
│  ─────────────────────────────────────────────────────────────────────  │
│  Mar 11 2:30p  Photos uploaded (4) - Day 2 progress          [Reply]   │
│  Mar 11 8:15a  Status: Installation started                            │
│  Mar 10 4:00p  Client confirmed appointment                            │
│  Mar 9 10:00a  Update sent: Installation reminder                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema creation and migrations
- [ ] Basic project CRUD operations
- [ ] Phase and substage management
- [ ] Client portal authentication system
- [ ] Project list view (admin)
- [ ] Basic project detail view (admin)

### Phase 2: Core Client Portal (Weeks 3-4)
- [ ] Client login/authentication
- [ ] Client dashboard
- [ ] Progress timeline view
- [ ] Update feed (read-only)
- [ ] Basic notification system (email)
- [ ] Client portal access management (admin)

### Phase 3: Communication (Weeks 5-6)
- [ ] Messaging system (client ↔ admin)
- [ ] Update creation interface (admin)
- [ ] Photo upload and gallery
- [ ] Document management
- [ ] Read receipts

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Approval workflows
- [ ] Feedback collection
- [ ] Material selections tracking
- [ ] Appointment scheduling
- [ ] Pipeline/Kanban view (admin)

### Phase 5: Financial & Polish (Weeks 9-10)
- [ ] Payment tracking
- [ ] Change order management
- [ ] Reporting/analytics
- [ ] Email templates and automation
- [ ] UI polish and mobile optimization

### Phase 6: Testing & Launch (Weeks 11-12)
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Training materials
- [ ] Production deployment

---

## 9. Technical Specifications

### Tech Stack (Matching Existing App)
- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT for client portal, session-based for admin
- **File Storage**: AWS S3 or similar
- **Email**: SendGrid, Resend, or similar

### Security Requirements
- [ ] Client portal uses separate auth from admin
- [ ] All API routes protected with appropriate middleware
- [ ] File uploads validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention
- [ ] Rate limiting on authentication endpoints
- [ ] Secure password storage (bcrypt)
- [ ] HTTPS only

### Performance Requirements
- [ ] Page load under 2 seconds
- [ ] Photo optimization/compression
- [ ] Lazy loading for photo galleries
- [ ] Database indexing for common queries
- [ ] Pagination for large lists

---

## 10. Future Considerations

### Potential Future Features
- SMS notifications (Twilio integration)
- Client self-scheduling for consultations
- Online payment integration (Stripe)
- 3D room visualizer integration
- Warranty claim submission
- Referral program tracking
- Multi-language support
- White-label portal for contractor partners

### Integrations to Consider
- QuickBooks for invoicing
- Google Calendar sync
- Zapier for automation
- Review platforms (Google, Houzz)

---

## 11. Success Metrics

### KPIs to Track
- Client portal login frequency
- Time to respond to client messages
- Client satisfaction ratings
- Reduction in status inquiry calls/emails
- Average project completion time
- Approval turnaround time
- Issue resolution time

---

## 12. Appendix

### A. Update Templates

**Status Update**
```
Subject: Project Update - [Phase Name]
Body: Your [Project Name] project has progressed to the [Phase Name] phase. 
[Additional details]
```

**Photo Update**
```
Subject: New Photos Added
Body: We've added [X] new photos to your project gallery showing [description].
```

**Appointment Reminder**
```
Subject: Upcoming Appointment - [Date]
Body: This is a reminder of your scheduled [Type] on [Date] at [Time].
Please confirm your availability.
```

**Milestone Completion**
```
Subject: Milestone Complete! 🎉
Body: Great news! We've completed [Milestone Name] on your project.
Here's what's next: [Next steps]
```

### B. Feedback Questions by Phase

**Design Phase**
- How satisfied are you with the design options presented?
- Did the design process meet your expectations?
- Any concerns before we proceed to ordering?

**Installation Phase**
- How would you rate the professionalism of our installation team?
- Was the work area kept clean and organized?
- Any issues or concerns during installation?

**Project Completion**
- Overall satisfaction with the finished project?
- Would you recommend Artisan Tile to others?
- What could we have done better?
- May we use photos of your project in our portfolio?

### C. Status Badge Definitions

| Badge | Meaning | Trigger |
|-------|---------|---------|
| ● On Track | Progressing normally | Default state |
| ⚠️ Delayed | Behind schedule | Milestone past due |
| 🔴 Needs Attention | Issue reported | Open issue with high priority |
| ⏸️ On Hold | Temporarily paused | Manually set |
| ⏳ Awaiting Client | Pending client action | Approval/response needed |
| ✅ Completed | Phase/project done | All substages complete |

---

*Document Version: 1.0*
*Last Updated: [Current Date]*
*Author: Rise Visual Media / Claude AI*
