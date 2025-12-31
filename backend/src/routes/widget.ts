import express from 'express';
import { pool } from '../db/connection.js';
import { getWebsiteById } from '../services/multiTenantService.js';

const router = express.Router();

// Get widget configuration by website ID or domain
router.get('/config', async (req, res) => {
  try {
    const websiteId = req.query.websiteId ? parseInt(req.query.websiteId as string) : null;
    const domain = req.query.domain as string | null;

    if (!websiteId && !domain) {
      return res.status(400).json({ 
        error: 'Either websiteId or domain query parameter is required' 
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

    // Get first skin for this website
    const skinsResult = await pool.query(
      'SELECT * FROM skins WHERE website_id = $1 ORDER BY created_at ASC LIMIT 1',
      [website.id]
    );
    const skin = skinsResult.rows[0] || null;

    // Get active A/B variation for this skin
    let variation: any = null;
    if (skin) {
      const variationsResult = await pool.query(
        'SELECT * FROM ab_variations WHERE skin_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1',
        [skin.id]
      );
      variation = variationsResult.rows[0] || null;
      
      // If no active variation, get any variation
      if (!variation) {
        const anyVariationResult = await pool.query(
          'SELECT * FROM ab_variations WHERE skin_id = $1 ORDER BY created_at ASC LIMIT 1',
          [skin.id]
        );
        variation = anyVariationResult.rows[0] || null;
      }
    }

    // Get first dialog tree for this variation
    let tree: any = null;
    if (variation) {
      const treesResult = await pool.query(
        'SELECT * FROM dialog_trees WHERE ab_variation_id = $1 ORDER BY created_at ASC LIMIT 1',
        [variation.id]
      );
      tree = treesResult.rows[0] || null;
    }

    // Parse theme config from skin
    let theme = {
      primaryColor: '#6366f1',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    };

    if (skin && skin.theme_config) {
      try {
        const themeConfig = typeof skin.theme_config === 'string' 
          ? JSON.parse(skin.theme_config) 
          : skin.theme_config;
        
        theme = {
          primaryColor: themeConfig.primaryColor || theme.primaryColor,
          backgroundColor: themeConfig.backgroundColor || themeConfig.secondaryColor || theme.backgroundColor,
          textColor: themeConfig.textColor || theme.textColor
        };
      } catch (error) {
        console.warn('Error parsing theme_config:', error);
      }
    }

    // Return widget configuration
    res.json({
      websiteId: website.id,
      websiteName: website.name,
      treeId: tree?.id || null,
      theme: theme,
      position: 'bottom-right',
      title: 'Chat Assistant',
      hasTree: !!tree,
      hasSkin: !!skin,
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

