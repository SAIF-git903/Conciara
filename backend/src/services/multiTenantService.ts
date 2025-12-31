import { pool } from '../db/connection.js';
import { mockMultiTenantService } from './mockMultiTenantService.js';

// Check if we should use mock mode
let useMockMode = false;

async function testConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

testConnection().then(connected => {
  useMockMode = !connected;
  if (useMockMode) {
    console.log('⚠️  Database not available. Using in-memory mock mode for multi-tenant entities.');
  }
});

async function useService<T>(
  realFn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  if (useMockMode) {
    return mockFn();
  }
  try {
    return await realFn();
  } catch (error: any) {
    if (error?.code === '42P01' || error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      console.warn('Database unavailable, switching to mock mode');
      useMockMode = true;
      return mockFn();
    }
    throw error;
  }
}

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
  created_at: Date;
  updated_at: Date;
}

export interface Skin {
  id: number;
  website_id: number;
  name: string;
  description: string | null;
  theme_config: any;
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
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM customer_types ORDER BY name ASC'
      );
      return result.rows;
    },
    () => mockMultiTenantService.getAllCustomerTypes()
  );
}

export async function getCustomerTypeById(id: number): Promise<CustomerType | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM customer_types WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.getCustomerTypeById(id)
  );
}

export async function createCustomerType(
  name: string,
  description?: string
): Promise<CustomerType> {
  return useService(
    async () => {
      const result = await pool.query(
        'INSERT INTO customer_types (name, description) VALUES ($1, $2) RETURNING *',
        [name, description || null]
      );
      return result.rows[0];
    },
    () => mockMultiTenantService.createCustomerType(name, description)
  );
}

export async function updateCustomerType(
  id: number,
  name: string,
  description?: string
): Promise<CustomerType | null> {
  return useService(
    async () => {
      const result = await pool.query(
        'UPDATE customer_types SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [name, description || null, id]
      );
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.updateCustomerType(id, name, description)
  );
}

export async function deleteCustomerType(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM customer_types WHERE id = $1', [id]);
    },
    () => mockMultiTenantService.deleteCustomerType(id)
  ) as Promise<void>;
}

// Website operations
export async function getWebsitesByCustomerType(customerTypeId: number): Promise<Website[]> {
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM websites WHERE customer_type_id = $1 ORDER BY name ASC',
        [customerTypeId]
      );
      return result.rows;
    },
    () => mockMultiTenantService.getWebsitesByCustomerType(customerTypeId)
  );
}

export async function getWebsiteById(id: number): Promise<Website | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM websites WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.getWebsiteById(id)
  );
}

export async function createWebsite(
  customerTypeId: number,
  name: string,
  description?: string
): Promise<Website> {
  return useService(
    async () => {
      const result = await pool.query(
        'INSERT INTO websites (customer_type_id, name, description) VALUES ($1, $2, $3) RETURNING *',
        [customerTypeId, name, description || null]
      );
      return result.rows[0];
    },
    () => mockMultiTenantService.createWebsite(customerTypeId, name, description)
  );
}

export async function updateWebsite(
  id: number,
  name: string,
  description?: string
): Promise<Website | null> {
  return useService(
    async () => {
      const result = await pool.query(
        'UPDATE websites SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [name, description || null, id]
      );
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.updateWebsite(id, name, description)
  );
}

export async function deleteWebsite(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM websites WHERE id = $1', [id]);
    },
    () => mockMultiTenantService.deleteWebsite(id)
  ) as Promise<void>;
}

// Skin operations
export async function getSkinsByWebsite(websiteId: number): Promise<Skin[]> {
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM skins WHERE website_id = $1 ORDER BY name ASC',
        [websiteId]
      );
      return result.rows;
    },
    () => mockMultiTenantService.getSkinsByWebsite(websiteId)
  );
}

export async function getSkinById(id: number): Promise<Skin | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM skins WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.getSkinById(id)
  );
}

export async function createSkin(
  websiteId: number,
  name: string,
  description?: string,
  themeConfig?: any
): Promise<Skin> {
  return useService(
    async () => {
      const result = await pool.query(
        'INSERT INTO skins (website_id, name, description, theme_config) VALUES ($1, $2, $3, $4) RETURNING *',
        [websiteId, name, description || null, themeConfig ? JSON.stringify(themeConfig) : null]
      );
      return result.rows[0];
    },
    () => mockMultiTenantService.createSkin(websiteId, name, description, themeConfig)
  );
}

export async function updateSkin(
  id: number,
  name: string,
  description?: string,
  themeConfig?: any
): Promise<Skin | null> {
  return useService(
    async () => {
      const result = await pool.query(
        'UPDATE skins SET name = $1, description = $2, theme_config = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, description || null, themeConfig ? JSON.stringify(themeConfig) : null, id]
      );
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.updateSkin(id, name, description, themeConfig)
  );
}

export async function deleteSkin(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM skins WHERE id = $1', [id]);
    },
    () => mockMultiTenantService.deleteSkin(id)
  ) as Promise<void>;
}

// A/B Variation operations
export async function getABVariationsBySkin(skinId: number): Promise<ABVariation[]> {
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM ab_variations WHERE skin_id = $1 ORDER BY name ASC',
        [skinId]
      );
      return result.rows;
    },
    () => mockMultiTenantService.getABVariationsBySkin(skinId)
  );
}

export async function getABVariationById(id: number): Promise<ABVariation | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM ab_variations WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.getABVariationById(id)
  );
}

export async function createABVariation(
  skinId: number,
  name: string,
  description?: string,
  variationConfig?: any,
  isActive: boolean = true
): Promise<ABVariation> {
  return useService(
    async () => {
      const result = await pool.query(
        'INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [skinId, name, description || null, variationConfig ? JSON.stringify(variationConfig) : null, isActive]
      );
      return result.rows[0];
    },
    () => mockMultiTenantService.createABVariation(skinId, name, description, variationConfig, isActive)
  );
}

export async function updateABVariation(
  id: number,
  name: string,
  description?: string,
  variationConfig?: any,
  isActive?: boolean
): Promise<ABVariation | null> {
  return useService(
    async () => {
      const result = await pool.query(
        'UPDATE ab_variations SET name = $1, description = $2, variation_config = $3, is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 RETURNING *',
        [name, description || null, variationConfig ? JSON.stringify(variationConfig) : null, isActive, id]
      );
      return result.rows[0] || null;
    },
    () => mockMultiTenantService.updateABVariation(id, name, description, variationConfig, isActive)
  );
}

export async function deleteABVariation(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM ab_variations WHERE id = $1', [id]);
    },
    () => mockMultiTenantService.deleteABVariation(id)
  ) as Promise<void>;
}

