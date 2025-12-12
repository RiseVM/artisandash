import { create } from 'zustand';
import { format, addDays } from 'date-fns';

// Entities
export interface InventoryItem {
  id: number;
  name: string;
  sku?: string;
  category?: string;
  total_quantity: number; // For future tracking
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  stripe_customer_id?: string;
}

export interface Checkout {
  id: number;
  customer_id: number;
  inventory_item_id: number;
  checkout_date: string;
  due_date: string;
  status: 'checked_out' | 'overdue' | 'returned';
  notes?: string;
  auth_notes?: string;
}

// Denormalized view for UI convenience
export interface CheckoutView extends Checkout {
  customer: Customer;
  item: InventoryItem;
}

interface StoreState {
  inventory: InventoryItem[];
  customers: Customer[];
  checkouts: Checkout[];

  // Actions
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: number, item: Partial<InventoryItem>) => void;
  
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: number, customer: Partial<Customer>) => void;

  addCheckout: (checkout: Omit<Checkout, 'id' | 'status' | 'checkout_date'>) => void;
  updateCheckout: (id: number, checkout: Partial<Checkout>) => void;
  
  // Helpers
  getCheckoutView: (checkout: Checkout) => CheckoutView;
  checkOverdue: () => void;
}

// Initial Mock Data
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 1, name: "Carrara Marble Hexagon", sku: "CM-HEX-01", total_quantity: 10, category: "Marble" },
  { id: 2, name: "Slate Subway Tile", sku: "SL-SUB-02", total_quantity: 25, category: "Slate" },
  { id: 3, name: "Terracotta Pavers", sku: "TC-PAV-03", total_quantity: 5, category: "Terracotta" },
  { id: 4, name: "Zellige White 4x4", sku: "ZE-WHT-04", total_quantity: 50, category: "Ceramic" },
  { id: 5, name: "Blue Limestone Field", sku: "BL-LST-05", total_quantity: 12, category: "Limestone" },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 1, name: "Alice Wright", email: "alice@example.com", phone: "555-0123", stripe_customer_id: "cus_A1" },
  { id: 2, name: "Bob Builder", email: "bob@construction.com", phone: "555-0124" },
  { id: 3, name: "Catherine DeGroot", email: "cat@design.studio", phone: "555-0125" },
];

const INITIAL_CHECKOUTS: Checkout[] = [
  {
    id: 1,
    customer_id: 1,
    inventory_item_id: 1,
    checkout_date: format(addDays(new Date(), -5), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    status: 'checked_out',
    notes: "Client interested in bathroom floor.",
    auth_notes: "Stripe Auth: pi_123456789"
  },
  {
    id: 2,
    customer_id: 2,
    inventory_item_id: 2,
    checkout_date: format(addDays(new Date(), -10), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
    status: 'overdue',
    notes: "Needs for kitchen backsplash mock.",
    auth_notes: "Manual card entry #8842"
  },
  {
    id: 3,
    customer_id: 3,
    inventory_item_id: 3,
    checkout_date: format(addDays(new Date(), -14), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), -7), 'yyyy-MM-dd'),
    status: 'returned',
    notes: "Returned via courier.",
    auth_notes: ""
  }
];

export const useStore = create<StoreState>((set, get) => ({
  inventory: INITIAL_INVENTORY,
  customers: INITIAL_CUSTOMERS,
  checkouts: INITIAL_CHECKOUTS,

  addInventoryItem: (newItem) => {
    let createdItem: InventoryItem | undefined;
    set((state) => {
      const id = Math.max(0, ...state.inventory.map(i => i.id)) + 1;
      createdItem = { ...newItem, id };
      return { inventory: [...state.inventory, createdItem] };
    });
    return createdItem!;
  },

  updateInventoryItem: (id, updatedFields) => set((state) => ({
    inventory: state.inventory.map((i) => i.id === id ? { ...i, ...updatedFields } : i)
  })),

  addCustomer: (newCustomer) => {
    let createdCustomer: Customer | undefined;
    set((state) => {
      const id = Math.max(0, ...state.customers.map(c => c.id)) + 1;
      createdCustomer = { ...newCustomer, id };
      return { customers: [...state.customers, createdCustomer] };
    });
    return createdCustomer!;
  },

  updateCustomer: (id, updatedFields) => set((state) => ({
    customers: state.customers.map((c) => c.id === id ? { ...c, ...updatedFields } : c)
  })),

  addCheckout: (newCheckout) => set((state) => {
    const id = Math.max(0, ...state.checkouts.map(c => c.id)) + 1;
    const checkout: Checkout = {
      ...newCheckout,
      id,
      status: 'checked_out',
      checkout_date: format(new Date(), 'yyyy-MM-dd'),
    };
    return { checkouts: [...state.checkouts, checkout] };
  }),

  updateCheckout: (id, updatedFields) => set((state) => ({
    checkouts: state.checkouts.map((c) => c.id === id ? { ...c, ...updatedFields } : c)
  })),

  getCheckoutView: (checkout) => {
    const state = get();
    const customer = state.customers.find(c => c.id === checkout.customer_id) || { id: 0, name: 'Unknown', email: '' };
    const item = state.inventory.find(i => i.id === checkout.inventory_item_id) || { id: 0, name: 'Unknown Item', total_quantity: 0 };
    return { ...checkout, customer, item };
  },

  checkOverdue: () => set((state) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      checkouts: state.checkouts.map((c) => {
        if (c.status === 'returned') return c;
        if (c.due_date < today) return { ...c, status: 'overdue' };
        return c;
      })
    };
  })
}));
