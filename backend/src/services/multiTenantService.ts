import { pool } from '../db/connection.js';

// Types
export interface CustomerType {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Website {
  id: number;
  customer_type_id: number;
  name: string;
  description: string | null;
  domain: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Skin {
  id: number;
  website_id: number;
  name: string;
  description: string | null;
  theme_config: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ABVariation {
  id: number;
  skin_id: number;
  name: string;
  description: string | null;
  variation_config: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Customer Type operations
export async function getAllCustomerTypes(): Promise<CustomerType[]> {
  const result = await pool.query(
    'SELECT * FROM customer_types ORDER BY name ASC'
  );
  return result.rows;
}

export async function getCustomerTypeById(id: number): Promise<CustomerType | null> {
  const result = await pool.query('SELECT * FROM customer_types WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createCustomerType(
  name: string,
  description?: string
): Promise<CustomerType> {
  const result = await pool.query(
    'INSERT INTO customer_types (name, description) VALUES ($1, $2) RETURNING *',
    [name, description || null]
  );
  return result.rows[0];
}

export async function updateCustomerType(
  id: number,
  name: string,
  description?: string
): Promise<CustomerType | null> {
  const result = await pool.query(
    'UPDATE customer_types SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, description || null, id]
  );
  return result.rows[0] || null;
}

export async function deleteCustomerType(id: number): Promise<void> {
  // Check if customer type exists
  const customerType = await getCustomerTypeById(id);
  if (!customerType) {
    throw new Error('Customer type not found');
  }
  
  // Delete customer type - CASCADE will automatically delete:
  // - All websites under this customer type
  // - All skins under those websites
  // - All A/B variations under those skins
  // - All dialog trees under those variations
  // - All dialog nodes under those trees
  await pool.query('DELETE FROM customer_types WHERE id = $1', [id]);
}

// Website operations
export async function getWebsitesByCustomerType(customerTypeId: number): Promise<Website[]> {
  const result = await pool.query(
    'SELECT * FROM websites WHERE customer_type_id = $1 ORDER BY name ASC',
    [customerTypeId]
  );
  return result.rows;
}

export async function getWebsiteById(id: number): Promise<Website | null> {
  const result = await pool.query('SELECT * FROM websites WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createWebsite(
  customerTypeId: number,
  name: string,
  description?: string,
  domain?: string,
  isActive: boolean = true
): Promise<Website> {
  const result = await pool.query(
    'INSERT INTO websites (customer_type_id, name, description, domain, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [customerTypeId, name, description || null, domain || null, isActive]
  );
  return result.rows[0];
}

export async function updateWebsite(
  id: number,
  name: string,
  description?: string,
  domain?: string,
  isActive?: boolean
): Promise<Website | null> {
  if (isActive !== undefined) {
    const result = await pool.query(
      'UPDATE websites SET name = $1, description = $2, domain = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, description || null, domain ?? null, isActive, id]
    );
    return result.rows[0] || null;
  }
  const result = await pool.query(
    'UPDATE websites SET name = $1, description = $2, domain = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
    [name, description || null, domain ?? null, id]
  );
  return result.rows[0] || null;
}

export async function setWebsiteActive(id: number, isActive: boolean): Promise<Website | null> {
  const result = await pool.query(
    'UPDATE websites SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return result.rows[0] || null;
}

export async function deleteWebsite(id: number): Promise<void> {
  await pool.query('DELETE FROM websites WHERE id = $1', [id]);
}

// Skin operations
export async function getSkinsByWebsite(websiteId: number): Promise<Skin[]> {
  const result = await pool.query(
    'SELECT * FROM skins WHERE website_id = $1 ORDER BY name ASC',
    [websiteId]
  );
  return result.rows;
}

export async function getSkinById(id: number): Promise<Skin | null> {
  const result = await pool.query('SELECT * FROM skins WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createSkin(
  websiteId: number,
  name: string,
  description?: string,
  themeConfig?: any
): Promise<Skin> {
  const result = await pool.query(
    'INSERT INTO skins (website_id, name, description, theme_config) VALUES ($1, $2, $3, $4) RETURNING *',
    [websiteId, name, description || null, themeConfig ? JSON.stringify(themeConfig) : null]
  );
  return result.rows[0];
}

export async function updateSkin(
  id: number,
  name: string,
  description?: string,
  themeConfig?: any
): Promise<Skin | null> {
  const result = await pool.query(
    'UPDATE skins SET name = $1, description = $2, theme_config = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
    [name, description || null, themeConfig ? JSON.stringify(themeConfig) : null, id]
  );
  return result.rows[0] || null;
}

export async function deleteSkin(id: number): Promise<void> {
  await pool.query('DELETE FROM skins WHERE id = $1', [id]);
}

// A/B Variation operations
export async function getABVariationsBySkin(skinId: number): Promise<ABVariation[]> {
  const result = await pool.query(
    'SELECT * FROM ab_variations WHERE skin_id = $1 ORDER BY name ASC',
    [skinId]
  );
  return result.rows;
}

export async function getABVariationById(id: number): Promise<ABVariation | null> {
  const result = await pool.query('SELECT * FROM ab_variations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createABVariation(
  skinId: number,
  name: string,
  description?: string,
  variationConfig?: any,
  isActive: boolean = true
): Promise<ABVariation> {
  const result = await pool.query(
    'INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [skinId, name, description || null, variationConfig ? JSON.stringify(variationConfig) : null, isActive]
  );
  return result.rows[0];
}

export async function updateABVariation(
  id: number,
  name: string,
  description?: string,
  variationConfig?: any,
  isActive?: boolean
): Promise<ABVariation | null> {
  const result = await pool.query(
    'UPDATE ab_variations SET name = $1, description = $2, variation_config = $3, is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 RETURNING *',
    [name, description || null, variationConfig ? JSON.stringify(variationConfig) : null, isActive, id]
  );
  return result.rows[0] || null;
}

export async function deleteABVariation(id: number): Promise<void> {
  await pool.query('DELETE FROM ab_variations WHERE id = $1', [id]);
}

