import express from 'express';
import { pool } from '../db/connection.js';
import { getWebsiteById } from '../services/multiTenantService.js';
import { 
  getMergedSkinConfigForWebsite, 
  getSkinById,
  parseSkinConfig,
  parseVariationConfig,
  mergeSkinConfig
} from '../services/skinService.js';

const router = express.Router();

// Get widget configuration by website ID, domain, or skinId
router.get('/config', async (req, res) => {
  try {
    const websiteId = req.query.websiteId ? parseInt(req.query.websiteId as string) : null;
    const domain = req.query.domain as string | null;
    const skinId = req.query.skinId ? parseInt(req.query.skinId as string) : null;

    // If skinId is provided, use it directly (bypasses website lookup)
    if (skinId) {
      const skin = await getSkinById(skinId);
      
      if (!skin) {
        return res.status(404).json({ 
          error: 'Skin not found',
          hint: `No skin found with ID ${skinId}`
        });
      }

      // Get merged config for this specific skin
      const variation = await pool.query(
        'SELECT * FROM ab_variations WHERE skin_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1',
        [skin.id]
      );
      
      const baseConfig = parseSkinConfig(skin);
      const overrides = parseVariationConfig(variation.rows[0] || null);
      const mergedSkinConfig = mergeSkinConfig(baseConfig, overrides);
      
      mergedSkinConfig._meta = {
        skinId: skin.id,
        skinName: skin.name,
        variationId: variation.rows[0]?.id,
        variationName: variation.rows[0]?.name,
        mergedAt: new Date(),
      };

      // Get dialog tree
      let tree: any = null;
      if (variation.rows[0]) {
        const treesResult = await pool.query(
          'SELECT * FROM dialog_trees WHERE ab_variation_id = $1 ORDER BY created_at ASC LIMIT 1',
          [variation.rows[0].id]
        );
        tree = treesResult.rows[0] || null;
      }

      const legacyTheme = {
        primaryColor: mergedSkinConfig?.theme?.primaryColor || '#6366f1',
        backgroundColor: mergedSkinConfig?.theme?.backgroundColor || '#ffffff',
        textColor: mergedSkinConfig?.theme?.textColor || '#1f2937'
      };

      return res.json({
        websiteId: skin.website_id,
        websiteName: null,
        treeId: tree?.id || null,
        theme: legacyTheme,
        position: mergedSkinConfig?.components?.button?.position || 'bottom-right',
        title: mergedSkinConfig?.components?.header?.title || 'Chat Assistant',
        skin: {
          id: mergedSkinConfig._meta?.skinId,
          name: mergedSkinConfig._meta?.skinName,
          config: mergedSkinConfig
        },
        variation: variation.rows[0] ? {
          id: variation.rows[0].id,
          name: variation.rows[0].name
        } : null,
        hasTree: !!tree,
        hasSkin: !!mergedSkinConfig,
        hasVariation: !!variation.rows[0]
      });
    }

    // Otherwise, use websiteId or domain
    if (!websiteId && !domain) {
      return res.status(400).json({ 
        error: 'Either websiteId, domain, or skinId query parameter is required' 
      });
    }

    let website: any = null;

    // Find website by ID or domain
    if (websiteId) {
      website = await getWebsiteById(websiteId);
    } else if (domain) {
      const result = await pool.query(
        'SELECT * FROM websites WHERE domain = $1',
        [domain]
      );
      website = result.rows[0] || null;
    }

    if (!website) {
      return res.status(404).json({ 
        error: 'Website not found',
        hint: websiteId ? `No website found with ID ${websiteId}` : `No website found with domain ${domain}`
      });
    }

    // Get merged skin configuration (includes A/B variation overrides)
    const mergedSkinConfig = await getMergedSkinConfigForWebsite(website.id);

    // Get active A/B variation for dialog tree lookup
    let variation: any = null;
    let tree: any = null;

    if (mergedSkinConfig?._meta?.skinId) {
      const variationsResult = await pool.query(
        'SELECT * FROM ab_variations WHERE skin_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1',
        [mergedSkinConfig._meta.skinId]
      );
      variation = variationsResult.rows[0] || null;
      
      // If no active variation, get any variation
      if (!variation) {
        const anyVariationResult = await pool.query(
          'SELECT * FROM ab_variations WHERE skin_id = $1 ORDER BY created_at ASC LIMIT 1',
          [mergedSkinConfig._meta.skinId]
        );
        variation = anyVariationResult.rows[0] || null;
      }

      // Get first dialog tree for this variation
      if (variation) {
        const treesResult = await pool.query(
          'SELECT * FROM dialog_trees WHERE ab_variation_id = $1 ORDER BY created_at ASC LIMIT 1',
          [variation.id]
        );
        tree = treesResult.rows[0] || null;
      }
    }

    // Legacy theme format for backward compatibility
    const legacyTheme = {
      primaryColor: mergedSkinConfig?.theme?.primaryColor || '#6366f1',
      backgroundColor: mergedSkinConfig?.theme?.backgroundColor || '#ffffff',
      textColor: mergedSkinConfig?.theme?.textColor || '#1f2937'
    };

    // Return widget configuration with full skin config
    res.json({
      websiteId: website.id,
      websiteName: website.name,
      treeId: tree?.id || null,
      // Legacy format for backward compatibility
      theme: legacyTheme,
      position: mergedSkinConfig?.components?.button?.position || 'bottom-right',
      title: mergedSkinConfig?.components?.header?.title || 'Chat Assistant',
      // New: Full skin configuration
      skin: mergedSkinConfig ? {
        id: mergedSkinConfig._meta?.skinId,
        name: mergedSkinConfig._meta?.skinName,
        config: mergedSkinConfig
      } : null,
      variation: variation ? {
        id: variation.id,
        name: variation.name
      } : null,
      hasTree: !!tree,
      hasSkin: !!mergedSkinConfig,
      hasVariation: !!variation
    });
  } catch (error: any) {
    console.error('Error fetching widget config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch widget configuration',
      details: error.message 
    });
  }
});

export default router;

