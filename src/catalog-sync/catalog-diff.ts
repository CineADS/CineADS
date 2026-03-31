/**
 * Catalog Diff
 * Compares ERP product data with marketplace listing data.
 */

export interface CatalogDiffField {
  field: string;
  erpValue: unknown;
  marketplaceValue: unknown;
}

export interface CatalogDiffResult {
  productId: string;
  marketplace: string;
  hasDiff: boolean;
  fields: CatalogDiffField[];
}

export interface ErpProductData {
  productId: string;
  title: string;
  price: number;
  stock: number;
  status: string;
  categoryId: string | null;
}

export interface MarketplaceListingData {
  price: number;
  stock: number;
  status: string;
  title?: string;
  categoryId?: string | null;
}

export function computeCatalogDiff(
  erp: ErpProductData,
  listing: MarketplaceListingData,
  marketplace: string
): CatalogDiffResult {
  const fields: CatalogDiffField[] = [];

  if (erp.price !== listing.price) {
    fields.push({ field: "price", erpValue: erp.price, marketplaceValue: listing.price });
  }

  if (erp.stock !== listing.stock) {
    fields.push({ field: "stock", erpValue: erp.stock, marketplaceValue: listing.stock });
  }

  // ERP active but listing paused/inactive
  const erpActive = erp.status === "active";
  const listingActive = listing.status === "active";
  if (erpActive !== listingActive) {
    fields.push({ field: "status", erpValue: erp.status, marketplaceValue: listing.status });
  }

  if (listing.title && erp.title !== listing.title) {
    fields.push({ field: "title", erpValue: erp.title, marketplaceValue: listing.title });
  }

  return {
    productId: erp.productId,
    marketplace,
    hasDiff: fields.length > 0,
    fields,
  };
}
