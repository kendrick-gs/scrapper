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
  const variants = p.variants || [] as any;
  if (!variants.length) return { ...p, variants: [] } as AnalyzedProduct;
  // Try to infer primary option name; Shopify supplies 'option1','option2','option3'. We'll pick the one with greatest diversity.
  const optionKeys: (keyof ShopifyVariant)[] = ['option1','option2','option3'];
  let bestKey: keyof ShopifyVariant | undefined; let bestDiversity = 0;
  for (const k of optionKeys) {
    const vals = new Set(variants.map((v: any) => (v as any)[k]).filter(Boolean));
    if (vals.size > bestDiversity) { bestDiversity = vals.size; bestKey = k; }
  }
  const analyzedVariants: AnalyzedVariant[] = variants.map((v: any) => {
    const value = bestKey ? (v as any)[bestKey] : v.title;
    const img = v.featured_image?.src || null;
    return { ...v, __primaryOptionName: bestKey as string, __optionValue: value, __imageSrc: img };
  });
  return { ...p, variants: analyzedVariants, __primaryOptionName: bestKey as string };
}

export function analyzeProducts(products: ShopifyProduct[]): AnalyzedProduct[] {
  return products.map(analyzeProduct);
}
