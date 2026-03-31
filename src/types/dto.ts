/** DTOs — Data Transfer Objects desacoplados do schema do banco */

// ─── Orders ───────────────────────────────────────────────
export interface OrderDTO {
  id: string;
  orderNumber: string | null;
  customer: { name?: string; email?: string; phone?: string } | null;
  marketplace: string | null;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDTO[];
}

export interface OrderItemDTO {
  id: string;
  title: string | null;
  quantity: number;
  price: number;
}

export interface OrderDetailDTO extends OrderDTO {
  shipping?: OrderShippingDTO;
  timeline?: OrderTimelineDTO[];
}

export interface OrderShippingDTO {
  id: string;
  trackingCode: string | null;
  carrier: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  address: Record<string, unknown> | null;
}

export interface OrderTimelineDTO {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  createdBy: string | null;
}

// ─── Products ─────────────────────────────────────────────
export interface ProductDTO {
  id: string;
  title: string;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  categoryId: string | null;
  description: string | null;
  createdAt: string;
  variants?: ProductVariantDTO[];
  images?: ProductImageDTO[];
}

export interface ProductVariantDTO {
  id: string;
  sku: string | null;
  price: number;
  cost: number;
  stock: number;
  combination: Record<string, string> | null;
  warehouseStocks: Record<string, number> | null;
}

export interface ProductImageDTO {
  url: string;
  isPrimary: boolean;
}

export interface CategoryDTO {
  id: string;
  name: string;
}

export interface PriceRuleDTO {
  id: string;
  name: string;
  endsAt: string | null;
  scope: Record<string, unknown>;
}

// ─── Inventory ────────────────────────────────────────────
export interface WarehouseDTO {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface StockRuleDTO {
  id: string;
  productId: string;
  productTitle: string;
  marketplace: string;
  minStock: number;
  maxAvailable: number | null;
}

// ─── Finance ──────────────────────────────────────────────
export interface PayableSummaryDTO {
  amount: number;
  status: string;
  dueDate: string;
}

export interface ReceivableSummaryDTO {
  amount: number;
  status: string;
  dueDate: string;
}

export interface TransactionDTO {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  category: string | null;
  referenceId: string | null;
}

// ─── Users ────────────────────────────────────────────────
export interface UserDTO {
  id: string;
  fullName: string | null;
  email: string;
  status: string | null;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  role: string;
}

// ─── Marketplace ──────────────────────────────────────────
export interface MarketplaceIntegrationDTO {
  id: string;
  marketplace: string;
  status: string;
  credentials: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLogDTO {
  id: string;
  marketplace: string;
  type: string;
  message: string;
  details: Record<string, unknown> | null;
  resolved: boolean;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
