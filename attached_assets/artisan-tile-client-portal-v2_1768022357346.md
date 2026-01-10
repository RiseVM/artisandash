# Artisan Tile Client Portal - Customizable Project Tracker
## Product Requirements Document (PRD) - Version 2

---

## 1. Executive Summary

### Purpose
Add a flexible, customizable project tracking system to the existing Artisan Tile dashboard that can adapt to any interior design or renovation project workflow. The system allows clients to track progress through a customer portal while giving Artisan Tile full control over how projects are structured and what information is tracked.

### Core Philosophy
**Build a configurable system, not a prescriptive one.** Since project scope and workflow needs are unknown, the system must be flexible enough to:
- Define custom phases/stages per project or use templates
- Track whatever data points are relevant to each phase
- Attach files and documents at any level
- Handle industry-specific needs (deliveries, change orders, time tracking, pricing)

### Integration Context
This feature integrates with the existing Artisan Tile application which currently handles:
- Sample lending/tracking system
- Contract creation and digital signing

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMIZABLE PROJECT TRACKER                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PROJECT TEMPLATES                            │   │
│  │  Reusable blueprints for common project types                       │   │
│  │  • Kitchen Renovation Template                                      │   │
│  │  • Bathroom Remodel Template                                        │   │
│  │  • Full Home Design Template                                        │   │
│  │  • Custom (start blank)                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           PROJECT                                   │   │
│  │  Core project info + custom fields                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │ Phase 1 │─▶│ Phase 2 │─▶│ Phase 3 │─▶│ Phase N │─▶│Complete │   │   │
│  │  │(custom) │  │(custom) │  │(custom) │  │(custom) │  │         │   │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘   │   │
│  │       │            │            │            │                      │   │
│  │       ▼            ▼            ▼            ▼                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  Each Phase Contains:                                       │   │   │
│  │  │  • Custom checklist items (tasks)                           │   │   │
│  │  │  • Custom fields (text, date, currency, dropdown, etc.)     │   │   │
│  │  │  • File/document attachments                                │   │   │
│  │  │  • Notes and updates                                        │   │   │
│  │  │  • Approval requirements (optional)                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    DELIVERIES    │  │  CHANGE ORDERS   │  │   TIME TRACKING  │          │
│  │  Track products  │  │  Scope changes   │  │  Labor hours     │          │
│  │  & materials     │  │  & pricing adj.  │  │  & billing       │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  OUT OF SCOPE    │  │     PRICING      │  │    DOCUMENTS     │          │
│  │  Track excluded  │  │  Budget, costs,  │  │  Files at any    │          │
│  │  items & reasons │  │  payments        │  │  level           │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 Project Templates
Reusable blueprints that define a starting structure for projects. Templates can include:
- Pre-defined phases with suggested order
- Default checklist items per phase
- Custom field definitions
- Default settings (client visibility, approval requirements)

Admins can:
- Create templates from scratch
- Save any project as a template
- Modify templates at any time
- Start projects from a template or blank

### 3.2 Phases
Phases are the major stages of a project. They are fully customizable:
- **Name**: Any name (e.g., "Design Consultation", "Demolition", "Tile Installation")
- **Order**: Drag-and-drop reordering
- **Status**: Not Started, In Progress, On Hold, Completed, Skipped
- **Visibility**: Show/hide from client portal
- **Approval**: Optional client sign-off required to complete

### 3.3 Checklist Items (Tasks)
Within each phase, admins can create checklist items:
- Simple checkbox tasks
- Optional due dates
- Optional assignment to team member
- Optional client visibility
- Can require client approval/acknowledgment

### 3.4 Custom Fields
Flexible data capture at the project or phase level:

| Field Type | Use Case Examples |
|------------|-------------------|
| Text (short) | Room name, color code, vendor contact |
| Text (long) | Notes, special instructions, client preferences |
| Number | Square footage, quantity, measurements |
| Currency | Budget, deposit, material cost |
| Date | Start date, delivery date, deadline |
| Dropdown | Status, priority, material type |
| Checkbox | Yes/No flags |
| File Upload | Attach relevant documents |
| URL | Links to external resources |
| Contact | Vendor, subcontractor info |

### 3.5 File Attachments
Files can be attached at multiple levels:
- **Project level**: Contracts, overall plans, client photos
- **Phase level**: Phase-specific documents, permits
- **Task level**: Task-related files
- **Delivery level**: Invoices, BOLs, product specs
- **Change order level**: Signed change orders

---

## 4. Feature Specifications

### 4.1 Project Management (Admin)

#### Project Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Projects                    [+ New Project]     [Templates]    [Archive]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  View: [All ▼]  Status: [Active ▼]  Sort: [Updated ▼]   🔍 Search...       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Johnson Kitchen Renovation                              65% ━━━━━░░ │   │
│  │  📍 123 Oak St, Hartford  │  Started: Jan 5  │  Est. Complete: Mar 1 │   │
│  │  Current Phase: Tile Installation                                   │   │
│  │  ⚠️ 2 pending approvals  │  📦 1 delivery expected                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Smith Master Bathroom                                   30% ━━░░░░░ │   │
│  │  📍 456 Elm Ave, Westport  │  Started: Jan 12  │  Est. Complete: Feb 28│
│  │  Current Phase: Design & Selection                                  │   │
│  │  ⏳ Awaiting client selections                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Project Creation Flow
1. **Choose Starting Point**
   - Start from template (select from list)
   - Start blank
   - Clone existing project

2. **Basic Info**
   - Project name
   - Client (select or create)
   - Project location/address
   - Description
   - Estimated start/end dates

3. **Configure Phases** (if not using template)
   - Add phases
   - Name each phase
   - Set order
   - Configure visibility and approval settings

4. **Set Up Pricing** (optional)
   - Estimated budget
   - Deposit amount
   - Payment schedule

5. **Invite to Portal** (optional)
   - Send client portal access immediately or later

#### Project Detail View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Projects    Johnson Kitchen Renovation         [⚙️ Settings] [Archive]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client: Sarah Johnson          Status: ● Active        Progress: 65%      │
│  📞 (555) 123-4567              📍 123 Oak Street, Hartford, CT             │
│  ✉️ sarah.j@email.com            Started: Jan 5, 2025                        │
│                                                                             │
│  [Send Update] [Upload Files] [+ Add Phase] [Manage Portal] [View as Client]│
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Phases] [Deliveries] [Change Orders] [Time] [Pricing] [Files] [Activity] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROJECT PHASES                                              [+ Add Phase]  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ✅ Initial Consultation                              Completed Jan 5       │
│     └─ 4/4 tasks complete                                                   │
│                                                                             │
│  ✅ Design & Planning                                 Completed Jan 15      │
│     └─ 6/6 tasks complete  │  ✓ Client approved                            │
│                                                                             │
│  ✅ Material Selection                                Completed Jan 22      │
│     └─ 5/5 tasks complete  │  3 files attached                             │
│                                                                             │
│  🔵 Tile Installation ────────────────────────────── IN PROGRESS ──────────│
│  │                                                                         │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  │  ☑️ Prep work completed                           ✓ Jan 25      │   │
│  │  │  ☑️ Backsplash tile delivered                     ✓ Jan 26      │   │
│  │  │  ☑️ Backsplash installation                       ✓ Jan 28      │   │
│  │  │  ☐ Floor tile delivery                            Due: Feb 1    │   │
│  │  │  ☐ Floor tile installation                        Due: Feb 3-5  │   │
│  │  │  ☐ Grouting                                       Due: Feb 6    │   │
│  │  │  ☐ Client walkthrough                             Needs approval│   │
│  │  └─────────────────────────────────────────────────────────────────┘   │
│  │                                                                         │
│  │  Custom Fields:                                                         │
│  │  ├─ Tile Type: Carrara Marble Hexagon                                  │
│  │  ├─ Grout Color: Frost White                                           │
│  │  └─ Installer: Mike's Tile Co.                                         │
│  │                                                                         │
│  │  Files: [floor_layout.pdf] [tile_specs.pdf] [+3 photos]                │
│  │                                                                         │
│  └─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  ○ Finishing & Hardware                                Not Started         │
│     └─ 0/5 tasks complete                                                  │
│                                                                             │
│  ○ Final Walkthrough                                   Not Started         │
│     └─ 0/3 tasks complete  │  Requires client sign-off                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Deliveries Module

Track all product and material deliveries associated with a project.

#### Delivery Record Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Description | Text | Yes | What's being delivered |
| Vendor/Supplier | Text | No | Who it's coming from |
| Expected Date | Date | Yes | When expected |
| Actual Date | Date | No | When actually received |
| Status | Dropdown | Yes | Ordered, Shipped, In Transit, Delivered, Delayed, Cancelled |
| Tracking Number | Text | No | Shipping tracking |
| Carrier | Dropdown | No | UPS, FedEx, Freight, etc. |
| Cost | Currency | No | Material cost |
| Linked Phase | Reference | No | Associate with a phase |
| Notes | Text | No | Special instructions, issues |
| Files | Attachments | No | BOL, invoice, photos |

#### Delivery Status Flow
```
Ordered → Shipped → In Transit → Delivered
                         ↓
                      Delayed → Rescheduled → Delivered
```

#### Delivery Dashboard (Admin)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DELIVERIES                                                    [+ Add New]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXPECTED THIS WEEK                                                         │
│  ───────────────────────────────────────────────────────────────────────── │
│  📦 Floor Tile (Johnson Kitchen)           Expected: Feb 1    │ In Transit │
│     Vendor: ABC Tile Supply  │  Tracking: 1Z999AA10123456784               │
│                                                                             │
│  📦 Cabinet Hardware (Smith Bathroom)      Expected: Feb 2    │ Shipped    │
│     Vendor: Hardware Direct  │  Tracking: 9405511899223033047              │
│                                                                             │
│  DELAYED                                                                    │
│  ───────────────────────────────────────────────────────────────────────── │
│  ⚠️ Custom Vanity (Smith Bathroom)          Was: Jan 28  Now: Feb 10       │
│     Vendor: Custom Cabinets Inc  │  Reason: Manufacturing delay           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Client Portal Delivery View
Clients see simplified delivery information:
- Item description
- Expected/actual date
- Current status
- Any delays with explanation (if admin chooses to share)

---

### 4.3 Change Orders Module

Track scope changes, additions, and pricing adjustments.

#### Change Order Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| CO Number | Auto | Yes | Auto-generated (CO-001, CO-002...) |
| Title | Text | Yes | Brief description |
| Description | Text (long) | Yes | Detailed explanation |
| Reason | Dropdown | No | Client request, Unforeseen condition, Design change, etc. |
| Cost Impact | Currency | Yes | Can be positive, negative, or zero |
| Time Impact | Text | No | "Adds 3 days", "No change", etc. |
| Status | Dropdown | Yes | Draft, Pending Approval, Approved, Rejected, Void |
| Requested Date | Date | Yes | When CO was created |
| Approved Date | Date | No | When client approved |
| Linked Phase | Reference | No | Which phase this affects |
| Files | Attachments | No | Supporting docs, revised plans |
| Client Signature | Signature | No | Captured when approved |

#### Change Order Workflow
```
                              ┌─────────┐
                              │  Draft  │
                              └────┬────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Pending Approval │◄──── Sent to client
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐  ┌──────────┐
              │ Approved │ │ Rejected │  │   Void   │
              └──────────┘ └──────────┘  └──────────┘
```

#### Change Order View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHANGE ORDER CO-002                                          [Edit] [Void] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Title: Add under-cabinet lighting                                          │
│  Project: Johnson Kitchen Renovation                                        │
│  Status: ● Pending Approval                                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Description:                                                               │
│  Client requested LED strip lighting under all upper cabinets.              │
│  Includes: materials, electrical work, and installation.                    │
│                                                                             │
│  Reason: Client Request                                                     │
│  Linked Phase: Finishing & Hardware                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  IMPACT                                                                     │
│  Cost: + $850.00                                                            │
│  Time: Adds 1 day to installation phase                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Attachments: [lighting_specs.pdf] [revised_electrical.pdf]                 │
│                                                                             │
│  [Send to Client for Approval]                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Out of Scope Module

Track items explicitly excluded from the project scope to prevent disputes.

#### Out of Scope Record
| Field | Type | Notes |
|-------|------|-------|
| Item | Text | What's excluded |
| Reason | Text | Why it's out of scope |
| Client Acknowledged | Boolean | Client confirmed understanding |
| Acknowledged Date | Date | When acknowledged |
| Notes | Text | Additional context |
| Discussed Date | Date | When this was discussed |
| Documented In | Reference | Link to contract/document where noted |

#### Out of Scope Examples
- "Plumbing relocation - existing plumbing will remain in place"
- "Electrical panel upgrade - not included, may be needed if adding circuits"
- "Removing existing flooring - client handling separately"
- "Painting - walls will not be painted as part of this project"

#### Client Portal View
Clients can see what's out of scope with option to acknowledge each item, creating a clear record of understanding.

---

### 4.5 Time Tracking Module

Track labor hours for billing, project management, or internal purposes.

#### Time Entry Fields
| Field | Type | Notes |
|-------|------|-------|
| Date | Date | When work was performed |
| Team Member | Reference | Who did the work |
| Hours | Decimal | Time spent |
| Hourly Rate | Currency | Optional - for billing |
| Category | Dropdown | Design, Installation, Project Management, etc. |
| Description | Text | What was done |
| Linked Phase | Reference | Which phase this applies to |
| Billable | Boolean | Is this billable time? |

#### Time Entry Views

**By Project:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIME TRACKING - Johnson Kitchen Renovation                   [+ Add Time]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Summary: 42.5 hours logged  │  Billable: 38 hrs ($2,850)                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Jan 28, 2025                                                               │
│  ├─ Mike T.  │  6.0 hrs  │  Installation  │  Backsplash tile install       │
│  └─ John D.  │  6.0 hrs  │  Installation  │  Backsplash tile install       │
│                                                                             │
│  Jan 27, 2025                                                               │
│  └─ Mike T.  │  4.0 hrs  │  Installation  │  Prep work, substrate repair   │
│                                                                             │
│  Jan 25, 2025                                                               │
│  └─ Sarah A. │  2.0 hrs  │  Design        │  On-site color consultation    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Client Visibility (Optional)
Admin can choose whether clients see:
- Full time details
- Summary only (total hours by category)
- Nothing (internal use only)

---

### 4.6 Pricing & Payments Module

Track project financials.

#### Project Pricing Structure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROJECT PRICING                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BUDGET SUMMARY                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Original Estimate:                                          $18,500.00     │
│  Change Orders:                                              +  $850.00     │
│  ──────────────────────────────────────────────────────────────────────     │
│  Current Total:                                              $19,350.00     │
│                                                                             │
│  COST BREAKDOWN                                              [Edit]         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Materials                                                   $12,400.00     │
│  ├─ Tile & Stone                                  $8,200.00                │
│  ├─ Grout & Adhesives                              $450.00                 │
│  ├─ Underlayment                                   $350.00                 │
│  ├─ Hardware                                     $1,200.00                 │
│  └─ Fixtures                                     $2,200.00                 │
│                                                                             │
│  Labor                                                        $5,500.00     │
│  ├─ Installation                                 $4,200.00                 │
│  ├─ Design                                         $800.00                 │
│  └─ Project Management                             $500.00                 │
│                                                                             │
│  Other                                                          $600.00     │
│  ├─ Permits                                        $150.00                 │
│  └─ Disposal                                       $450.00                 │
│                                                                             │
│  PAYMENTS                                                    [+ Add Payment]│
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✓ Deposit (50%)                    Jan 5      Paid         $9,250.00      │
│  ✓ Progress Payment                 Jan 22     Paid         $4,625.00      │
│  ○ Final Payment                    On completion           $5,475.00      │
│  ──────────────────────────────────────────────────────────────────────     │
│  Total Paid:      $13,875.00                                                │
│  Balance Due:      $5,475.00                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Line Items
Flexible line items for cost tracking:

| Field | Type |
|-------|------|
| Category | Dropdown (Materials, Labor, Other, etc.) |
| Description | Text |
| Quantity | Number |
| Unit | Text (sqft, hours, each, etc.) |
| Unit Price | Currency |
| Total | Currency (calculated) |
| Notes | Text |

#### Payment Records
| Field | Type |
|-------|------|
| Description | Text |
| Amount | Currency |
| Due Date | Date |
| Paid Date | Date |
| Status | Pending, Paid, Overdue, Waived |
| Payment Method | Dropdown |
| Reference/Check # | Text |
| Notes | Text |

---

### 4.7 Files & Documents

Centralized file management with organization by category and association.

#### File Organization
```
Project Files
├── Contracts & Agreements
│   ├── Original_Contract_Signed.pdf
│   └── Change_Order_CO-001_Signed.pdf
├── Design & Plans
│   ├── Kitchen_Layout_v1.pdf
│   ├── Kitchen_Layout_v2_FINAL.pdf
│   ├── Tile_Pattern_Mockup.jpg
│   └── Electrical_Plan.pdf
├── Selections & Specs
│   ├── Tile_Selection_Sheet.pdf
│   ├── Grout_Colors.pdf
│   └── Hardware_Catalog_Page.pdf
├── Photos
│   ├── Before/
│   ├── During/
│   └── After/
├── Invoices & Receipts
│   ├── Tile_Invoice_ABC_Supply.pdf
│   └── Hardware_Receipt.pdf
└── Warranties & Manuals
    └── Tile_Care_Instructions.pdf
```

#### File Record
| Field | Type |
|-------|------|
| Name | Text |
| Category | Dropdown |
| File | Upload |
| Description | Text |
| Associated With | Reference (Project, Phase, Delivery, CO, etc.) |
| Visible to Client | Boolean |
| Uploaded By | Reference |
| Uploaded At | Timestamp |
| Version | Number (for versioned docs) |

#### Photo Management
Special handling for photos:
- Automatic thumbnail generation
- Before/After pairing
- Date/phase tagging
- Bulk upload
- Gallery view

---

### 4.8 Client Portal Features

#### Portal Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [ARTISAN TILE LOGO]                          Welcome, Sarah  │  [Log Out] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR PROJECT                                                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Kitchen Renovation                                                │   │
│  │   123 Oak Street, Hartford                                          │   │
│  │                                                                     │   │
│  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░  65% Complete       │   │
│  │                                                                     │   │
│  │   Current Phase: Tile Installation                                  │   │
│  │   Estimated Completion: March 1, 2025                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │  ⚡ ACTION NEEDED            │  │  📦 UPCOMING DELIVERIES      │          │
│  │  ─────────────────────────  │  │  ─────────────────────────  │          │
│  │  • Approve Change Order     │  │  • Floor Tile - Feb 1       │          │
│  │    CO-002 ($850)            │  │  • Cabinet Hardware - Feb 2 │          │
│  │                             │  │                             │          │
│  │  [Review Now →]             │  │  [View All →]               │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  RECENT UPDATES                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  📸 Jan 28 - 4 new photos added: "Backsplash installation complete"        │
│  ✓  Jan 26 - Milestone: Backsplash tile delivered                          │
│  📝 Jan 25 - Note: "Prep work finished, ready for tile installation"       │
│                                                                             │
│  [View All Updates →]                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Portal Navigation
- **Overview**: Dashboard with progress and actions
- **Progress**: Detailed phase/task view
- **Photos**: Photo gallery
- **Documents**: Accessible files
- **Deliveries**: Delivery status
- **Messages**: Communication with team
- **Approvals**: Pending approvals and change orders
- **Payments**: Payment schedule and history (if enabled)

#### Client Actions in Portal
- View project progress and updates
- See photos (those marked visible)
- Download documents (those marked visible)
- Track deliveries
- Approve change orders (with signature capture)
- Acknowledge out-of-scope items
- Sign off on completed phases (if required)
- Send messages to team
- Submit feedback

---

## 5. Database Schema

### Core Tables

```sql
-- Project Templates
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Phase Templates (belong to project templates)
CREATE TABLE phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  client_visible BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task Templates (belong to phase templates)
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id UUID REFERENCES phase_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  client_visible BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Custom Field Definitions
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'project', 'phase', 'task'
  template_id UUID, -- optional link to project/phase template
  name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- text, number, currency, date, dropdown, checkbox, file, url, contact
  options JSONB, -- for dropdowns: ["Option 1", "Option 2"]
  is_required BOOLEAN DEFAULT false,
  client_visible BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES project_templates(id),
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, cancelled
  
  -- Location
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  
  -- Dates
  estimated_start_date DATE,
  estimated_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Pricing
  original_estimate DECIMAL(12,2),
  
  -- Calculated/cached fields
  overall_progress INTEGER DEFAULT 0,
  current_phase_id UUID,
  
  -- Internal notes
  internal_notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Phases
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, on_hold, completed, skipped
  
  -- Client visibility and approval
  client_visible BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255), -- client name/email
  approval_signature TEXT, -- base64 signature
  
  -- Dates
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_start DATE,
  estimated_end DATE,
  
  -- Progress (calculated from tasks)
  progress INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key for current_phase
ALTER TABLE projects 
ADD CONSTRAINT fk_current_phase 
FOREIGN KEY (current_phase_id) REFERENCES project_phases(id);

-- Project Tasks (checklist items within phases)
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Dates
  due_date DATE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  
  -- Client visibility and approval
  client_visible BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom Field Values
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID REFERENCES custom_field_definitions(id),
  entity_type VARCHAR(50) NOT NULL, -- 'project', 'phase', 'task'
  entity_id UUID NOT NULL,
  value_text TEXT,
  value_number DECIMAL(15,4),
  value_date DATE,
  value_boolean BOOLEAN,
  value_json JSONB, -- for complex values
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(field_definition_id, entity_type, entity_id)
);

-- Project Deliveries
CREATE TABLE project_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  
  description VARCHAR(255) NOT NULL,
  vendor VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'ordered', -- ordered, shipped, in_transit, delivered, delayed, cancelled
  
  -- Dates
  expected_date DATE,
  actual_date DATE,
  
  -- Shipping
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  
  -- Cost
  cost DECIMAL(12,2),
  
  -- Notes
  notes TEXT,
  delay_reason TEXT,
  
  -- Client visibility
  client_visible BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Change Orders
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  
  -- Identification
  co_number INTEGER NOT NULL, -- auto-increment per project
  
  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reason VARCHAR(100), -- client_request, unforeseen_condition, design_change, error_correction, other
  
  -- Impact
  cost_impact DECIMAL(12,2) DEFAULT 0, -- positive or negative
  time_impact VARCHAR(255), -- freeform: "Adds 3 days"
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, rejected, void
  
  -- Dates
  requested_date DATE DEFAULT CURRENT_DATE,
  sent_date TIMESTAMP,
  response_date TIMESTAMP,
  
  -- Approval
  approved_by VARCHAR(255), -- client name
  approval_signature TEXT, -- base64 signature
  rejection_reason TEXT,
  
  -- Notes
  internal_notes TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(project_id, co_number)
);

-- Out of Scope Items
CREATE TABLE out_of_scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  item VARCHAR(255) NOT NULL,
  reason TEXT,
  
  -- Documentation
  discussed_date DATE,
  documented_in VARCHAR(255), -- reference to where this is noted
  
  -- Client acknowledgment
  client_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  acknowledged_by VARCHAR(255),
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  user_id UUID REFERENCES users(id),
  
  entry_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  
  category VARCHAR(100), -- design, installation, project_management, consultation, etc.
  description TEXT,
  
  -- Billing
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  
  -- Client visibility
  client_visible BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Line Items (for pricing breakdown)
CREATE TABLE project_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  linked_change_order_id UUID REFERENCES change_orders(id),
  
  category VARCHAR(100) NOT NULL, -- materials, labor, other
  description VARCHAR(255) NOT NULL,
  
  quantity DECIMAL(10,2),
  unit VARCHAR(50), -- sqft, hours, each, linear_ft, etc.
  unit_price DECIMAL(12,2),
  total DECIMAL(12,2),
  
  notes TEXT,
  
  -- Client visibility
  client_visible BOOLEAN DEFAULT true,
  
  display_order INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE project_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  
  due_date DATE,
  paid_date DATE,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, waived, refunded
  
  payment_method VARCHAR(100),
  reference_number VARCHAR(255),
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Association (polymorphic)
  entity_type VARCHAR(50), -- project, phase, task, delivery, change_order
  entity_id UUID,
  
  -- File info
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Organization
  category VARCHAR(100), -- contracts, design, selections, photos, invoices, warranties, other
  description TEXT,
  
  -- For photos
  is_photo BOOLEAN DEFAULT false,
  thumbnail_url VARCHAR(500),
  photo_type VARCHAR(50), -- before, during, after
  taken_at TIMESTAMP,
  
  -- Versioning (for documents)
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES project_files(id),
  
  -- Visibility
  client_visible BOOLEAN DEFAULT true,
  
  -- Signatures (for signable documents)
  requires_signature BOOLEAN DEFAULT false,
  signed_at TIMESTAMP,
  signed_by VARCHAR(255),
  signature_data TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Updates/Activity
CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  
  -- Author
  user_id UUID REFERENCES users(id), -- null if from client
  client_id UUID REFERENCES clients(id), -- null if from admin
  
  -- Content
  update_type VARCHAR(50) NOT NULL, -- note, status_change, photo, document, message, milestone, system
  title VARCHAR(255),
  content TEXT,
  
  -- Visibility
  is_internal BOOLEAN DEFAULT false, -- true = not visible to client
  
  -- Read tracking
  is_read_by_client BOOLEAN DEFAULT false,
  is_read_by_admin BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Client Portal Access
CREATE TABLE client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Authentication
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  access_token VARCHAR(255) UNIQUE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  phone_number VARCHAR(20),
  
  -- Settings visible to this client
  show_pricing BOOLEAN DEFAULT true,
  show_time_tracking BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, project_id)
);

-- Client Feedback
CREATE TABLE client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  linked_phase_id UUID REFERENCES project_phases(id),
  client_id UUID REFERENCES clients(id),
  
  feedback_type VARCHAR(50), -- phase_rating, issue, suggestion, final_survey
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  
  -- Issue tracking
  is_issue BOOLEAN DEFAULT false,
  issue_priority VARCHAR(50), -- low, medium, high, urgent
  issue_status VARCHAR(50), -- open, in_progress, resolved, closed
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_phases_status ON project_phases(status);
CREATE INDEX idx_project_tasks_phase ON project_tasks(phase_id);
CREATE INDEX idx_project_deliveries_project ON project_deliveries(project_id);
CREATE INDEX idx_project_deliveries_status ON project_deliveries(status);
CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_entity ON project_files(entity_type, entity_id);
CREATE INDEX idx_project_updates_project ON project_updates(project_id);
CREATE INDEX idx_project_updates_created ON project_updates(created_at DESC);
CREATE INDEX idx_portal_access_client ON client_portal_access(client_id);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
```

---

## 6. Admin UI - Template Management

### Creating Project Templates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREATE PROJECT TEMPLATE                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Template Name: [Kitchen Renovation                    ]                    │
│  Description:   [Standard kitchen renovation project   ]                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  PHASES                                                      [+ Add Phase]  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ≡ 1. Initial Consultation                              [⚙️] [🗑️]    │   │
│  │   └─ Tasks: Site visit, Measurements, Initial quote                 │   │
│  │   └─ Client visible: Yes  │  Requires approval: No                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ≡ 2. Design & Selection                                [⚙️] [🗑️]    │   │
│  │   └─ Tasks: Material selection, Layout design, Design review        │   │
│  │   └─ Client visible: Yes  │  Requires approval: Yes                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ≡ 3. Ordering                                          [⚙️] [🗑️]    │   │
│  │   └─ Tasks: Place orders, Track deliveries, Receive materials       │   │
│  │   └─ Client visible: Yes  │  Requires approval: No                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ≡ 4. Installation                                      [⚙️] [🗑️]    │   │
│  │   └─ Tasks: Prep work, Installation, Quality check                  │   │
│  │   └─ Client visible: Yes  │  Requires approval: No                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ≡ 5. Final Walkthrough                                 [⚙️] [🗑️]    │   │
│  │   └─ Tasks: Client walkthrough, Punch list, Final sign-off          │   │
│  │   └─ Client visible: Yes  │  Requires approval: Yes                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CUSTOM FIELDS FOR PROJECTS USING THIS TEMPLATE            [+ Add Field]   │
│                                                                             │
│  │ Room Type        │ Dropdown  │ Kitchen, Bathroom, Living...│ Required │ │
│  │ Square Footage   │ Number    │                              │ Optional │ │
│  │ Existing Flooring│ Text      │                              │ Optional │ │
│                                                                             │
│                                              [Cancel]    [Save Template]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Configuration Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONFIGURE PHASE: Installation                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase Name: [Installation                        ]                         │
│  Description: [Tile and material installation     ]                         │
│                                                                             │
│  ☑️ Visible to client                                                       │
│  ☐ Requires client approval to complete                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DEFAULT TASKS                                               [+ Add Task]   │
│                                                                             │
│  ≡ Prep work                                              Visible ☑️        │
│  ≡ Material delivery confirmed                            Visible ☑️        │
│  ≡ Installation in progress                               Visible ☑️        │
│  ≡ Installation complete                                  Visible ☑️        │
│  ≡ Quality inspection                                     Visible ☐        │
│  ≡ Clean up                                               Visible ☐        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CUSTOM FIELDS FOR THIS PHASE                              [+ Add Field]   │
│                                                                             │
│  │ Lead Installer    │ Text      │ Visible ☐ │                             │
│  │ Start Date        │ Date      │ Visible ☑️ │                             │
│  │ Completion Date   │ Date      │ Visible ☑️ │                             │
│                                                                             │
│                                               [Cancel]    [Save Phase]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. API Structure

### Template Management
```
GET    /api/admin/templates                    - List all templates
POST   /api/admin/templates                    - Create template
GET    /api/admin/templates/:id                - Get template details
PUT    /api/admin/templates/:id                - Update template
DELETE /api/admin/templates/:id                - Delete template
POST   /api/admin/templates/:id/duplicate      - Duplicate template
```

### Projects
```
GET    /api/admin/projects                     - List projects (with filters)
POST   /api/admin/projects                     - Create project
GET    /api/admin/projects/:id                 - Get project details
PUT    /api/admin/projects/:id                 - Update project
DELETE /api/admin/projects/:id                 - Archive project

# Phases
POST   /api/admin/projects/:id/phases          - Add phase
PUT    /api/admin/projects/:id/phases/:phaseId - Update phase
DELETE /api/admin/projects/:id/phases/:phaseId - Remove phase
PUT    /api/admin/projects/:id/phases/reorder  - Reorder phases
POST   /api/admin/projects/:id/phases/:phaseId/complete - Mark complete

# Tasks
POST   /api/admin/phases/:phaseId/tasks        - Add task
PUT    /api/admin/tasks/:taskId                - Update task
DELETE /api/admin/tasks/:taskId                - Remove task
POST   /api/admin/tasks/:taskId/complete       - Mark complete

# Custom Fields
GET    /api/admin/projects/:id/fields          - Get field values
PUT    /api/admin/projects/:id/fields          - Update field values
```

### Deliveries
```
GET    /api/admin/projects/:id/deliveries      - List project deliveries
POST   /api/admin/projects/:id/deliveries      - Add delivery
PUT    /api/admin/deliveries/:id               - Update delivery
DELETE /api/admin/deliveries/:id               - Remove delivery
GET    /api/admin/deliveries                   - List all deliveries (dashboard)
```

### Change Orders
```
GET    /api/admin/projects/:id/change-orders   - List project COs
POST   /api/admin/projects/:id/change-orders   - Create CO
GET    /api/admin/change-orders/:id            - Get CO details
PUT    /api/admin/change-orders/:id            - Update CO
POST   /api/admin/change-orders/:id/send       - Send to client
POST   /api/admin/change-orders/:id/void       - Void CO
```

### Out of Scope
```
GET    /api/admin/projects/:id/out-of-scope    - List items
POST   /api/admin/projects/:id/out-of-scope    - Add item
PUT    /api/admin/out-of-scope/:id             - Update item
DELETE /api/admin/out-of-scope/:id             - Remove item
```

### Time Tracking
```
GET    /api/admin/projects/:id/time            - List time entries
POST   /api/admin/projects/:id/time            - Add entry
PUT    /api/admin/time/:id                     - Update entry
DELETE /api/admin/time/:id                     - Remove entry
GET    /api/admin/time                         - All entries (reports)
```

### Pricing & Payments
```
GET    /api/admin/projects/:id/line-items      - Get line items
POST   /api/admin/projects/:id/line-items      - Add line item
PUT    /api/admin/line-items/:id               - Update line item
DELETE /api/admin/line-items/:id               - Remove line item

GET    /api/admin/projects/:id/payments        - Get payments
POST   /api/admin/projects/:id/payments        - Add payment
PUT    /api/admin/payments/:id                 - Update payment
```

### Files
```
GET    /api/admin/projects/:id/files           - List files
POST   /api/admin/projects/:id/files           - Upload file
PUT    /api/admin/files/:id                    - Update file metadata
DELETE /api/admin/files/:id                    - Delete file
POST   /api/admin/files/:id/request-signature  - Request signature
```

### Client Portal
```
# Auth
POST   /api/portal/login                       - Login
POST   /api/portal/logout                      - Logout
POST   /api/portal/forgot-password             - Request reset
POST   /api/portal/reset-password              - Reset password

# Project
GET    /api/portal/projects                    - Client's projects
GET    /api/portal/projects/:id                - Project details
GET    /api/portal/projects/:id/progress       - Progress/phases
GET    /api/portal/projects/:id/updates        - Updates feed
GET    /api/portal/projects/:id/photos         - Photos
GET    /api/portal/projects/:id/files          - Documents
GET    /api/portal/projects/:id/deliveries     - Deliveries

# Actions
POST   /api/portal/projects/:id/messages       - Send message
POST   /api/portal/change-orders/:id/approve   - Approve CO
POST   /api/portal/change-orders/:id/reject    - Reject CO
POST   /api/portal/out-of-scope/:id/acknowledge - Acknowledge item
POST   /api/portal/phases/:id/approve          - Approve phase
POST   /api/portal/files/:id/sign              - Sign document
POST   /api/portal/projects/:id/feedback       - Submit feedback
```

---

## 8. Implementation Priority

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema for projects, phases, tasks
- [ ] Project CRUD operations
- [ ] Phase and task management
- [ ] Basic admin project list and detail views
- [ ] Simple progress calculation

### Phase 2: Templates & Customization (Week 3)
- [ ] Project templates CRUD
- [ ] Template-based project creation
- [ ] Custom field definitions
- [ ] Custom field values management

### Phase 3: Files & Updates (Week 4)
- [ ] File upload infrastructure
- [ ] File management UI
- [ ] Project updates/activity feed
- [ ] Photo gallery

### Phase 4: Client Portal (Week 5-6)
- [ ] Portal authentication
- [ ] Portal dashboard
- [ ] Progress view
- [ ] Files/photos view
- [ ] Updates feed
- [ ] Messaging

### Phase 5: Deliveries & Change Orders (Week 7-8)
- [ ] Delivery tracking
- [ ] Change order management
- [ ] Client approval workflow
- [ ] Signature capture

### Phase 6: Additional Modules (Week 9-10)
- [ ] Out of scope tracking
- [ ] Time tracking
- [ ] Pricing and payments
- [ ] Client feedback

### Phase 7: Polish & Launch (Week 11-12)
- [ ] Email notifications
- [ ] Mobile optimization
- [ ] Testing
- [ ] Documentation

---

## 9. Configuration Options

### Portal Settings Per Project
| Setting | Default | Description |
|---------|---------|-------------|
| Show pricing | Yes | Display budget/payment info |
| Show time tracking | No | Display logged hours |
| Show detailed progress | Yes | Show task-level detail vs phase-only |
| Allow messages | Yes | Enable client messaging |
| Allow file uploads | No | Let clients upload files |
| Email on updates | Yes | Send email for new updates |

### Phase Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Client visible | Yes | Show this phase in portal |
| Requires approval | No | Require client sign-off |
| Show tasks | Yes | Display individual tasks |

### Task Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Client visible | Yes | Show this task in portal |
| Requires approval | No | Require client acknowledgment |

---

## 10. Future Considerations

### Potential Additions
- Multi-project client view (for repeat clients)
- Subcontractor portal access
- Automated reminders and notifications
- Calendar integration (Google, Outlook)
- Inventory/material tracking
- Integration with accounting software
- Mobile app for field updates
- Automated progress reports (weekly summary emails)

### Reporting Ideas
- Project profitability analysis
- Average time per phase type
- Delivery reliability by vendor
- Client satisfaction trends
- Team utilization

---

*Document Version: 2.0*
*Approach: Flexible/Customizable*
