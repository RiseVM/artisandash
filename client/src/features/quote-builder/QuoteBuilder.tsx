import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useCatalog, useSeedCatalog } from "@/features/catalog/hooks";
import {
  useCreateEstimate,
  useCreateEstimateLineItem,
  useEstimate,
  useUpdateEstimate,
  useDeleteEstimateLineItem,
} from "@/features/estimates/hooks";
import { useCustomers, useCreateCustomer } from "@/features/customers/hooks";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, X, Check, Database } from "lucide-react";
import type {
  ServiceCatalogCategoryWithItems,
  ServiceCatalogItemWithChildren,
  Customer,
} from "@shared/schema";

type SelectedItems = Record<number, boolean>;
type ExclusiveSelections = Record<number, number>;

/* ── Category icon background colors matching prototype ── */
const CATEGORY_COLORS: Record<string, string> = {
  shower: "#dbeafe",
  floor: "#fef3c7",
  paint: "#fce7f3",
  electrical: "#fef9c3",
  plumbing: "#e0e7ff",
  permit: "#d1fae5",
};

function getCategoryBg(name: string, fallback?: string | null): string {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return fallback || "#f3f4f6";
}

export function QuoteBuilder() {
  const [, navigate] = useLocation();
  const [, routeParams] = useRoute("/quote-builder/:id");
  const editId = routeParams?.id ? parseInt(routeParams.id) : 0;
  const isEditMode = !!editId;

  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useCatalog();
  const { data: customers = [] } = useCustomers();
  const { data: existingEstimate, isLoading: isLoadingEstimate } = useEstimate(editId);
  const seedMutation = useSeedCatalog();
  const createEstimateMutation = useCreateEstimate();
  const createLineItemMutation = useCreateEstimateLineItem();
  const updateEstimateMutation = useUpdateEstimate();
  const deleteLineItemMutation = useDeleteEstimateLineItem();
  const createCustomerMutation = useCreateCustomer();

  // Track whether we've loaded the existing estimate data into local state
  const [editDataLoaded, setEditDataLoaded] = useState(false);

  // Customer selection state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [projectAddress, setProjectAddress] = useState("");
  const [markupPercent, setMarkupPercent] = useState(15);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [exclusiveSelections, setExclusiveSelections] = useState<ExclusiveSelections>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load existing estimate data into QuoteBuilder state when editing
  useEffect(() => {
    if (!isEditMode || !existingEstimate || editDataLoaded) return;
    // Set customer
    if (existingEstimate.customer) {
      setSelectedCustomer(existingEstimate.customer);
      if (existingEstimate.customer.address) {
        setProjectAddress(existingEstimate.customer.address);
      }
    }
    // Parse markup from internal notes if available
    const markupMatch = existingEstimate.internal_notes?.match(/Markup:\s*(\d+)%/);
    if (markupMatch) {
      setMarkupPercent(parseInt(markupMatch[1]));
    }
    setEditDataLoaded(true);
  }, [isEditMode, existingEstimate, editDataLoaded]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setShowNewCustomerForm(false);
    if (customer.address && !projectAddress) {
      setProjectAddress(customer.address);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast({ title: "Customer name required", variant: "destructive" });
      return;
    }
    if (!newCustomerEmail.trim()) {
      toast({ title: "Customer email required", variant: "destructive" });
      return;
    }
    try {
      const customer = await createCustomerMutation.mutateAsync({
        name: newCustomerName.trim(),
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim() || null,
        address: newCustomerAddress.trim() || null,
      });
      setSelectedCustomer(customer);
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      if (customer.address && !projectAddress) {
        setProjectAddress(customer.address);
      }
      toast({ title: "Customer created", description: customer.name });
    } catch (err: any) {
      toast({ title: "Error creating customer", description: err?.message, variant: "destructive" });
    }
  };

  // Initialize all categories as expanded
  useMemo(() => {
    if (catalog.length > 0 && Object.keys(expandedCategories).length === 0) {
      const expanded: Record<number, boolean> = {};
      catalog.forEach((cat) => {
        expanded[cat.id] = true;
      });
      setExpandedCategories(expanded);
    }
  }, [catalog]);

  const toggleCategory = (catId: number) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleItem = (itemId: number) => {
    setSelectedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const selectExclusive = (groupId: number, childId: number) => {
    setExclusiveSelections((prev) => {
      const current = prev[groupId];
      if (current === childId) {
        const next = { ...prev };
        delete next[groupId];
        return next;
      }
      return { ...prev, [groupId]: childId };
    });
  };

  // Calculate totals — track both cost and client-facing (marked-up) prices
  const { categoryBreakdowns, costSubtotal, markupAmount, grandTotal } = useMemo(() => {
    const multiplier = 1 + markupPercent / 100;
    const breakdowns: {
      category: ServiceCatalogCategoryWithItems;
      items: { name: string; costPrice: number; clientPrice: number; section: string }[];
      costTotal: number;
      clientTotal: number;
      selectedCount: number;
    }[] = [];
    let costSub = 0;

    for (const cat of catalog) {
      if (cat.is_active !== "yes") continue;
      const catItems: { name: string; costPrice: number; clientPrice: number; section: string }[] = [];

      for (const item of cat.items) {
        if (item.is_active !== "yes") continue;

        if (item.is_group === "yes") {
          const children = item.children || [];
          if (item.is_exclusive === "yes") {
            const selectedChildId = exclusiveSelections[item.id];
            if (selectedChildId) {
              const child = children.find((c) => c.id === selectedChildId);
              if (child && child.is_active === "yes") {
                const cost = parseFloat(child.price || "0");
                const client = Math.round(cost * multiplier);
                catItems.push({
                  name: `${item.name}: ${child.name}`,
                  costPrice: cost,
                  clientPrice: client,
                  section: cat.name,
                });
                costSub += cost;
              }
            }
          } else {
            for (const child of children) {
              if (child.is_active !== "yes") continue;
              if (selectedItems[child.id]) {
                const cost = parseFloat(child.price || "0");
                const client = Math.round(cost * multiplier);
                catItems.push({ name: child.name, costPrice: cost, clientPrice: client, section: cat.name });
                costSub += cost;
              }
            }
          }
        } else {
          if (selectedItems[item.id]) {
            const cost = parseFloat(item.price || "0");
            const client = Math.round(cost * multiplier);
            catItems.push({ name: item.name, costPrice: cost, clientPrice: client, section: cat.name });
            costSub += cost;
          }
        }
      }

      if (catItems.length > 0) {
        breakdowns.push({
          category: cat,
          items: catItems,
          costTotal: catItems.reduce((s, i) => s + i.costPrice, 0),
          clientTotal: catItems.reduce((s, i) => s + i.clientPrice, 0),
          selectedCount: catItems.length,
        });
      }
    }

    const mAmt = costSub * (markupPercent / 100);
    return {
      categoryBreakdowns: breakdowns,
      costSubtotal: costSub,
      markupAmount: mAmt,
      grandTotal: breakdowns.reduce((s, b) => s + b.clientTotal, 0),
    };
  }, [catalog, selectedItems, exclusiveSelections, markupPercent]);

  const handleSaveQuote = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select or create a customer first", variant: "destructive" });
      return;
    }
    if (grandTotal <= 0 && !isEditMode) {
      toast({ title: "Select at least one service", variant: "destructive" });
      return;
    }

    try {
      const title = projectAddress.trim()
        ? `${selectedCustomer.name} — ${projectAddress.trim()}`
        : selectedCustomer.name;

      // SECURITY: markup notes are always internal — never shown to client
      const internalNotes = categoryBreakdowns.length > 0
        ? `Markup: ${markupPercent}%\nCost Subtotal: $${costSubtotal.toLocaleString()}\n\nCost Breakdown:\n${categoryBreakdowns.map((b) => `${b.category.name}: $${b.costTotal.toLocaleString()}\n${b.items.map((i) => `  - ${i.name}: $${i.costPrice.toLocaleString()} → $${i.clientPrice.toLocaleString()}`).join("\n")}`).join("\n\n")}`
        : (isEditMode ? existingEstimate?.internal_notes || "" : "");

      if (isEditMode) {
        // ── Update existing quote ──
        const updateData: Record<string, any> = {
          title,
          customer_id: selectedCustomer.id,
          internal_notes: internalNotes,
        };

        // Only update totals if new catalog items were selected
        if (categoryBreakdowns.length > 0) {
          updateData.total = grandTotal.toFixed(2);
          updateData.subtotal = grandTotal.toFixed(2);

          // Delete existing line items and replace with new ones
          if (existingEstimate?.lineItems) {
            for (const li of existingEstimate.lineItems) {
              await deleteLineItemMutation.mutateAsync({ id: li.id, estimateId: editId });
            }
          }

          const allItems = categoryBreakdowns.flatMap((b) => b.items);
          for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            await createLineItemMutation.mutateAsync({
              estimateId: editId,
              data: {
                description: item.name,
                section: item.section,
                quantity: "1",
                unit: "lot",
                unit_price: item.clientPrice.toFixed(2),
                total: item.clientPrice.toFixed(2),
                display_order: i,
              },
            });
          }
        }

        await updateEstimateMutation.mutateAsync({ id: editId, data: updateData as any });
        toast({ title: "Quote Updated", description: `${title} — $${grandTotal > 0 ? grandTotal.toLocaleString() : parseFloat(existingEstimate?.total || "0").toLocaleString()}` });
        navigate(`/estimates/${editId}`);
      } else {
        // ── Create new quote ──
        const estimate = await createEstimateMutation.mutateAsync({
          title,
          customer_id: selectedCustomer.id,
          total: grandTotal.toFixed(2),
          subtotal: grandTotal.toFixed(2),
          tax_rate: "0",
          tax_amount: "0",
          status: "draft",
          internal_notes: internalNotes,
        });

        const allItems = categoryBreakdowns.flatMap((b) => b.items);
        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          await createLineItemMutation.mutateAsync({
            estimateId: estimate.id,
            data: {
              description: item.name,
              section: item.section,
              quantity: "1",
              unit: "lot",
              unit_price: item.clientPrice.toFixed(2),
              total: item.clientPrice.toFixed(2),
              display_order: i,
            },
          });
        }

        toast({ title: "Quote Created", description: `${title} — $${grandTotal.toLocaleString()}` });
        navigate(`/estimates/${estimate.id}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSeedCatalog = async () => {
    try {
      await seedMutation.mutateAsync();
      toast({ title: "Catalog seeded with default services" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleClearAll = () => {
    setSelectedItems({});
    setExclusiveSelections({});
    setSelectedCustomer(null);
    setCustomerSearch("");
    setProjectAddress("");
    setMarkupPercent(15);
  };

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

  // Count total selected items across all categories
  const totalSelectedCount = categoryBreakdowns.reduce((s, b) => s + b.selectedCount, 0);

  // Count per-category selected
  const catSelectedMap = useMemo(() => {
    const m: Record<number, { count: number; total: number }> = {};
    for (const b of categoryBreakdowns) {
      m[b.category.id] = { count: b.selectedCount, total: b.costTotal };
    }
    return m;
  }, [categoryBreakdowns]);

  if (isLoading || (isEditMode && isLoadingEstimate)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6b6560" }} />
      </div>
    );
  }

  // Empty catalog state
  if (catalog.length === 0) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "center", paddingTop: 80, fontFamily: "'DM Sans', sans-serif" }}>
        <Database style={{ width: 48, height: 48, margin: "0 auto 16px", color: "#6b6560" }} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          No Service Catalog Found
        </h2>
        <p style={{ color: "#6b6560", fontSize: 14, marginBottom: 20 }}>
          The service catalog is empty. Seed it with default bathroom remodel services to get started.
        </p>
        <button onClick={handleSeedCatalog} disabled={seedMutation.isPending} className="qb-btn-create">
          {seedMutation.isPending ? "Seeding..." : "Seed Default Catalog"}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Inject fonts + scoped styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* Flex outer wrapper — escapes layout padding completely */
        .qb-outer {
          display: flex;
          font-family: 'DM Sans', sans-serif;
        }
        @media (max-width: 768px) {
          .qb-outer {
            flex-direction: column;
            height: auto;
          }
        }


        .qb-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
          color: hsl(var(--foreground));
        }
        .qb-sub {
          color: hsl(var(--muted-foreground));
          font-size: 13px;
          margin-bottom: 28px;
        }

        .qb-client-row {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid hsl(var(--border));
        }
        .qb-client-selected {
          display: flex;
          align-items: center;
          gap: 12px;
          background: hsl(var(--accent));
          border-radius: 8px;
          padding: 10px 14px;
          flex: 1;
        }
        .qb-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          outline: none;
          transition: border-color 0.15s;
        }
        .qb-input:focus { border-color: hsl(var(--primary)); }
        .qb-input::placeholder { color: hsl(var(--muted-foreground)); }
        .qb-input-search {
          padding-left: 36px;
        }

        .qb-category {
          margin-bottom: 20px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          overflow: hidden;
        }

        .qb-cat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid hsl(var(--border));
          gap: 12px;
          transition: background 0.1s;
        }
        .qb-cat-header:hover { background: hsl(var(--muted)); }

        .qb-cat-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .qb-cat-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .qb-cat-info h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          color: hsl(var(--foreground));
        }
        .qb-cat-info p {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          margin: 1px 0 0;
        }
        .qb-cat-meta {
          text-align: right;
          flex-shrink: 0;
        }
        .qb-cat-selected {
          font-size: 11px;
          color: hsl(var(--primary));
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .qb-cat-total {
          font-size: 13px;
          font-weight: 600;
          color: #16a34a;
        }
        .qb-cat-chevron {
          color: hsl(var(--muted-foreground));
          font-size: 12px;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .qb-cat-chevron.open { transform: rotate(180deg); }

        .qb-cat-body {
          padding: 4px 0;
        }

        /* Line items — standard theme hover/selection */
        .qb-line-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 11px 18px;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid hsl(var(--border));
        }
        .qb-line-item:last-child { border-bottom: none; }
        .qb-line-item:hover { background: hsl(var(--muted)); }
        .qb-line-item.selected { background: hsl(var(--accent)); }
        .qb-line-item.selected:hover { background: hsl(var(--accent)); }

        .qb-line-item.is-option {
          padding-left: 40px;
          background: hsl(var(--card));
        }
        .qb-line-item.is-option.selected { background: hsl(var(--accent)); }

        .qb-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid hsl(var(--border));
          border-radius: 4px;
          flex-shrink: 0;
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          background: hsl(var(--card));
          font-size: 11px;
          font-weight: 700;
          color: transparent;
        }
        .qb-line-item.selected .qb-checkbox {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .qb-radio {
          width: 18px;
          height: 18px;
          border: 2px solid hsl(var(--border));
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          background: hsl(var(--card));
        }
        .qb-line-item.selected .qb-radio { border-color: hsl(var(--primary)); }
        .qb-radio-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: transparent;
          transition: background 0.15s;
        }
        .qb-line-item.selected .qb-radio-dot { background: hsl(var(--primary)); }

        .qb-item-info { flex: 1; }
        .qb-item-name {
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.3;
          color: hsl(var(--foreground));
        }
        .qb-item-desc {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          margin-top: 2px;
          line-height: 1.4;
        }
        .qb-item-price {
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .qb-line-item.selected .qb-item-price { color: #16a34a; }

        .qb-section-label {
          padding: 8px 18px 4px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
        }

        /* Right sidebar heading */
        .qb-sidebar-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          color: #fff;
        }
        .qb-summary-category { margin-bottom: 16px; }
        .qb-summary-cat-name {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
        }
        .qb-summary-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 0;
        }
        .qb-summary-item-name {
          font-size: 12.5px;
          color: rgba(255,255,255,0.8);
          line-height: 1.4;
        }
        .qb-summary-item-price {
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .qb-empty-state {
          text-align: center;
          padding: 40px 0;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          line-height: 1.6;
        }
        .qb-empty-icon { font-size: 28px; margin-bottom: 8px; }

        /* Footer - totals section */
        .qb-totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
        }
        .qb-totals-label {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .qb-totals-value {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          font-variant-numeric: tabular-nums;
        }
        .qb-totals-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.12);
          margin: 10px 0;
        }
        .qb-totals-grand {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 16px;
        }
        .qb-totals-grand-label {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
        }
        .qb-totals-grand-value {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #fff;
          font-variant-numeric: tabular-nums;
        }

        .qb-markup-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .qb-markup-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          flex: 1;
        }
        .qb-markup-input {
          width: 60px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 4px;
          padding: 4px 8px;
          color: #fff;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          text-align: right;
          outline: none;
        }
        .qb-markup-pct { font-size: 11px; color: rgba(255,255,255,0.4); }

        .qb-btn-create {
          width: 100%;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
          padding: 13px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          letter-spacing: 0.02em;
          margin-bottom: 10px;
        }
        .qb-btn-create:hover { opacity: 0.9; }
        .qb-btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

        .qb-btn-reset {
          width: 100%;
          background: transparent;
          color: rgba(255,255,255,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 9px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .qb-btn-reset:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }

        /* Customer search dropdown — theme tokens */
        .qb-dropdown {
          position: absolute;
          z-index: 50;
          width: 100%;
          margin-top: 4px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          max-height: 240px;
          overflow-y: auto;
        }
        .qb-dropdown-item {
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border: none;
          background: none;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid hsl(var(--border));
          font-family: 'DM Sans', sans-serif;
          color: hsl(var(--foreground));
        }
        .qb-dropdown-item:hover { background: hsl(var(--muted)); }
        .qb-dropdown-item:last-child { border-bottom: none; }
        .qb-dropdown-create {
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border: none;
          border-top: 1px solid hsl(var(--border));
          background: none;
          cursor: pointer;
          transition: background 0.1s;
          color: hsl(var(--primary));
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .qb-dropdown-create:hover { background: hsl(var(--muted)); }

        .qb-new-customer-form {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          padding: 14px;
          margin-top: 8px;
        }
        .qb-new-customer-form .qb-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }
        .qb-new-customer-form .qb-form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .qb-new-customer-form .qb-form-title {
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          color: hsl(var(--foreground));
        }
        .qb-small-btn {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .qb-small-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .qb-ghost-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
        }
        .qb-ghost-btn:hover { color: hsl(var(--foreground)); }
      `}</style>

      <div ref={shellRef} className="-m-4 md:-m-10 flex" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* ── Left: Configurator — scrollable, standard bg ── */}
        <div className="flex-1 overflow-y-auto bg-background p-8">
          <button
            onClick={() => navigate(isEditMode ? `/estimates/${editId}` : "/estimates")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              marginBottom: 8,
              fontSize: 13,
              color: "hsl(var(--muted-foreground))",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "hsl(var(--foreground))")}
            onMouseOut={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
          >
            ← All Quotes
          </button>
          <div className="qb-title">{isEditMode ? "Edit Quote" : "Build a Quote"}</div>
          <p className="qb-sub">
            {isEditMode
              ? "Update the customer, address, or select new services to replace the existing line items."
              : "Click to select services. The final price will be sent to the client — not the line items."}
          </p>

          {/* Client row */}
          <div className="qb-client-row">
            {selectedCustomer ? (
              <div className="qb-client-selected" style={{ flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: 12, color: "#6b6560" }}>
                    {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button className="qb-ghost-btn" onClick={handleClearCustomer}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            ) : (
              <div ref={customerSearchRef} style={{ flex: 1, position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      color: "#aaa",
                    }}
                  />
                  <input
                    className="qb-input qb-input-search"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      setShowNewCustomerForm(false);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                </div>
                {showCustomerDropdown && !showNewCustomerForm && (
                  <div className="qb-dropdown">
                    {filteredCustomers.length > 0
                      ? filteredCustomers.map((c) => (
                          <button key={c.id} className="qb-dropdown-item" onClick={() => handleSelectCustomer(c)}>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "#6b6560" }}>
                              {[c.email, c.phone].filter(Boolean).join(" · ")}
                            </div>
                          </button>
                        ))
                      : (
                        <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "#6b6560" }}>
                          No customers found
                        </div>
                      )}
                    <button
                      className="qb-dropdown-create"
                      onClick={() => {
                        setShowNewCustomerForm(true);
                        setShowCustomerDropdown(false);
                        setNewCustomerName(customerSearch);
                      }}
                    >
                      <UserPlus style={{ width: 14, height: 14 }} />
                      Create New Customer
                    </button>
                  </div>
                )}
                {showNewCustomerForm && (
                  <div className="qb-new-customer-form">
                    <div className="qb-form-header">
                      <span className="qb-form-title">
                        <UserPlus style={{ width: 14, height: 14 }} /> New Customer
                      </span>
                      <button className="qb-ghost-btn" onClick={() => setShowNewCustomerForm(false)}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                    <div className="qb-form-grid">
                      <input className="qb-input" placeholder="Name *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                      <input className="qb-input" placeholder="Email *" type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
                      <input className="qb-input" placeholder="Phone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                      <input className="qb-input" placeholder="Address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                    </div>
                    <button className="qb-small-btn" onClick={handleCreateNewCustomer} disabled={createCustomerMutation.isPending}>
                      {createCustomerMutation.isPending ? (
                        <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Creating...</>
                      ) : (
                        <><Check style={{ width: 14, height: 14 }} /> Create &amp; Select</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
            <input
              className="qb-input"
              placeholder="Property address..."
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
            />
          </div>

          {/* Categories */}
          {catalog
            .filter((c) => c.is_active === "yes")
            .map((cat) => {
              const isOpen = expandedCategories[cat.id];
              const meta = catSelectedMap[cat.id];
              return (
                <div key={cat.id} className="qb-category">
                  <div className="qb-cat-header" onClick={() => toggleCategory(cat.id)}>
                    <div className="qb-cat-left">
                      <div className="qb-cat-icon" style={{ backgroundColor: getCategoryBg(cat.name, cat.icon_bg) }}>
                        {cat.icon || "•"}
                      </div>
                      <div className="qb-cat-info">
                        <h3>{cat.name}</h3>
                        {cat.description && <p>{cat.description}</p>}
                      </div>
                    </div>
                    <div className="qb-cat-meta">
                      {meta && <div className="qb-cat-selected">{meta.count} selected</div>}
                      {meta && <div className="qb-cat-total">{fmt(meta.total)}</div>}
                    </div>
                    <span className={`qb-cat-chevron ${isOpen ? "open" : ""}`}>▼</span>
                  </div>
                  {isOpen && (
                    <div className="qb-cat-body">
                      {cat.items
                        .filter((item) => item.is_active === "yes")
                        .map((item) => (
                          <CatalogLineItem
                            key={item.id}
                            item={item}
                            selectedItems={selectedItems}
                            exclusiveSelections={exclusiveSelections}
                            onToggle={toggleItem}
                            onSelectExclusive={selectExclusive}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* ── Right: Dark Sidebar — full height, touches right edge ── */}
        <div style={{ width: '380px', flexShrink: 0, background: '#111827', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 0' }}>
            <h2 className="qb-sidebar-title">Quote Summary</h2>
            {categoryBreakdowns.length === 0 ? (
              <div className="qb-empty-state">
                <div className="qb-empty-icon">✦</div>
                Select services on the left to build the quote
              </div>
            ) : (
              categoryBreakdowns.map((b) => (
                <div key={b.category.id} className="qb-summary-category">
                  <div className="qb-summary-cat-name">{b.category.name}</div>
                  {b.items.map((item, idx) => (
                    <div key={idx} className="qb-summary-item">
                      <span className="qb-summary-item-name">{item.name}</span>
                      <span className="qb-summary-item-price">{fmt(item.clientPrice)}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
            <div className="qb-markup-row">
              <span className="qb-markup-label">Materials markup / buffer</span>
              <input
                type="number"
                className="qb-markup-input"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                min={0}
                max={100}
                step={5}
              />
              <span className="qb-markup-pct">%</span>
            </div>
            <div className="qb-totals-row">
              <span className="qb-totals-label">Labor subtotal</span>
              <span className="qb-totals-value">{fmt(costSubtotal)}</span>
            </div>
            <div className="qb-totals-row">
              <span className="qb-totals-label">Markup / buffer</span>
              <span className="qb-totals-value">{markupAmount > 0 ? fmt(markupAmount) : "$0"}</span>
            </div>
            <hr className="qb-totals-divider" />
            <div className="qb-totals-grand">
              <span className="qb-totals-grand-label">Client Quote</span>
              <span className="qb-totals-grand-value">{fmt(grandTotal)}</span>
            </div>
            <button
              className="qb-btn-create"
              onClick={handleSaveQuote}
              disabled={
                createEstimateMutation.isPending || createLineItemMutation.isPending || updateEstimateMutation.isPending ||
                !selectedCustomer || (!isEditMode && grandTotal <= 0)
              }
            >
              {createEstimateMutation.isPending || createLineItemMutation.isPending || updateEstimateMutation.isPending
                ? (isEditMode ? "Updating..." : "Creating...")
                : (isEditMode ? "Update Quote →" : "Create Quote →")}
            </button>
            <button className="qb-btn-reset" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Line Item Renderer ──────────────────────
function CatalogLineItem({
  item,
  selectedItems,
  exclusiveSelections,
  onToggle,
  onSelectExclusive,
}: {
  item: ServiceCatalogItemWithChildren;
  selectedItems: SelectedItems;
  exclusiveSelections: ExclusiveSelections;
  onToggle: (id: number) => void;
  onSelectExclusive: (groupId: number, childId: number) => void;
}) {
  const price = parseFloat(item.price || "0");
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

  // Group header with children
  if (item.is_group === "yes" && item.children && item.children.length > 0) {
    const isExclusive = item.is_exclusive === "yes";
    return (
      <>
        <div className="qb-section-label">
          {item.name}
          {item.description ? ` — ${item.description}` : ""}
          {isExclusive ? " (choose one)" : ""}
        </div>
        {item.children
          .filter((child) => child.is_active === "yes")
          .map((child) => {
            const childPrice = parseFloat(child.price || "0");
            if (isExclusive) {
              const isSel = exclusiveSelections[item.id] === child.id;
              return (
                <div
                  key={child.id}
                  className={`qb-line-item is-option${isSel ? " selected" : ""}`}
                  onClick={() => onSelectExclusive(item.id, child.id)}
                >
                  <div className="qb-radio">
                    <div className="qb-radio-dot" />
                  </div>
                  <div className="qb-item-info">
                    <div className="qb-item-name">{child.name}</div>
                  </div>
                  <div className="qb-item-price">{fmt(childPrice)}</div>
                </div>
              );
            } else {
              const isSel = !!selectedItems[child.id];
              return (
                <div
                  key={child.id}
                  className={`qb-line-item is-option${isSel ? " selected" : ""}`}
                  onClick={() => onToggle(child.id)}
                >
                  <div className="qb-checkbox">{isSel ? "✓" : ""}</div>
                  <div className="qb-item-info">
                    <div className="qb-item-name">{child.name}</div>
                  </div>
                  <div className="qb-item-price">{fmt(childPrice)}</div>
                </div>
              );
            }
          })}
      </>
    );
  }

  // Regular top-level item
  const isSel = !!selectedItems[item.id];
  return (
    <div
      className={`qb-line-item${isSel ? " selected" : ""}`}
      onClick={() => onToggle(item.id)}
    >
      <div className="qb-checkbox">{isSel ? "✓" : ""}</div>
      <div className="qb-item-info">
        <div className="qb-item-name">{item.name}</div>
        {item.description && <div className="qb-item-desc">{item.description}</div>}
      </div>
      <div className="qb-item-price">{price > 0 ? fmt(price) : ""}</div>
    </div>
  );
}
