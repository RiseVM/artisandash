import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type {
  ServiceCatalogCategoryWithItems,
  ServiceCatalogCategory,
  ServiceCatalogItem,
} from "@shared/schema";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiQuery<ServiceCatalogCategoryWithItems[]>("/api/catalog"),
  });
}

export function useSeedCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ServiceCatalogCategoryWithItems[]>("/api/catalog/seed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ServiceCatalogCategory>) =>
      api.post<ServiceCatalogCategory>("/api/catalog/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ServiceCatalogCategory> & { id: number }) =>
      api.patch<ServiceCatalogCategory>(`/api/catalog/categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/catalog/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ServiceCatalogItem>) =>
      api.post<ServiceCatalogItem>("/api/catalog/items", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ServiceCatalogItem> & { id: number }) =>
      api.patch<ServiceCatalogItem>(`/api/catalog/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/catalog/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
