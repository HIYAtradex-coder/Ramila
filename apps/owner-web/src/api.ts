export type Membership = {
  storeId: string;
  storeName: string;
  storeCode: string;
  role: string;
};

export type InventoryItem = {
  id: string;
  skuCode: string;
  name: string;
  onHandEaches: number;
};

export type Invoice = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  status: string;
  totalMinor: number;
  lineCount: number;
};

export const API = import.meta.env.VITE_API_URL ?? "/api";

export async function api<T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("content-type", "application/json");
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`,
    );
  }
  return body as T;
}
