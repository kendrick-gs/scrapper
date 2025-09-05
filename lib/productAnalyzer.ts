import { ShopifyProduct, ShopifyVariant } from './types';

export interface AnalyzedVariant extends ShopifyVariant {
  __primaryOptionName?: string;
  __optionValue?: string;
  __imageSrc?: string | null;
}

export interface AnalyzedProduct extends ShopifyProduct {
  __primaryOptionName?: string;
  variants: AnalyzedVariant[];
}

// Determine the primary option dimension (e.g., Color, Size) by looking at variant titles/options.
export function analyzeProduct(p: ShopifyProduct): AnalyzedProduct {
  // If already analyzed (has __primaryOptionName on root or variants carry __imageSrc) return as-is
  if ((p as any).__primaryOptionName || p.variants?.some((v: any) => v.__imageSrc)) {
    return p as unknown as AnalyzedProduct;
  }
  const variants = p.variants || [] as any;
  if (!variants.length) return { ...p, variants: [] } as AnalyzedProduct;
  const productImages: any[] = (p as any).images || [];
  // Determine primary option key (greatest diversity)
  const optionKeys: (keyof ShopifyVariant)[] = ['option1','option2','option3'];
  let bestKey: keyof ShopifyVariant | undefined; let bestDiversity = 0;
  for (const k of optionKeys) {
    const vals = new Set(variants.map((v: any) => (v as any)[k]).filter(Boolean));
    if (vals.size > bestDiversity) { bestDiversity = vals.size; bestKey = k; }
  }
  const analyzedVariants: AnalyzedVariant[] = variants.map((v: any) => {
    const value = bestKey ? (v as any)[bestKey] : v.title;
    let img = v.featured_image?.src || null;
    if (!img) {
      // Fallback: find product image whose variant_ids contains this variant id
      const match = productImages.find(im => Array.isArray(im.variant_ids) && im.variant_ids.includes(v.id));
      if (match) img = match.src;
    }
    return { ...v, __primaryOptionName: bestKey as string, __optionValue: value, __imageSrc: img };
  });
  return { ...p, variants: analyzedVariants, __primaryOptionName: bestKey as string };
}

export function analyzeProducts(products: ShopifyProduct[]): AnalyzedProduct[] {
  return products.map(analyzeProduct);
}
