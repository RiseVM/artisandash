import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCustomers, useInventory, useContracts } from "@/hooks/use-api";
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from "@/components/ui/command";
import { Users, Package, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const { data: contracts = [] } = useContracts();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (type: string, id: number) => {
    setOpen(false);
    if (type === 'customer') {
      setLocation(`/customers`);
    } else if (type === 'inventory') {
      setLocation(`/inventory`);
    } else if (type === 'contract') {
      setLocation(`/contracts`);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline">Search...</span>
        <span className="lg:hidden">Search</span>
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search customers, inventory, contracts..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {customers.slice(0, 5).map((customer) => (
                <CommandItem
                  key={`customer-${customer.id}`}
                  onSelect={() => handleSelect('customer', customer.id)}
                  data-testid={`search-result-customer-${customer.id}`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{customer.name}</span>
                  {customer.email && (
                    <span className="ml-2 text-muted-foreground text-xs">{customer.email}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {inventory.length > 0 && (
            <CommandGroup heading="Inventory">
              {inventory.slice(0, 5).map((item) => (
                <CommandItem
                  key={`inventory-${item.id}`}
                  onSelect={() => handleSelect('inventory', item.id)}
                  data-testid={`search-result-inventory-${item.id}`}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                  {item.sku && (
                    <span className="ml-2 text-muted-foreground text-xs">SKU: {item.sku}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {contracts.length > 0 && (
            <CommandGroup heading="Contracts">
              {contracts.slice(0, 5).map((contract) => (
                <CommandItem
                  key={`contract-${contract.id}`}
                  onSelect={() => handleSelect('contract', contract.id)}
                  data-testid={`search-result-contract-${contract.id}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{contract.customer_name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {contract.contract_type === 'custom_cabinetry' ? 'Cabinetry' : 'Home Improvement'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
