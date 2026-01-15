/**
 * Skin Service
 * 
 * Handles fetching, parsing, and merging skin configurations
 * with A/B variation overrides.
 */

import { pool } from '../db/connection.js';
import { Skin, ABVariation } from './multiTenantService.js';
import { SkinConfig, VariationOverrides, MergedSkinConfig, DEFAULT_SKIN_CONFIG } from '../types/skinConfig.js';

/**
 * Parse skin theme_config from database
 */
export function parseSkinConfig(skin: Skin | null): SkinConfig {
  if (!skin || !skin.theme_config) {
    return DEFAULT_SKIN_CONFIG;
  }

  try {
    const config = typeof skin.theme_config === 'string'
      ? JSON.parse(skin.theme_config)
      : skin.theme_config;

    // If it's just colors (legacy format), convert to new format
    if (config.primaryColor && !config.theme && !config.components) {
      return {
        ...DEFAULT_SKIN_CONFIG,
        theme: {
          primaryColor: config.primaryColor,
          secondaryColor: config.secondaryColor || config.backgroundColor,
          backgroundColor: config.backgroundColor || config.secondaryColor,
          textColor: config.textColor,
        },
      };
    }

    // Merge with defaults to ensure all properties exist
    return deepMerge(DEFAULT_SKIN_CONFIG, config);
  } catch (error) {
    console.warn('Error parsing skin config, using defaults:', error);
    return DEFAULT_SKIN_CONFIG;
  }
}

/**
 * Parse A/B variation config from database
 */
export function parseVariationConfig(variation: ABVariation | null): VariationOverrides {
  if (!variation || !variation.variation_config) {
    return {};
  }

  try {
    const config = typeof variation.variation_config === 'string'
      ? JSON.parse(variation.variation_config)
      : variation.variation_config;

    return config;
  } catch (error) {
    console.warn('Error parsing variation config:', error);
    return {};
  }
}

/**
 * Merge base skin config with A/B variation overrides
 */
export function mergeSkinConfig(
  baseConfig: SkinConfig,
  overrides: VariationOverrides
): MergedSkinConfig {
  let merged = { ...baseConfig };

  // Handle dot-notation overrides
  if (overrides.overrides) {
    merged = applyDotNotationOverrides(merged, overrides.overrides);
  }

  // Handle structured overrides
  if (overrides.theme) {
    merged.theme = { ...merged.theme, ...overrides.theme };
  }

  if (overrides.components) {
    merged.components = deepMerge(merged.components || {}, overrides.components);
  }

  if (overrides.states) {
    merged.states = deepMerge(merged.states || {}, overrides.states);
  }

  return merged as MergedSkinConfig;
}

/**
 * Apply dot-notation overrides (e.g., "theme.primaryColor": "#ff0000")
 */
function applyDotNotationOverrides(config: any, overrides: Record<string, any>): any {
  const result = { ...config };

  for (const [path, value] of Object.entries(overrides)) {
    setNestedProperty(result, path, value);
  }

  return result;
}

/**
 * Set a nested property using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get active skin for a website
 * Priority: is_active = true → first created (fallback)
 */
export async function getActiveSkinForWebsite(websiteId: number): Promise<Skin | null> {
  // Try to get active skin first
  const activeResult = await pool.query(
    `SELECT * FROM skins 
     WHERE website_id = $1 AND is_active = true 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [websiteId]
  );

  if (activeResult.rows.length > 0) {
    return activeResult.rows[0];
  }

  // Fallback to first skin if no active skin
  const fallbackResult = await pool.query(
    `SELECT * FROM skins 
     WHERE website_id = $1 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [websiteId]
  );

  return fallbackResult.rows[0] || null;
}

/**
 * Get skin by ID
 */
export async function getSkinById(skinId: number): Promise<Skin | null> {
  const result = await pool.query(
    'SELECT * FROM skins WHERE id = $1',
    [skinId]
  );
  return result.rows[0] || null;
}

/**
 * Get active A/B variation for a skin
 * Priority: is_active = true, then first created
 */
export async function getActiveVariationForSkin(skinId: number): Promise<ABVariation | null> {
  // Try active first
  const activeResult = await pool.query(
    `SELECT * FROM ab_variations 
     WHERE skin_id = $1 AND is_active = true 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [skinId]
  );

  if (activeResult.rows.length > 0) {
    return activeResult.rows[0];
  }

  // Fallback to any variation
  const fallbackResult = await pool.query(
    `SELECT * FROM ab_variations 
     WHERE skin_id = $1 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [skinId]
  );

  return fallbackResult.rows[0] || null;
}

/**
 * Get complete merged skin configuration for a website
 */
export async function getMergedSkinConfigForWebsite(
  websiteId: number
): Promise<MergedSkinConfig | null> {
  const skin = await getActiveSkinForWebsite(websiteId);
  if (!skin) {
    return null;
  }

  const variation = await getActiveVariationForSkin(skin.id);
  const baseConfig = parseSkinConfig(skin);
  const overrides = parseVariationConfig(variation);
  const merged = mergeSkinConfig(baseConfig, overrides);

  // Add metadata
  merged._meta = {
    skinId: skin.id,
    skinName: skin.name,
    variationId: variation?.id,
    variationName: variation?.name,
    mergedAt: new Date(),
  };

  return merged;
}

