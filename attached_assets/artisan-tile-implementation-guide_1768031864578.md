# Artisan Tile Client Portal - Replit Implementation Guide

## Quick Start for Replit

This guide provides the technical implementation details for building the Client Portal feature in Replit, integrating with your existing Artisan Tile application.

---

## 1. Project Structure

```
artisan-tile-app/
├── client/                          # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/               # Admin-only components
│   │   │   │   ├── projects/
│   │   │   │   │   ├── ProjectList.tsx
│   │   │   │   │   ├── ProjectDetail.tsx
│   │   │   │   │   ├── ProjectPipeline.tsx
│   │   │   │   │   ├── ProjectForm.tsx
│   │   │   │   │   ├── PhaseManager.tsx
│   │   │   │   │   └── SubstageChecklist.tsx
│   │   │   │   ├── updates/
│   │   │   │   │   ├── UpdateComposer.tsx
│   │   │   │   │   ├── UpdateList.tsx
│   │   │   │   │   └── UpdateTemplates.tsx
│   │   │   │   ├── photos/
│   │   │   │   │   ├── PhotoUploader.tsx
│   │   │   │   │   └── PhotoManager.tsx
│   │   │   │   ├── feedback/
│   │   │   │   │   ├── FeedbackDashboard.tsx
│   │   │   │   │   └── IssueTracker.tsx
│   │   │   │   └── reports/
│   │   │   │       ├── PipelineReport.tsx
│   │   │   │       └── SatisfactionReport.tsx
│   │   │   │
│   │   │   ├── portal/              # Client portal components
│   │   │   │   ├── PortalLayout.tsx
│   │   │   │   ├── PortalDashboard.tsx
│   │   │   │   ├── ProgressTimeline.tsx
│   │   │   │   ├── PhaseDetail.tsx
│   │   │   │   ├── UpdateFeed.tsx
│   │   │   │   ├── PhotoGallery.tsx
│   │   │   │   ├── DocumentLibrary.tsx
│   │   │   │   ├── SelectionsList.tsx
│   │   │   │   ├── AppointmentCalendar.tsx
│   │   │   │   ├── MessageThread.tsx
│   │   │   │   ├── ApprovalQueue.tsx
│   │   │   │   ├── FeedbackForm.tsx
│   │   │   │   └── PaymentSummary.tsx
│   │   │   │
│   │   │   ├── shared/              # Shared components
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── TimelineNode.tsx
│   │   │   │   ├── PhotoCard.tsx
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── ConfirmDialog.tsx
│   │   │   │
│   │   │   └── ui/                  # Base UI components (shadcn/ui style)
│   │   │
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── ProjectsPage.tsx
│   │   │   │   ├── ProjectDetailPage.tsx
│   │   │   │   └── ReportsPage.tsx
│   │   │   │
│   │   │   └── portal/
│   │   │       ├── PortalLoginPage.tsx
│   │   │       ├── PortalHomePage.tsx
│   │   │       └── PortalProjectPage.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useProject.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useUpdates.ts
│   │   │   ├── usePortalAuth.ts
│   │   │   └── useNotifications.ts
│   │   │
│   │   ├── services/
│   │   │   ├── projectService.ts
│   │   │   ├── updateService.ts
│   │   │   ├── photoService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── feedbackService.ts
│   │   │   └── portalAuthService.ts
│   │   │
│   │   ├── types/
│   │   │   ├── project.ts
│   │   │   ├── phase.ts
│   │   │   ├── update.ts
│   │   │   ├── feedback.ts
│   │   │   └── portal.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   ├── progressUtils.ts
│   │   │   └── formatters.ts
│   │   │
│   │   └── App.tsx
│   │
│   └── package.json
│
├── server/                          # Express Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── admin/
│   │   │   │   ├── projects.ts
│   │   │   │   ├── updates.ts
│   │   │   │   ├── photos.ts
│   │   │   │   ├── documents.ts
│   │   │   │   ├── feedback.ts
│   │   │   │   ├── appointments.ts
│   │   │   │   ├── changeOrders.ts
│   │   │   │   ├── payments.ts
│   │   │   │   └── reports.ts
│   │   │   │
│   │   │   └── portal/
│   │   │       ├── auth.ts
│   │   │       ├── projects.ts
│   │   │       ├── updates.ts
│   │   │       ├── photos.ts
│   │   │       ├── documents.ts
│   │   │       ├── appointments.ts
│   │   │       ├── approvals.ts
│   │   │       ├── feedback.ts
│   │   │       └── notifications.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── projectController.ts
│   │   │   ├── updateController.ts
│   │   │   ├── photoController.ts
│   │   │   ├── documentController.ts
│   │   │   ├── feedbackController.ts
│   │   │   ├── appointmentController.ts
│   │   │   ├── approvalController.ts
│   │   │   ├── notificationController.ts
│   │   │   └── portalAuthController.ts
│   │   │
│   │   ├── services/
│   │   │   ├── projectService.ts
│   │   │   ├── phaseService.ts
│   │   │   ├── updateService.ts
│   │   │   ├── photoService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── feedbackService.ts
│   │   │   ├── emailService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── fileUploadService.ts
│   │   │
│   │   ├── models/
│   │   │   ├── Project.ts
│   │   │   ├── ProjectPhase.ts
│   │   │   ├── ProjectSubstage.ts
│   │   │   ├── ProjectUpdate.ts
│   │   │   ├── ProjectPhoto.ts
│   │   │   ├── ProjectDocument.ts
│   │   │   ├── ProjectSelection.ts
│   │   │   ├── ProjectAppointment.ts
│   │   │   ├── ProjectFeedback.ts
│   │   │   ├── ChangeOrder.ts
│   │   │   ├── ProjectPayment.ts
│   │   │   ├── ClientPortalAccess.ts
│   │   │   └── Notification.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── adminAuth.ts
│   │   │   ├── portalAuth.ts
│   │   │   ├── validateProject.ts
│   │   │   └── fileUpload.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── progressCalculator.ts
│   │   │   ├── emailTemplates.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── index.ts
│   │
│   └── package.json
│
├── shared/                          # Shared types/constants
│   ├── types.ts
│   └── constants.ts
│
├── migrations/                      # Database migrations
│   ├── 001_create_projects.sql
│   ├── 002_create_phases.sql
│   ├── 003_create_updates.sql
│   ├── 004_create_photos.sql
│   ├── 005_create_documents.sql
│   ├── 006_create_selections.sql
│   ├── 007_create_appointments.sql
│   ├── 008_create_feedback.sql
│   ├── 009_create_change_orders.sql
│   ├── 010_create_payments.sql
│   ├── 011_create_portal_access.sql
│   └── 012_create_notifications.sql
│
└── seeds/                           # Seed data
    ├── phase_templates.sql
    └── substage_templates.sql
```

---

## 2. Database Migrations

### Migration 001: Projects Table

```sql
-- migrations/001_create_projects.sql

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  current_phase_id UUID,
  overall_progress INTEGER DEFAULT 0,
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
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
```

### Migration 002: Phases Tables

```sql
-- migrations/002_create_phases.sql

-- Phase templates (reusable definitions)
CREATE TABLE IF NOT EXISTS phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Substage templates
CREATE TABLE IF NOT EXISTS substage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id UUID REFERENCES phase_templates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_order INTEGER,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project phases (instances for each project)
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_template_id UUID REFERENCES phase_templates(id),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_duration_days INTEGER,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project substages (instances)
CREATE TABLE IF NOT EXISTS project_substages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  substage_template_id UUID REFERENCES substage_templates(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  display_order INTEGER,
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key for current_phase_id now that project_phases exists
ALTER TABLE projects 
ADD CONSTRAINT fk_current_phase 
FOREIGN KEY (current_phase_id) REFERENCES project_phases(id);

CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_substages_phase ON project_substages(project_phase_id);
```

### Migration 003: Updates Table

```sql
-- migrations/003_create_updates.sql

CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_phase_id UUID REFERENCES project_phases(id),
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  update_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content TEXT,
  is_internal BOOLEAN DEFAULT false,
  is_read_by_client BOOLEAN DEFAULT false,
  is_read_by_admin BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_updates_project ON project_updates(project_id);
CREATE INDEX idx_project_updates_created ON project_updates(created_at DESC);
CREATE INDEX idx_project_updates_type ON project_updates(update_type);
```

---

## 3. Seed Data

### Phase Templates

```sql
-- seeds/phase_templates.sql

-- Insert phase templates
INSERT INTO phase_templates (id, name, description, default_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Inquiry', 'Initial contact and consultation phase', 1),
  ('22222222-2222-2222-2222-222222222222', 'Design & Selection', 'Tile selection and design phase', 2),
  ('33333333-3333-3333-3333-333333333333', 'Ordering', 'Material ordering and delivery phase', 3),
  ('44444444-4444-4444-4444-444444444444', 'Installation', 'Tile installation phase', 4),
  ('55555555-5555-5555-5555-555555555555', 'Complete', 'Project completion and warranty', 5);

-- Insert substage templates for Inquiry phase
INSERT INTO substage_templates (phase_template_id, name, description, default_order, requires_approval) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Initial Contact', 'First contact with client', 1, false),
  ('11111111-1111-1111-1111-111111111111', 'Consultation Scheduled', 'In-person or virtual consultation scheduled', 2, false),
  ('11111111-1111-1111-1111-111111111111', 'Site Visit Complete', 'On-site measurements and assessment', 3, false),
  ('11111111-1111-1111-1111-111111111111', 'Quote Provided', 'Estimate sent to client', 4, false),
  ('11111111-1111-1111-1111-111111111111', 'Contract Signed', 'Agreement signed by client', 5, true);

-- Insert substage templates for Design & Selection phase
INSERT INTO substage_templates (phase_template_id, name, description, default_order, requires_approval) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Tile Selection', 'Client selects tiles from samples', 1, false),
  ('22222222-2222-2222-2222-222222222222', 'Layout Design', 'Design team creates layout', 2, false),
  ('22222222-2222-2222-2222-222222222222', 'Design Review', 'Client reviews design mockups', 3, false),
  ('22222222-2222-2222-2222-222222222222', 'Design Approved', 'Client approves final design', 4, true);

-- Insert substage templates for Ordering phase
INSERT INTO substage_templates (phase_template_id, name, description, default_order, requires_approval) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Materials Ordered', 'Order placed with supplier', 1, false),
  ('33333333-3333-3333-3333-333333333333', 'In Production', 'Materials being manufactured', 2, false),
  ('33333333-3333-3333-3333-333333333333', 'Shipped', 'Materials shipped', 3, false),
  ('33333333-3333-3333-3333-333333333333', 'Delivered', 'Materials received at warehouse or site', 4, false);

-- Insert substage templates for Installation phase
INSERT INTO substage_templates (phase_template_id, name, description, default_order, requires_approval) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Prep Scheduled', 'Site preparation date set', 1, false),
  ('44444444-4444-4444-4444-444444444444', 'Prep Complete', 'Site prepared for installation', 2, false),
  ('44444444-4444-4444-4444-444444444444', 'Installation Scheduled', 'Installation dates confirmed', 3, false),
  ('44444444-4444-4444-4444-444444444444', 'Installation In Progress', 'Active installation work', 4, false),
  ('44444444-4444-4444-4444-444444444444', 'Final Inspection', 'Quality check and inspection', 5, false);

-- Insert substage templates for Complete phase
INSERT INTO substage_templates (phase_template_id, name, description, default_order, requires_approval) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Final Walkthrough', 'Walkthrough with client', 1, false),
  ('55555555-5555-5555-5555-555555555555', 'Client Sign-off', 'Client approves completed work', 2, true),
  ('55555555-5555-5555-5555-555555555555', 'Warranty Issued', 'Warranty documents provided', 3, false),
  ('55555555-5555-5555-5555-555555555555', 'Review Requested', 'Request for client review/testimonial', 4, false);
```

---

## 4. Key TypeScript Types

```typescript
// shared/types.ts

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type SubstageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type UpdateType = 'status_change' | 'note' | 'photo' | 'document' | 'message' | 'milestone' | 'feedback';
export type FeedbackType = 'phase_rating' | 'issue' | 'suggestion' | 'final_survey';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  projectType?: string;
  status: ProjectStatus;
  currentPhaseId?: string;
  overallProgress: number;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budgetEstimate?: number;
  budgetActual?: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Populated relations
  client?: Client;
  phases?: ProjectPhase[];
  currentPhase?: ProjectPhase;
  team?: ProjectTeamMember[];
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  phaseTemplateId: string;
  name: string;
  status: PhaseStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  estimatedDurationDays?: number;
  displayOrder: number;
  createdAt: string;
  
  // Populated
  substages?: ProjectSubstage[];
}

export interface ProjectSubstage {
  id: string;
  projectPhaseId: string;
  substageTemplateId: string;
  name: string;
  description?: string;
  status: SubstageStatus;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  requiresApproval: boolean;
  approvedAt?: string;
  approvedBy?: string;
  displayOrder: number;
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  projectPhaseId?: string;
  userId?: string;
  clientId?: string;
  updateType: UpdateType;
  title?: string;
  content?: string;
  isInternal: boolean;
  isReadByClient: boolean;
  isReadByAdmin: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  
  // Populated
  user?: User;
  client?: Client;
  phase?: ProjectPhase;
  photos?: ProjectPhoto[];
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  projectPhaseId?: string;
  updateId?: string;
  uploadedByUserId?: string;
  uploadedByClientId?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  filename?: string;
  caption?: string;
  photoType?: string;
  isVisibleToClient: boolean;
  displayOrder?: number;
  takenAt?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  projectPhaseId?: string;
  uploadedBy: string;
  documentType: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  previousVersionId?: string;
  requiresSignature: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureData?: string;
  isVisibleToClient: boolean;
  createdAt: string;
}

export interface ProjectFeedback {
  id: string;
  projectId: string;
  projectPhaseId?: string;
  clientId: string;
  feedbackType: FeedbackType;
  rating?: number;
  title?: string;
  content?: string;
  isIssue: boolean;
  issuePriority?: IssuePriority;
  issueStatus?: IssueStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  isPublicTestimonial: boolean;
  createdAt: string;
}

export interface ClientPortalAccess {
  id: string;
  clientId: string;
  projectId: string;
  accessToken?: string;
  lastLogin?: string;
  isActive: boolean;
  notificationEmail: boolean;
  notificationSms: boolean;
  phoneNumber?: string;
  createdAt: string;
}

// API Response types
export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectDetailResponse {
  project: Project;
  phases: ProjectPhase[];
  recentUpdates: ProjectUpdate[];
  pendingApprovals: ProjectSubstage[];
  team: ProjectTeamMember[];
}

export interface PortalDashboardResponse {
  project: Project;
  currentPhase: ProjectPhase;
  overallProgress: number;
  pendingActions: PendingAction[];
  recentUpdates: ProjectUpdate[];
  upcomingAppointments: ProjectAppointment[];
}

export interface PendingAction {
  id: string;
  type: 'approval' | 'signature' | 'feedback' | 'confirmation';
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'normal' | 'high';
  entityId: string;
  entityType: string;
}
```

---

## 5. Key API Route Examples

### Admin Project Routes

```typescript
// server/src/routes/admin/projects.ts

import { Router } from 'express';
import { ProjectController } from '../../controllers/projectController';
import { adminAuth } from '../../middleware/adminAuth';

const router = Router();
const controller = new ProjectController();

// All routes require admin authentication
router.use(adminAuth);

// List all projects with filters
router.get('/', controller.list);

// Get pipeline view data
router.get('/pipeline', controller.getPipeline);

// Create new project
router.post('/', controller.create);

// Get single project
router.get('/:id', controller.getById);

// Update project
router.put('/:id', controller.update);

// Delete/archive project
router.delete('/:id', controller.archive);

// Phase management
router.put('/:id/phases/:phaseId', controller.updatePhase);
router.post('/:id/phases/:phaseId/complete', controller.completePhase);
router.post('/:id/advance', controller.advancePhase);

// Substage management
router.put('/:id/substages/:substageId', controller.updateSubstage);
router.post('/:id/substages/:substageId/complete', controller.completeSubstage);

// Portal access management
router.post('/:id/portal-access', controller.createPortalAccess);
router.post('/:id/portal-access/send-invite', controller.sendPortalInvite);

export default router;
```

### Client Portal Routes

```typescript
// server/src/routes/portal/projects.ts

import { Router } from 'express';
import { PortalProjectController } from '../../controllers/portalProjectController';
import { portalAuth } from '../../middleware/portalAuth';

const router = Router();
const controller = new PortalProjectController();

// All routes require portal authentication
router.use(portalAuth);

// Get client's projects
router.get('/', controller.list);

// Get project details (only if client has access)
router.get('/:id', controller.getById);

// Get project timeline
router.get('/:id/timeline', controller.getTimeline);

// Get project updates
router.get('/:id/updates', controller.getUpdates);

// Send message
router.post('/:id/messages', controller.sendMessage);

// Mark updates as read
router.put('/:id/updates/read', controller.markUpdatesRead);

export default router;
```

---

## 6. Key Component Examples

### Progress Timeline Component

```tsx
// client/src/components/portal/ProgressTimeline.tsx

import React from 'react';
import { ProjectPhase, PhaseStatus } from '@/types/project';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface ProgressTimelineProps {
  phases: ProjectPhase[];
  currentPhaseId?: string;
  onPhaseClick?: (phase: ProjectPhase) => void;
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  phases,
  currentPhaseId,
  onPhaseClick,
}) => {
  const getPhaseIcon = (phase: ProjectPhase) => {
    if (phase.status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (phase.id === currentPhaseId || phase.status === 'in_progress') {
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    }
    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  const getLineColor = (index: number) => {
    const currentIndex = phases.findIndex(p => p.id === currentPhaseId);
    if (index < currentIndex) return 'bg-green-500';
    if (index === currentIndex) return 'bg-blue-500';
    return 'bg-gray-200';
  };

  return (
    <div className="w-full">
      {/* Desktop Timeline */}
      <div className="hidden md:flex items-center justify-between">
        {phases.map((phase, index) => (
          <React.Fragment key={phase.id}>
            {/* Phase Node */}
            <div
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onPhaseClick?.(phase)}
            >
              <div className="relative">
                {getPhaseIcon(phase)}
                {phase.status === 'in_progress' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className={`mt-2 text-sm font-medium ${
                phase.status === 'completed' ? 'text-green-600' :
                phase.status === 'in_progress' ? 'text-blue-600' :
                'text-gray-400'
              }`}>
                {phase.name}
              </span>
              {phase.status === 'completed' && phase.completedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(phase.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Connector Line */}
            {index < phases.length - 1 && (
              <div className={`flex-1 h-1 mx-4 rounded ${getLineColor(index)}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile Timeline (Vertical) */}
      <div className="md:hidden space-y-4">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className="flex items-start cursor-pointer"
            onClick={() => onPhaseClick?.(phase)}
          >
            <div className="flex flex-col items-center mr-4">
              {getPhaseIcon(phase)}
              {index < phases.length - 1 && (
                <div className={`w-0.5 h-12 mt-2 ${getLineColor(index)}`} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h3 className={`font-medium ${
                phase.status === 'completed' ? 'text-green-600' :
                phase.status === 'in_progress' ? 'text-blue-600' :
                'text-gray-400'
              }`}>
                {phase.name}
              </h3>
              {phase.status === 'in_progress' && (
                <p className="text-sm text-gray-500">In Progress</p>
              )}
              {phase.status === 'completed' && phase.completedAt && (
                <p className="text-sm text-gray-400">
                  Completed {new Date(phase.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Update Feed Component

```tsx
// client/src/components/portal/UpdateFeed.tsx

import React from 'react';
import { ProjectUpdate } from '@/types/project';
import { 
  MessageSquare, 
  Camera, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Clock 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UpdateFeedProps {
  updates: ProjectUpdate[];
  onReply?: (update: ProjectUpdate) => void;
}

export const UpdateFeed: React.FC<UpdateFeedProps> = ({ updates, onReply }) => {
  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'photo': return <Camera className="w-5 h-5 text-purple-500" />;
      case 'document': return <FileText className="w-5 h-5 text-orange-500" />;
      case 'milestone': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'status_change': return <Clock className="w-5 h-5 text-gray-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (updates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No updates yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <div
          key={update.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getUpdateIcon(update.updateType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-gray-900 truncate">
                  {update.title || getDefaultTitle(update.updateType)}
                </h4>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              {update.content && (
                <p className="mt-1 text-gray-600 text-sm">{update.content}</p>
              )}

              {/* Photo thumbnails if photo update */}
              {update.updateType === 'photo' && update.photos && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {update.photos.slice(0, 4).map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.thumbnailUrl || photo.fileUrl}
                      alt={photo.caption || 'Project photo'}
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                    />
                  ))}
                  {update.photos.length > 4 && (
                    <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
                      +{update.photos.length - 4} more
                    </div>
                  )}
                </div>
              )}

              {/* Reply button for messages */}
              {update.updateType === 'message' && onReply && (
                <button
                  onClick={() => onReply(update)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getDefaultTitle = (type: string): string => {
  switch (type) {
    case 'message': return 'New Message';
    case 'photo': return 'Photos Added';
    case 'document': return 'Document Added';
    case 'milestone': return 'Milestone Completed';
    case 'status_change': return 'Status Update';
    default: return 'Update';
  }
};
```

---

## 7. Environment Variables

```env
# .env.example

# Database
DATABASE_URL=postgresql://user:password@host:5432/artisan_tile

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d
PORTAL_JWT_SECRET=your-portal-jwt-secret-here
PORTAL_JWT_EXPIRES_IN=30d

# File Storage (Replit Object Storage or S3)
STORAGE_TYPE=replit # or 's3'
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email
EMAIL_PROVIDER=resend # or 'sendgrid'
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@artisantile.com

# Application
APP_URL=https://your-app.replit.app
PORTAL_URL=https://your-app.replit.app/portal

# Optional: SMS
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 8. Replit Configuration

```toml
# .replit

run = "npm run dev"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run start"]
build = ["sh", "-c", "npm run build"]

[[ports]]
localPort = 3000
externalPort = 80

[[ports]]
localPort = 5000
externalPort = 5000
```

```json
// replit.nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.postgresql
    pkgs.nodePackages.typescript
  ];
}
```

---

## 9. Testing Checklist

### Phase 1: Foundation
- [ ] Projects table created and seeded
- [ ] Phase templates populated
- [ ] CRUD operations working for projects
- [ ] Phase progression working
- [ ] Client portal auth functional

### Phase 2: Client Portal Core
- [ ] Client can log in
- [ ] Dashboard shows project overview
- [ ] Timeline displays correctly
- [ ] Updates feed populates
- [ ] Mobile responsive

### Phase 3: Communication
- [ ] Clients can send messages
- [ ] Admins can post updates
- [ ] Photos upload and display
- [ ] Documents accessible
- [ ] Email notifications send

### Phase 4: Advanced Features
- [ ] Approvals workflow functions
- [ ] Feedback collection works
- [ ] Appointments display
- [ ] Pipeline view accurate

### Phase 5: Polish
- [ ] All notifications working
- [ ] Reports generating
- [ ] Performance acceptable
- [ ] Error handling complete

---

## 10. Launch Checklist

- [ ] All migrations run successfully
- [ ] Seed data populated
- [ ] Environment variables configured
- [ ] Email sending tested
- [ ] File upload tested
- [ ] Portal login tested with real client
- [ ] Admin can create project end-to-end
- [ ] Client receives invite email
- [ ] Client can view project progress
- [ ] Mobile tested on iOS and Android
- [ ] Error logging configured
- [ ] Backup strategy in place

---

*This implementation guide should be used alongside the main PRD document.*
