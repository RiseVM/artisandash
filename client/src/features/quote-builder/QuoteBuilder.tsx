import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useCatalog, useSeedCatalog } from "@/features/catalog/hooks";
import { useCreateEstimate } from "@/features/estimates/hooks";
import { useCustomers, useCreateCustomer } from "@/features/customers/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Calculator,
  FileText,
  Database,
  Search,
  UserPlus,
  X,
  Check,
} from "lucide-react";
import type {
  ServiceCatalogCategoryWithItems,
  ServiceCatalogItemWithChildren,
  ServiceCatalogItem,
  Customer,
} from "@shared/schema";

type SelectedItems = Record<number, boolean>; // itemId -> selected
type ExclusiveSelections = Record<number, number>; // groupId -> selectedChildId

export function QuoteBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useCatalog();
  const { data: customers = [] } = useCustomers();
  const seedMutation = useSeedCatalog();
  const createEstimateMutation = useCreateEstimate();
  const createCustomerMutation = useCreateCustomer();

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

  const [projectAddress, setProjectAddress] = useState("");
  const [markupPercent, setMarkupPercent] = useState(15);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [exclusiveSelections, setExclusiveSelections] = useState<ExclusiveSelections>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    ).slice(0, 10);
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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setShowNewCustomerForm(false);
    // Auto-fill project address if customer has one
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
      catalog.forEach((cat) => { expanded[cat.id] = true; });
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
      // If clicking the same one, deselect
      if (current === childId) {
        const next = { ...prev };
        delete next[groupId];
        return next;
      }
      return { ...prev, [groupId]: childId };
    });
  };

  // Calculate totals
  const { categoryBreakdowns, subtotal, markupAmount, grandTotal } = useMemo(() => {
    const breakdowns: { category: ServiceCatalogCategoryWithItems; items: { name: string; price: number }[]; total: number }[] = [];
    let sub = 0;

    for (const cat of catalog) {
      if (cat.is_active !== "yes") continue;
      const catItems: { name: string; price: number }[] = [];

      for (const item of cat.items) {
        if (item.is_active !== "yes") continue;

        if (item.is_group === "yes") {
          // Group item — check children
          const children = item.children || [];
          if (item.is_exclusive === "yes") {
            // Radio: check exclusiveSelections
            const selectedChildId = exclusiveSelections[item.id];
            if (selectedChildId) {
              const child = children.find((c) => c.id === selectedChildId);
              if (child && child.is_active === "yes") {
                const price = parseFloat(child.price || "0");
                catItems.push({ name: `${item.name}: ${child.name}`, price });
                sub += price;
              }
            }
          } else {
            // Checkbox group: check each child
            for (const child of children) {
              if (child.is_active !== "yes") continue;
              if (selectedItems[child.id]) {
                const price = parseFloat(child.price || "0");
                catItems.push({ name: child.name, price });
                sub += price;
              }
            }
          }
        } else {
          // Regular top-level item
          if (selectedItems[item.id]) {
            const price = parseFloat(item.price || "0");
            catItems.push({ name: item.name, price });
            sub += price;
          }
        }
      }

      if (catItems.length > 0) {
        breakdowns.push({ category: cat, items: catItems, total: catItems.reduce((s, i) => s + i.price, 0) });
      }
    }

    const markup = sub * (markupPercent / 100);
    return {
      categoryBreakdowns: breakdowns,
      subtotal: sub,
      markupAmount: markup,
      grandTotal: sub + markup,
    };
  }, [catalog, selectedItems, exclusiveSelections, markupPercent]);

  const handleCreateEstimate = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select or create a customer first", variant: "destructive" });
      return;
    }
    if (grandTotal <= 0) {
      toast({ title: "Select at least one service", variant: "destructive" });
      return;
    }

    try {
      const title = projectAddress.trim()
        ? `${selectedCustomer.name} — ${projectAddress.trim()}`
        : selectedCustomer.name;

      const estimate = await createEstimateMutation.mutateAsync({
        title,
        customer_id: selectedCustomer.id,
        total: grandTotal.toFixed(2),
        subtotal: grandTotal.toFixed(2),
        tax_rate: "0",
        tax_amount: "0",
        status: "draft",
        notes: `Quote built from catalog.\nMarkup: ${markupPercent}%\n\nBreakdown (internal only):\n${categoryBreakdowns.map((b) => `${b.category.name}: $${b.total.toLocaleString()}\n${b.items.map((i) => `  - ${i.name}: $${i.price.toLocaleString()}`).join("\n")}`).join("\n\n")}\n\nSubtotal: $${subtotal.toLocaleString()}\nMarkup (${markupPercent}%): $${markupAmount.toLocaleString()}\nGrand Total: $${grandTotal.toLocaleString()}`,
      });

      toast({ title: "Estimate Created", description: `${title} — $${grandTotal.toLocaleString()}` });
      navigate(`/estimates/${estimate.id}`);
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

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty catalog state
  if (catalog.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <Database className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Service Catalog Found</h2>
        <p className="text-muted-foreground">
          The service catalog is empty. Seed it with default bathroom remodel services to get started.
        </p>
        <Button onClick={handleSeedCatalog} disabled={seedMutation.isPending}>
          {seedMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Seeding...</>
          ) : (
            <><Database className="h-4 w-4 mr-2" />Seed Default Catalog</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* ── Left: Catalog ────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Quote Builder
          </h1>
        </div>

        {/* Customer Selection */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" · ")}
                  </p>
                  {selectedCustomer.address && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.address}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div ref={customerSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      setShowNewCustomerForm(false);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="pl-9"
                  />
                </div>
                {showCustomerDropdown && !showNewCustomerForm && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-0"
                        >
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No customers found
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowNewCustomerForm(true);
                        setShowCustomerDropdown(false);
                        setNewCustomerName(customerSearch);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-600 border-t"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="text-sm font-medium">Create New Customer</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* New Customer Form */}
            {showNewCustomerForm && !selectedCustomer && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <UserPlus className="h-4 w-4" /> New Customer
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewCustomerForm(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                  <Input
                    placeholder="Email *"
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Phone"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                  <Input
                    placeholder="Address"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateNewCustomer}
                  disabled={createCustomerMutation.isPending}
                  className="w-full"
                >
                  {createCustomerMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Creating...</>
                  ) : (
                    <><Check className="h-3 w-3 mr-1" />Create & Select</>
                  )}
                </Button>
              </div>
            )}

            <Input
              placeholder="Project Address (optional)"
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Catalog Categories */}
        {catalog.filter((c) => c.is_active === "yes").map((cat) => (
          <Card key={cat.id} className="overflow-hidden">
            <CardHeader
              className="pb-2 cursor-pointer select-none"
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {cat.icon && (
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-lg"
                      style={{ backgroundColor: cat.icon_bg || "#f3f4f6" }}
                    >
                      {cat.icon}
                    </span>
                  )}
                  {cat.name}
                </CardTitle>
                {expandedCategories[cat.id] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedCategories[cat.id] && (
              <CardContent className="pt-0 space-y-1">
                {cat.items
                  .filter((item) => item.is_active === "yes")
                  .map((item) => (
                    <CatalogItem
                      key={item.id}
                      item={item}
                      selectedItems={selectedItems}
                      exclusiveSelections={exclusiveSelections}
                      onToggle={toggleItem}
                      onSelectExclusive={selectExclusive}
                    />
                  ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* ── Right: Quote Summary ─────────────── */}
      <div className="w-80 shrink-0 overflow-y-auto pb-6">
        <Card className="sticky top-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quote Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer && (
              <div className="text-sm">
                <p className="font-medium">{selectedCustomer.name}</p>
                {projectAddress && <p className="text-muted-foreground text-xs">{projectAddress}</p>}
              </div>
            )}

            {categoryBreakdowns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Select services from the catalog to build your quote.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdowns.map((b) => (
                  <div key={b.category.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        {b.category.icon && <span className="text-xs">{b.category.icon}</span>}
                        {b.category.name}
                      </span>
                      <span className="text-sm font-mono">${fmt(b.total)}</span>
                    </div>
                    <div className="ml-4 mt-1 space-y-0.5">
                      {b.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span className="truncate mr-2">{item.name}</span>
                          <span className="font-mono shrink-0">${fmt(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-mono">${fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span>Markup</span>
                      <Input
                        type="number"
                        value={markupPercent}
                        onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                        className="w-16 h-7 text-xs text-center"
                        min={0}
                        max={100}
                      />
                      <span className="text-xs">%</span>
                    </div>
                    <span className="font-mono">${fmt(markupAmount)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="font-mono">${fmt(grandTotal)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateEstimate}
              disabled={createEstimateMutation.isPending || !selectedCustomer || grandTotal <= 0}
            >
              {createEstimateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" />Create Estimate</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Catalog Item Renderer ──────────────────────
function CatalogItem({
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

  // Group header with children
  if (item.is_group === "yes" && item.children && item.children.length > 0) {
    const isExclusive = item.is_exclusive === "yes";
    return (
      <div className="ml-1 mt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {item.name}
          {isExclusive && (
            <Badge variant="outline" className="ml-2 text-[10px] py-0">Pick One</Badge>
          )}
        </p>
        <div className="space-y-0.5 ml-3">
          {item.children
            .filter((child) => child.is_active === "yes")
            .map((child) => {
              const childPrice = parseFloat(child.price || "0");
              if (isExclusive) {
                const isSelected = exclusiveSelections[item.id] === child.id;
                return (
                  <label
                    key={child.id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`exclusive-${item.id}`}
                      checked={isSelected}
                      onChange={() => onSelectExclusive(item.id, child.id)}
                      className="accent-blue-600"
                    />
                    <span className="flex-1 text-sm">{child.name}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      ${parseFloat(child.price || "0").toLocaleString()}
                    </span>
                  </label>
                );
              } else {
                return (
                  <label
                    key={child.id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
                      selectedItems[child.id] ? "bg-blue-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedItems[child.id]}
                      onChange={() => onToggle(child.id)}
                      className="accent-blue-600"
                    />
                    <span className="flex-1 text-sm">{child.name}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      ${childPrice.toLocaleString()}
                    </span>
                  </label>
                );
              }
            })}
        </div>
      </div>
    );
  }

  // Regular top-level item
  return (
    <label
      className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
        selectedItems[item.id] ? "bg-blue-50" : "hover:bg-muted/50"
      }`}
    >
      <input
        type="checkbox"
        checked={!!selectedItems[item.id]}
        onChange={() => onToggle(item.id)}
        className="accent-blue-600"
      />
      <span className="flex-1 text-sm">{item.name}</span>
      <span className="text-sm font-mono text-muted-foreground">
        ${price.toLocaleString()}
      </span>
    </label>
  );
}
