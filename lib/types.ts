// /lib/types.ts

// Defines the structure for a single product image
export interface ShopifyImage {
  id: number;
  product_id: number;
  src: string;
  alt: string | null;
}

// Defines the structure for a single product variant (e.g., size or color)
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  created_at: string;
  updated_at: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  featured_image?: {
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
    variant_ids?: number[];
  } | null;
}

// Defines the structure for a main product
export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'draft';
  tags: string | string[]; // Tags can be a string or an array of strings
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

// Defines the structure for a collection
export interface ShopifyCollection {
    id: number;
    handle: string;
    title: string;
    products_count: number;
}