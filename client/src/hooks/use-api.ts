import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Customer, Inventory, Checkout, CheckoutView, InsertCustomer, InsertInventory, InsertCheckout } from "@shared/schema";

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
}

export function useInventory() {
  return useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });
}

export function useCheckouts() {
  return useQuery<CheckoutView[]>({
    queryKey: ["/api/checkouts"],
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomer> }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, data);
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInventory) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json() as Promise<Inventory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertInventory> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return res.json() as Promise<Inventory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCheckout) => {
      const res = await apiRequest("POST", "/api/checkouts", data);
      return res.json() as Promise<Checkout>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useUpdateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCheckout> }) => {
      const res = await apiRequest("PATCH", `/api/checkouts/${id}`, data);
      return res.json() as Promise<Checkout>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}
