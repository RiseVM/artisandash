# Artisan Tile Client Portal - Implementation Guide v2
## Customizable Project Tracker for Interior Design & Renovation

---

## 1. Quick Reference: What Makes This Flexible

| Component | Customizable By | How |
|-----------|-----------------|-----|
| **Phases** | Admin per project | Add, rename, reorder, remove |
| **Tasks** | Admin per phase | Checklist items within phases |
| **Fields** | Admin via templates | Text, number, date, dropdown, etc. |
| **Visibility** | Admin per item | What client sees vs internal |
| **Approval** | Admin per phase/task | Which items need sign-off |

The system doesn't assume workflow - it lets Artisan Tile define it.

---

## 2. Project Structure

```
artisan-tile-app/
├── client/
│   └── src/
│       ├── components/
│       │   ├── admin/
│       │   │   ├── projects/
│       │   │   │   ├── ProjectList.tsx
│       │   │   │   ├── ProjectDetail.tsx
│       │   │   │   ├── ProjectForm.tsx
│       │   │   │   ├── PhaseManager.tsx
│       │   │   │   ├── TaskList.tsx
│       │   │   │   └── CustomFieldEditor.tsx
│       │   │   ├── templates/
│       │   │   │   ├── TemplateList.tsx
│       │   │   │   ├── TemplateBuilder.tsx
│       │   │   │   └── PhaseTemplateEditor.tsx
│       │   │   ├── deliveries/
│       │   │   │   ├── DeliveryList.tsx
│       │   │   │   ├── DeliveryForm.tsx
│       │   │   │   └── DeliveryTracker.tsx
│       │   │   ├── change-orders/
│       │   │   │   ├── ChangeOrderList.tsx
│       │   │   │   ├── ChangeOrderForm.tsx
│       │   │   │   └── ChangeOrderDetail.tsx
│       │   │   ├── time-tracking/
│       │   │   │   ├── TimeEntryList.tsx
│       │   │   │   └── TimeEntryForm.tsx
│       │   │   ├── pricing/
│       │   │   │   ├── LineItemEditor.tsx
│       │   │   │   ├── PaymentTracker.tsx
│       │   │   │   └── PricingSummary.tsx
│       │   │   └── files/
│       │   │       ├── FileManager.tsx
│       │   │       ├── FileUploader.tsx
│       │   │       └── PhotoGallery.tsx
│       │   │
│       │   ├── portal/
│       │   │   ├── PortalLayout.tsx
│       │   │   ├── PortalDashboard.tsx
│       │   │   ├── ProgressView.tsx
│       │   │   ├── PhaseCard.tsx
│       │   │   ├── DeliveryStatus.tsx
│       │   │   ├── ChangeOrderApproval.tsx
│       │   │   ├── DocumentLibrary.tsx
│       │   │   ├── PhotoGallery.tsx
│       │   │   ├── MessageCenter.tsx
│       │   │   └── FeedbackForm.tsx
│       │   │
│       │   └── shared/
│       │       ├── ProgressBar.tsx
│       │       ├── StatusBadge.tsx
│       │       ├── SignatureCapture.tsx
│       │       ├── FileCard.tsx
│       │       ├── DraggableList.tsx
│       │       └── CustomFieldRenderer.tsx
│       │
│       ├── hooks/
│       │   ├── useProject.ts
│       │   ├── usePhases.ts
│       │   ├── useDeliveries.ts
│       │   ├── useChangeOrders.ts
│       │   ├── useTimeEntries.ts
│       │   ├── useFiles.ts
│       │   ├── useCustomFields.ts
│       │   └── usePortalAuth.ts
│       │
│       ├── services/
│       │   ├── api.ts                 # Base API client
│       │   ├── projectService.ts
│       │   ├── templateService.ts
│       │   ├── phaseService.ts
│       │   ├── deliveryService.ts
│       │   ├── changeOrderService.ts
│       │   ├── timeService.ts
│       │   ├── pricingService.ts
│       │   ├── fileService.ts
│       │   └── portalService.ts
│       │
│       └── types/
│           ├── project.ts
│           ├── template.ts
│           ├── phase.ts
│           ├── delivery.ts
│           ├── changeOrder.ts
│           ├── time.ts
│           ├── pricing.ts
│           ├── file.ts
│           └── customField.ts
│
├── server/
│   └── src/
│       ├── routes/
│       │   ├── admin/
│       │   │   ├── projects.ts
│       │   │   ├── templates.ts
│       │   │   ├── phases.ts
│       │   │   ├── tasks.ts
│       │   │   ├── deliveries.ts
│       │   │   ├── changeOrders.ts
│       │   │   ├── outOfScope.ts
│       │   │   ├── timeEntries.ts
│       │   │   ├── lineItems.ts
│       │   │   ├── payments.ts
│       │   │   ├── files.ts
│       │   │   └── customFields.ts
│       │   │
│       │   └── portal/
│       │       ├── auth.ts
│       │       ├── projects.ts
│       │       ├── approvals.ts
│       │       ├── messages.ts
│       │       └── feedback.ts
│       │
│       ├── services/
│       │   ├── projectService.ts
│       │   ├── phaseService.ts
│       │   ├── progressService.ts      # Calculate progress
│       │   ├── deliveryService.ts
│       │   ├── changeOrderService.ts
│       │   ├── fileService.ts
│       │   ├── emailService.ts
│       │   └── notificationService.ts
│       │
│       └── middleware/
│           ├── adminAuth.ts
│           ├── portalAuth.ts
│           └── fileUpload.ts
│
└── migrations/
    └── [SQL files]
```

---

## 3. TypeScript Types

```typescript
// types/project.ts

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PhaseStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'skipped';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Project {
  id: string;
  templateId?: string;
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  
  // Location
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  
  // Dates
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Pricing
  originalEstimate?: number;
  
  // Progress
  overallProgress: number;
  currentPhaseId?: string;
  
  // Internal
  internalNotes?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (when populated)
  client?: Client;
  phases?: Phase[];
  currentPhase?: Phase;
  customFields?: CustomFieldValue[];
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  displayOrder: number;
  status: PhaseStatus;
  
  // Settings
  clientVisible: boolean;
  requiresApproval: boolean;
  
  // Approval
  approvedAt?: string;
  approvedBy?: string;
  approvalSignature?: string;
  
  // Dates
  startedAt?: string;
  completedAt?: string;
  estimatedStart?: string;
  estimatedEnd?: string;
  
  // Progress
  progress: number;
  
  // Relations
  tasks?: Task[];
  customFields?: CustomFieldValue[];
  files?: ProjectFile[];
}

export interface Task {
  id: string;
  phaseId: string;
  name: string;
  description?: string;
  displayOrder: number;
  status: TaskStatus;
  
  // Assignment
  assignedTo?: string;
  
  // Dates
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  
  // Settings
  clientVisible: boolean;
  requiresApproval: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

// types/customField.ts

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'dropdown' 
  | 'checkbox' 
  | 'file' 
  | 'url' 
  | 'contact';

export interface CustomFieldDefinition {
  id: string;
  entityType: 'project' | 'phase' | 'task';
  templateId?: string;
  name: string;
  fieldType: FieldType;
  options?: string[];  // For dropdowns
  isRequired: boolean;
  clientVisible: boolean;
  displayOrder: number;
}

export interface CustomFieldValue {
  id: string;
  fieldDefinitionId: string;
  entityType: 'project' | 'phase' | 'task';
  entityId: string;
  
  // Value storage (only one will be populated)
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBoolean?: boolean;
  valueJson?: any;
  
  // Populated
  definition?: CustomFieldDefinition;
}

// types/delivery.ts

export type DeliveryStatus = 
  | 'ordered' 
  | 'shipped' 
  | 'in_transit' 
  | 'delivered' 
  | 'delayed' 
  | 'cancelled';

export interface Delivery {
  id: string;
  projectId: string;
  linkedPhaseId?: string;
  
  description: string;
  vendor?: string;
  
  status: DeliveryStatus;
  
  expectedDate: string;
  actualDate?: string;
  
  trackingNumber?: string;
  carrier?: string;
  
  cost?: number;
  
  notes?: string;
  delayReason?: string;
  
  clientVisible: boolean;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  phase?: Phase;
  files?: ProjectFile[];
}

// types/changeOrder.ts

export type ChangeOrderStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'void';

export type ChangeOrderReason = 
  | 'client_request' 
  | 'unforeseen_condition' 
  | 'design_change' 
  | 'error_correction' 
  | 'other';

export interface ChangeOrder {
  id: string;
  projectId: string;
  linkedPhaseId?: string;
  
  coNumber: number;
  
  title: string;
  description: string;
  reason?: ChangeOrderReason;
  
  costImpact: number;
  timeImpact?: string;
  
  status: ChangeOrderStatus;
  
  requestedDate: string;
  sentDate?: string;
  responseDate?: string;
  
  approvedBy?: string;
  approvalSignature?: string;
  rejectionReason?: string;
  
  internalNotes?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  files?: ProjectFile[];
}

// types/time.ts

export interface TimeEntry {
  id: string;
  projectId: string;
  linkedPhaseId?: string;
  userId: string;
  
  entryDate: string;
  hours: number;
  
  category?: string;
  description?: string;
  
  isBillable: boolean;
  hourlyRate?: number;
  
  clientVisible: boolean;
  
  createdAt: string;
  
  // Relations
  user?: User;
  phase?: Phase;
}

// types/pricing.ts

export interface LineItem {
  id: string;
  projectId: string;
  linkedPhaseId?: string;
  linkedChangeOrderId?: string;
  
  category: 'materials' | 'labor' | 'other';
  description: string;
  
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total: number;
  
  notes?: string;
  
  clientVisible: boolean;
  displayOrder: number;
}

export interface Payment {
  id: string;
  projectId: string;
  
  description: string;
  amount: number;
  
  dueDate?: string;
  paidDate?: string;
  
  status: 'pending' | 'paid' | 'overdue' | 'waived' | 'refunded';
  
  paymentMethod?: string;
  referenceNumber?: string;
  
  notes?: string;
}

// types/file.ts

export interface ProjectFile {
  id: string;
  projectId: string;
  
  entityType?: 'project' | 'phase' | 'task' | 'delivery' | 'change_order';
  entityId?: string;
  
  name: string;
  originalFilename: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  
  category: 'contracts' | 'design' | 'selections' | 'photos' | 'invoices' | 'warranties' | 'other';
  description?: string;
  
  // Photo specific
  isPhoto: boolean;
  thumbnailUrl?: string;
  photoType?: 'before' | 'during' | 'after';
  takenAt?: string;
  
  // Versioning
  version: number;
  previousVersionId?: string;
  
  // Visibility
  clientVisible: boolean;
  
  // Signatures
  requiresSignature: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureData?: string;
  
  uploadedBy: string;
  createdAt: string;
}

// types/template.ts

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  phases?: PhaseTemplate[];
  customFields?: CustomFieldDefinition[];
}

export interface PhaseTemplate {
  id: string;
  projectTemplateId: string;
  name: string;
  description?: string;
  displayOrder: number;
  clientVisible: boolean;
  requiresApproval: boolean;
  
  // Relations
  tasks?: TaskTemplate[];
  customFields?: CustomFieldDefinition[];
}

export interface TaskTemplate {
  id: string;
  phaseTemplateId: string;
  name: string;
  description?: string;
  displayOrder: number;
  clientVisible: boolean;
  requiresApproval: boolean;
}
```

---

## 4. Key Components

### Custom Field Renderer

```tsx
// components/shared/CustomFieldRenderer.tsx

import React from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '@/types/customField';
import { Input, Textarea, Select, Checkbox, DatePicker } from '@/components/ui';

interface Props {
  definition: CustomFieldDefinition;
  value?: CustomFieldValue;
  onChange: (value: any) => void;
  readOnly?: boolean;
}

export const CustomFieldRenderer: React.FC<Props> = ({
  definition,
  value,
  onChange,
  readOnly = false
}) => {
  const getValue = () => {
    if (!value) return undefined;
    switch (definition.fieldType) {
      case 'text':
      case 'textarea':
      case 'url':
      case 'contact':
        return value.valueText;
      case 'number':
      case 'currency':
        return value.valueNumber;
      case 'date':
        return value.valueDate;
      case 'checkbox':
        return value.valueBoolean;
      case 'dropdown':
        return value.valueText;
      default:
        return value.valueJson;
    }
  };

  const currentValue = getValue();

  if (readOnly) {
    return (
      <div className="py-2">
        <label className="text-sm font-medium text-gray-500">
          {definition.name}
        </label>
        <div className="mt-1">
          {definition.fieldType === 'currency' && currentValue !== undefined
            ? `$${currentValue.toLocaleString()}`
            : definition.fieldType === 'checkbox'
            ? currentValue ? 'Yes' : 'No'
            : currentValue || '-'}
        </div>
      </div>
    );
  }

  switch (definition.fieldType) {
    case 'text':
      return (
        <Input
          label={definition.name}
          value={currentValue || ''}
          onChange={(e) => onChange(e.target.value)}
          required={definition.isRequired}
        />
      );
      
    case 'textarea':
      return (
        <Textarea
          label={definition.name}
          value={currentValue || ''}
          onChange={(e) => onChange(e.target.value)}
          required={definition.isRequired}
        />
      );
      
    case 'number':
      return (
        <Input
          type="number"
          label={definition.name}
          value={currentValue ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          required={definition.isRequired}
        />
      );
      
    case 'currency':
      return (
        <Input
          type="number"
          step="0.01"
          label={definition.name}
          value={currentValue ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          prefix="$"
          required={definition.isRequired}
        />
      );
      
    case 'date':
      return (
        <DatePicker
          label={definition.name}
          value={currentValue}
          onChange={onChange}
          required={definition.isRequired}
        />
      );
      
    case 'dropdown':
      return (
        <Select
          label={definition.name}
          value={currentValue || ''}
          onChange={onChange}
          options={definition.options?.map(opt => ({ value: opt, label: opt })) || []}
          required={definition.isRequired}
        />
      );
      
    case 'checkbox':
      return (
        <Checkbox
          label={definition.name}
          checked={currentValue || false}
          onChange={(checked) => onChange(checked)}
        />
      );
      
    case 'url':
      return (
        <Input
          type="url"
          label={definition.name}
          value={currentValue || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://"
          required={definition.isRequired}
        />
      );
      
    default:
      return null;
  }
};
```

### Phase Manager Component

```tsx
// components/admin/projects/PhaseManager.tsx

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Phase, Task } from '@/types/project';
import { 
  ChevronDown, 
  ChevronRight, 
  GripVertical, 
  Plus, 
  Settings,
  CheckCircle,
  Circle,
  Clock
} from 'lucide-react';

interface Props {
  phases: Phase[];
  onPhaseUpdate: (phaseId: string, updates: Partial<Phase>) => void;
  onPhaseReorder: (phases: Phase[]) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddPhase: () => void;
  onAddTask: (phaseId: string) => void;
  onPhaseSettings: (phase: Phase) => void;
}

export const PhaseManager: React.FC<Props> = ({
  phases,
  onPhaseUpdate,
  onPhaseReorder,
  onTaskUpdate,
  onAddPhase,
  onAddTask,
  onPhaseSettings
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(phases.filter(p => p.status === 'in_progress').map(p => p.id))
  );

  const toggleExpanded = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const reordered = Array.from(phases);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    // Update display order
    const updated = reordered.map((phase, index) => ({
      ...phase,
      displayOrder: index + 1
    }));
    
    onPhaseReorder(updated);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const calculatePhaseProgress = (phase: Phase) => {
    if (!phase.tasks || phase.tasks.length === 0) return 0;
    const completed = phase.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / phase.tasks.length) * 100);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Project Phases</h3>
        <button
          onClick={onAddPhase}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-4 h-4" />
          Add Phase
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="phases">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {phases.map((phase, index) => (
                <Draggable key={phase.id} draggableId={phase.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`mb-2 border rounded-lg ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      } ${
                        phase.status === 'in_progress' 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Phase Header */}
                      <div className="flex items-center p-3">
                        <div {...provided.dragHandleProps} className="mr-2 cursor-grab">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        
                        <button
                          onClick={() => toggleExpanded(phase.id)}
                          className="mr-2"
                        >
                          {expandedPhases.has(phase.id) 
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />
                          }
                        </button>
                        
                        {getStatusIcon(phase.status)}
                        
                        <span className="ml-2 font-medium flex-1">{phase.name}</span>
                        
                        <span className="text-sm text-gray-500 mr-4">
                          {calculatePhaseProgress(phase)}%
                        </span>
                        
                        {phase.requiresApproval && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2">
                            Approval Required
                          </span>
                        )}
                        
                        {!phase.clientVisible && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mr-2">
                            Internal
                          </span>
                        )}
                        
                        <button
                          onClick={() => onPhaseSettings(phase)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      
                      {/* Phase Tasks */}
                      {expandedPhases.has(phase.id) && (
                        <div className="px-4 pb-3 ml-8 border-t">
                          <div className="mt-3 space-y-2">
                            {phase.tasks?.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 py-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={task.status === 'completed'}
                                  onChange={(e) => onTaskUpdate(task.id, {
                                    status: e.target.checked ? 'completed' : 'pending'
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className={task.status === 'completed' ? 'line-through text-gray-400' : ''}>
                                  {task.name}
                                </span>
                                {task.dueDate && (
                                  <span className="text-xs text-gray-400">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {!task.clientVisible && (
                                  <span className="text-xs bg-gray-100 px-1 rounded">Internal</span>
                                )}
                              </div>
                            ))}
                            
                            <button
                              onClick={() => onAddTask(phase.id)}
                              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-2"
                            >
                              <Plus className="w-3 h-3" />
                              Add Task
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
```

### Delivery Tracker Component

```tsx
// components/admin/deliveries/DeliveryTracker.tsx

import React from 'react';
import { Delivery, DeliveryStatus } from '@/types/delivery';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  deliveries: Delivery[];
  onStatusChange: (id: string, status: DeliveryStatus) => void;
  onEdit: (delivery: Delivery) => void;
}

export const DeliveryTracker: React.FC<Props> = ({
  deliveries,
  onStatusChange,
  onEdit
}) => {
  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'ordered':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'shipped':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'in_transit':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'delayed':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'ordered': return 'bg-gray-100 text-gray-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'delayed': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
    }
  };

  const upcomingDeliveries = deliveries.filter(
    d => ['ordered', 'shipped', 'in_transit'].includes(d.status)
  );
  
  const delayedDeliveries = deliveries.filter(d => d.status === 'delayed');
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  const renderDeliveryCard = (delivery: Delivery) => (
    <div
      key={delivery.id}
      className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onEdit(delivery)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {getStatusIcon(delivery.status)}
          <div>
            <h4 className="font-medium">{delivery.description}</h4>
            {delivery.vendor && (
              <p className="text-sm text-gray-500">{delivery.vendor}</p>
            )}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(delivery.status)}`}>
          {delivery.status.replace('_', ' ')}
        </span>
      </div>
      
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span>
          {delivery.status === 'delivered' && delivery.actualDate
            ? `Delivered ${new Date(delivery.actualDate).toLocaleDateString()}`
            : `Expected ${new Date(delivery.expectedDate).toLocaleDateString()}`
          }
        </span>
        
        {delivery.trackingNumber && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {delivery.trackingNumber}
          </span>
        )}
      </div>
      
      {delivery.status === 'delayed' && delivery.delayReason && (
        <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
          {delivery.delayReason}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {delayedDeliveries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-700 uppercase mb-3">
            ⚠️ Delayed ({delayedDeliveries.length})
          </h3>
          <div className="space-y-3">
            {delayedDeliveries.map(renderDeliveryCard)}
          </div>
        </div>
      )}
      
      {upcomingDeliveries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Upcoming ({upcomingDeliveries.length})
          </h3>
          <div className="space-y-3">
            {upcomingDeliveries.map(renderDeliveryCard)}
          </div>
        </div>
      )}
      
      {completedDeliveries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            Completed ({completedDeliveries.length})
          </h3>
          <div className="space-y-3">
            {completedDeliveries.map(renderDeliveryCard)}
          </div>
        </div>
      )}
      
      {deliveries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No deliveries tracked for this project yet.
        </div>
      )}
    </div>
  );
};
```

---

## 5. Progress Calculation Service

```typescript
// server/src/services/progressService.ts

import { Phase, Task, Project } from '../types';
import { db } from '../db';

export class ProgressService {
  
  /**
   * Calculate progress for a single phase based on its tasks
   */
  calculatePhaseProgress(phase: Phase): number {
    if (!phase.tasks || phase.tasks.length === 0) {
      // No tasks - use status
      switch (phase.status) {
        case 'completed': return 100;
        case 'in_progress': return 50;
        default: return 0;
      }
    }
    
    const totalTasks = phase.tasks.length;
    const completedTasks = phase.tasks.filter(t => t.status === 'completed').length;
    
    return Math.round((completedTasks / totalTasks) * 100);
  }
  
  /**
   * Calculate overall project progress based on phases
   */
  calculateProjectProgress(phases: Phase[]): number {
    if (!phases || phases.length === 0) return 0;
    
    // Weight each phase equally
    const totalPhases = phases.filter(p => p.status !== 'skipped').length;
    if (totalPhases === 0) return 0;
    
    const totalProgress = phases
      .filter(p => p.status !== 'skipped')
      .reduce((sum, phase) => {
        return sum + this.calculatePhaseProgress(phase);
      }, 0);
    
    return Math.round(totalProgress / totalPhases);
  }
  
  /**
   * Update phase progress in database
   */
  async updatePhaseProgress(phaseId: string): Promise<number> {
    const tasks = await db('project_tasks')
      .where('phase_id', phaseId)
      .select('status');
    
    const phase = {
      tasks: tasks.map(t => ({ status: t.status }))
    } as Phase;
    
    const progress = this.calculatePhaseProgress(phase);
    
    await db('project_phases')
      .where('id', phaseId)
      .update({ progress, updated_at: new Date() });
    
    return progress;
  }
  
  /**
   * Update project progress in database
   */
  async updateProjectProgress(projectId: string): Promise<number> {
    const phases = await db('project_phases')
      .where('project_id', projectId)
      .select('id', 'status', 'progress');
    
    // Get tasks for each phase
    for (const phase of phases) {
      const tasks = await db('project_tasks')
        .where('phase_id', phase.id)
        .select('status');
      phase.tasks = tasks;
    }
    
    const progress = this.calculateProjectProgress(phases as Phase[]);
    
    await db('projects')
      .where('id', projectId)
      .update({ 
        overall_progress: progress, 
        updated_at: new Date() 
      });
    
    return progress;
  }
  
  /**
   * Determine current phase (first non-completed phase)
   */
  async updateCurrentPhase(projectId: string): Promise<string | null> {
    const phases = await db('project_phases')
      .where('project_id', projectId)
      .whereNot('status', 'skipped')
      .orderBy('display_order', 'asc')
      .select('id', 'status');
    
    // Find first non-completed phase
    const currentPhase = phases.find(p => p.status !== 'completed');
    const currentPhaseId = currentPhase?.id || null;
    
    await db('projects')
      .where('id', projectId)
      .update({ 
        current_phase_id: currentPhaseId,
        updated_at: new Date() 
      });
    
    return currentPhaseId;
  }
  
  /**
   * Recalculate all progress for a project (use after bulk changes)
   */
  async recalculateAllProgress(projectId: string): Promise<{
    phaseProgress: Record<string, number>;
    overallProgress: number;
    currentPhaseId: string | null;
  }> {
    const phases = await db('project_phases')
      .where('project_id', projectId)
      .orderBy('display_order', 'asc')
      .select('*');
    
    const phaseProgress: Record<string, number> = {};
    
    for (const phase of phases) {
      const progress = await this.updatePhaseProgress(phase.id);
      phaseProgress[phase.id] = progress;
    }
    
    const overallProgress = await this.updateProjectProgress(projectId);
    const currentPhaseId = await this.updateCurrentPhase(projectId);
    
    return { phaseProgress, overallProgress, currentPhaseId };
  }
}
```

---

## 6. Environment Variables

```env
# .env.example

# Database
DATABASE_URL=postgresql://user:password@host:5432/artisan_tile

# Authentication
JWT_SECRET=your-admin-jwt-secret
JWT_EXPIRES_IN=7d
PORTAL_JWT_SECRET=your-portal-jwt-secret
PORTAL_JWT_EXPIRES_IN=30d

# File Storage
STORAGE_TYPE=local  # or 's3', 'replit'
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# S3 (if using)
S3_BUCKET=your-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=xxx
FROM_EMAIL=noreply@artisantile.com
FROM_NAME=Artisan Tile

# Application
APP_URL=https://your-app.replit.app
PORTAL_URL=https://your-app.replit.app/portal
```

---

## 7. Implementation Priority

### Week 1-2: Core Foundation
- [ ] Database migrations
- [ ] Project CRUD
- [ ] Phase CRUD with reordering
- [ ] Task CRUD
- [ ] Progress calculation

### Week 3: Templates & Custom Fields
- [ ] Project templates
- [ ] Custom field definitions
- [ ] Custom field values
- [ ] Template-based project creation

### Week 4: Files & Updates
- [ ] File upload service
- [ ] File management
- [ ] Project updates/activity log
- [ ] Photo handling

### Week 5-6: Client Portal
- [ ] Portal authentication
- [ ] Dashboard
- [ ] Progress view
- [ ] Files/documents view
- [ ] Basic messaging

### Week 7: Deliveries & Change Orders
- [ ] Delivery tracking
- [ ] Change order management
- [ ] Approval workflow
- [ ] Signature capture

### Week 8: Additional Modules
- [ ] Out of scope tracking
- [ ] Time tracking
- [ ] Pricing/line items
- [ ] Payments

### Week 9-10: Polish
- [ ] Email notifications
- [ ] Mobile optimization
- [ ] Testing
- [ ] Documentation

---

## 8. Testing the Flexibility

Before launch, test these scenarios:

1. **Create project with no template** - Can you add phases ad-hoc?
2. **Create project from template** - Does it copy correctly?
3. **Add/remove/reorder phases mid-project** - Does progress recalculate?
4. **Mix of visible/internal phases** - Does portal show correctly?
5. **Phase requiring approval** - Can client approve in portal?
6. **Custom fields on different entities** - Do they save/load?
7. **Multiple file types** - Upload photos, PDFs, etc.
8. **Change order with signature** - Full workflow
9. **Delivery status changes** - Notifications work?
10. **Time entries** - Visible vs hidden to client

---

*This implementation guide focuses on building a flexible system that can adapt to any interior design or renovation project workflow.*
