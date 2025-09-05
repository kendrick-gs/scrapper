import { ShopifyProduct, ShopifyVariant } from './types';

export interface AnalyzedVariant extends ShopifyVariant {
  __primaryOptionName?: string;
  __optionValue?: string;
  __imageSrc?: string | null;
  __options?: { name: string; value: string }[];
}

export interface AnalyzedProduct extends ShopifyProduct {
  __primaryOptionName?: string;
  __optionNames?: string[];
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
  const productOptionsMeta: { name: string; position: number; values: string[] }[] = (p as any).options || [];
  const analyzedVariants: AnalyzedVariant[] = variants.map((v: any) => {
    const value = bestKey ? (v as any)[bestKey] : v.title;
    let img = v.featured_image?.src || null;
    if (!img) {
      const match = productImages.find(im => Array.isArray(im.variant_ids) && im.variant_ids.includes(v.id));
      if (match) img = match.src;
    }
    // Multi option list
    const opts: { name: string; value: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const key = `option${i}` as keyof ShopifyVariant;
      const val = (v as any)[key];
      if (!val) continue;
      const meta = productOptionsMeta.find(o => o.position === i);
      if (!meta) continue;
      // Only include if diversity > 1 (meaningful) across product variants
      const diversity = new Set(variants.map((vv: any) => (vv as any)[key]).filter(Boolean)).size;
      if (diversity > 1) opts.push({ name: meta.name || `Option ${i}`, value: val });
    }
    return { ...v, __primaryOptionName: bestKey as string, __optionValue: value, __imageSrc: img, __options: opts };
  });
  const optionNames = Array.from(new Set(analyzedVariants.flatMap(v => (v.__options||[]).map(o => o.name))));
  return { ...p, variants: analyzedVariants, __primaryOptionName: bestKey as string, __optionNames: optionNames };
}

export function analyzeProducts(products: ShopifyProduct[]): AnalyzedProduct[] {
  return products.map(analyzeProduct);
}
