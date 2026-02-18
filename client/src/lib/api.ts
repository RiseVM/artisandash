/**
 * Shared API client for the frontend.
 * Handles JSON parsing, error formatting, and auth redirects.
 *
 * Usage:
 *   const customers = await api.get<Customer[]>("/api/customers");
 *   const created = await api.post<Customer>("/api/customers", { name: "John" });
 *   await api.patch(`/api/customers/${id}`, { name: "Jane" });
 *   await api.delete(`/api/customers/${id}`);
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Session expired — redirect to login
    if (!window.location.pathname.startsWith("/portal")) {
      window.location.href = "/";
    } else {
      window.location.href = "/portal/login";
    }
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      body.error || body.message || `Request failed (${res.status})`,
      res.status,
      body.details,
    );
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  return handleResponse<T>(res);
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T = void>(url: string) => request<T>("DELETE", url),
};

/**
 * Helper for TanStack Query's queryFn.
 * Throws on error so React Query treats it as a failed query.
 *
 * Usage:
 *   useQuery({
 *     queryKey: ["customers"],
 *     queryFn: () => apiQuery<Customer[]>("/api/customers"),
 *   });
 */
export function apiQuery<T>(url: string): Promise<T> {
  return api.get<T>(url);
}

/**
 * Upload a file via multipart form data.
 * Returns the parsed JSON response.
 */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    // Don't set Content-Type — browser sets it with boundary
  });
  return handleResponse<T>(res);
}
