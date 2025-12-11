import { create } from 'zustand';
import { format, addDays } from 'date-fns';

export interface Sample {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  sample_name: string;
  checkout_date: string;
  due_date: string;
  status: 'checked_out' | 'overdue' | 'returned';
  notes?: string;
  auth_notes?: string;
  stripe_customer_id?: string;
}

interface StoreState {
  samples: Sample[];
  addSample: (sample: Omit<Sample, 'id' | 'status' | 'checkout_date'>) => void;
  updateSample: (id: number, sample: Partial<Sample>) => void;
  markReturned: (id: number) => void;
  checkOverdue: () => void;
}

// Initial mock data
const INITIAL_SAMPLES: Sample[] = [
  {
    id: 1,
    customer_name: "Alice Wright",
    customer_email: "alice@example.com",
    customer_phone: "555-0123",
    sample_name: "Carrara Marble Hexagon",
    checkout_date: format(addDays(new Date(), -5), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    status: 'checked_out',
    notes: "Client interested in bathroom floor.",
    auth_notes: "Stripe Auth: pi_123456789"
  },
  {
    id: 2,
    customer_name: "Bob Builder",
    customer_email: "bob@construction.com",
    sample_name: "Slate Subway Tile",
    checkout_date: format(addDays(new Date(), -10), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
    status: 'overdue',
    notes: "Needs for kitchen backsplash mock.",
    auth_notes: "Manual card entry #8842"
  },
  {
    id: 3,
    customer_name: "Catherine DeGroot",
    customer_email: "cat@design.studio",
    sample_name: "Terracotta Pavers",
    checkout_date: format(addDays(new Date(), -14), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), -7), 'yyyy-MM-dd'),
    status: 'returned',
    notes: "Returned via courier.",
    auth_notes: ""
  }
];

export const useStore = create<StoreState>((set) => ({
  samples: INITIAL_SAMPLES,
  addSample: (newSample) => set((state) => {
    const id = Math.max(0, ...state.samples.map(s => s.id)) + 1;
    const sample: Sample = {
      ...newSample,
      id,
      status: 'checked_out',
      checkout_date: format(new Date(), 'yyyy-MM-dd'),
    };
    return { samples: [...state.samples, sample] };
  }),
  updateSample: (id, updatedFields) => set((state) => ({
    samples: state.samples.map((s) => s.id === id ? { ...s, ...updatedFields } : s)
  })),
  markReturned: (id) => set((state) => ({
    samples: state.samples.map((s) => s.id === id ? { ...s, status: 'returned' } : s)
  })),
  checkOverdue: () => set((state) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      samples: state.samples.map((s) => {
        if (s.status === 'returned') return s;
        if (s.due_date < today) return { ...s, status: 'overdue' };
        return s;
      })
    };
  })
}));
