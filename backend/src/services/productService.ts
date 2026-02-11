/**
 * Product catalog service: resolve website from tree, load products, format for LLM.
 * The LLM is "aware" of a website's products only because we inject this text into the prompt at request time.
 */

import { pool } from '../db/connection.js';

/** Resolve website_id for a dialog tree (tree → ab_variation → skin → website). */
export async function getWebsiteIdFromTreeId(treeId: number): Promise<number | null> {
  const result = await pool.query(
    `SELECT s.website_id
     FROM dialog_trees dt
     JOIN ab_variations av ON av.id = dt.ab_variation_id
     JOIN skins s ON s.id = av.skin_id
     WHERE dt.id = $1`,
    [treeId]
  );
  return result.rows[0]?.website_id ?? null;
}

export interface ProductRow {
  id: number;
  website_id: number;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  price: string;
  currency: string | null;
  unit: string | null;
  is_available: boolean;
}

/** Load available products for a website. */
export async function getProductsForWebsite(websiteId: number): Promise<ProductRow[]> {
  const result = await pool.query(
    `SELECT id, website_id, name, description, category, sku, price, currency, unit, is_available
     FROM products
     WHERE website_id = $1 AND is_available = true
     ORDER BY COALESCE(sort_order, 0) ASC, category ASC, name ASC
     LIMIT 100`,
    [websiteId]
  );
  return result.rows as ProductRow[];
}

/** Format product list as a string for the LLM prompt (e.g. "Available Products:\n..."). */
export function formatProductCatalogForLLM(products: ProductRow[]): string {
  if (products.length === 0) return '';
  return products
    .map(
      (p) =>
        `- ${p.name} | ${p.category} | ${p.price} ${p.currency || 'USD'}${p.unit ? ` | ${p.unit}` : ''}${p.description ? ` | ${p.description}` : ''}`
    )
    .join('\n');
}

/** Get product catalog string for a tree (for injection into LLM prompt). Returns undefined if no website or no products. */
export async function getProductCatalogForTree(treeId: number): Promise<string | undefined> {
  const websiteId = await getWebsiteIdFromTreeId(treeId);
  if (websiteId == null) return undefined;
  const products = await getProductsForWebsite(websiteId);
  const catalog = formatProductCatalogForLLM(products);
  return catalog || undefined;
}
