# Skin Selection Guide

## 🎯 How Skin Selection Works

The widget decides which skin to use based on the parameters you provide. Here's the complete selection logic:

## 📊 Selection Priority

### 1. **Direct Skin Selection** (Highest Priority)
If `skinId` is provided, it uses that specific skin:

```html
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    skinId: 5  // ✅ Uses skin ID 5 directly
  });
</script>
```

**Selection Logic:**
- Uses the specified skin (bypasses website lookup)
- Gets primary/active A/B variation for that skin
- Gets dialog tree for that variation

---

### 2. **Website-Based Selection**
If `websiteId` or `domain` is provided:

```html
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1  // ✅ Finds website, then active skin
  });
</script>
```

**Selection Logic:**
1. Find website by `websiteId` or `domain`
2. Get **active skin** for that website (`is_active = true`)
3. If no active skin → Get first created skin (fallback)
4. Get primary/active A/B variation for that skin
5. Get dialog tree for that variation

---

### 3. **Auto-Detection** (Lowest Priority)
If no parameters provided, auto-detects from current domain:

```html
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api'
    // ✅ Auto-detects domain from window.location.hostname
  });
</script>
```

**Selection Logic:**
1. Gets current domain from `window.location.hostname`
2. Finds website by domain
3. Gets active skin for that website
4. Gets primary/active A/B variation
5. Gets dialog tree

---

## 🔧 Database Schema

### Skins Table
```sql
CREATE TABLE skins (
  id SERIAL PRIMARY KEY,
  website_id INT REFERENCES websites(id),
  name VARCHAR(255),
  description TEXT,
  theme_config JSONB,
  is_active BOOLEAN DEFAULT false,  -- ✅ NEW: Active flag
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Selection Query
```sql
-- Get active skin for website
SELECT * FROM skins 
WHERE website_id = $1 AND is_active = true 
ORDER BY created_at ASC 
LIMIT 1;

-- Fallback: First created skin
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY created_at ASC 
LIMIT 1;
```

---

## 📝 Script Injection Parameters

### Available Parameters

```javascript
ConversaTree.init({
  // API Configuration
  apiUrl: 'http://localhost:3001/api',
  
  // Selection Methods (choose one)
  skinId: 5,        // ✅ NEW: Direct skin selection (highest priority)
  websiteId: 1,     // Find by website ID
  domain: 'example.com',  // Find by domain
  treeId: 10,       // Manual tree (bypasses skin selection)
  
  // Manual Overrides (optional)
  position: 'bottom-right',
  primaryColor: '#ff0000',  // Overrides skin theme
  backgroundColor: '#ffffff',
  textColor: '#000000',
  title: 'Custom Title'
});
```

### Parameter Priority

1. **`skinId`** - Direct skin selection (bypasses website)
2. **`websiteId`** - Website-based selection
3. **`domain`** - Domain-based selection
4. **`treeId`** - Manual tree (no skin selection)
5. **Auto-detect** - From current domain

---

## 🎨 Use Cases

### Use Case 1: Multiple Skins Per Website

**Scenario:** You have "Light Theme" and "Dark Theme" for the same website

**Solution:**
```sql
-- Set one as active
UPDATE skins SET is_active = true WHERE id = 1;
UPDATE skins SET is_active = false WHERE id = 2;
```

**Widget automatically uses active skin:**
```html
<script>
  ConversaTree.init({
    websiteId: 1  // ✅ Uses skin with is_active = true
  });
</script>
```

---

### Use Case 2: Direct Skin Selection

**Scenario:** You want to test a specific skin regardless of website

**Solution:**
```html
<script>
  ConversaTree.init({
    skinId: 5  // ✅ Uses skin ID 5 directly
  });
</script>
```

**Useful for:**
- Testing specific skins
- Previewing skins
- Overriding website default

---

### Use Case 3: A/B Testing Skins

**Scenario:** Test two different skins to see which performs better

**Solution:**
```javascript
// Randomly assign users to skin A or B
const skinId = Math.random() < 0.5 ? 1 : 2;

ConversaTree.init({
  skinId: skinId  // ✅ 50/50 split
});
```

---

### Use Case 4: Seasonal Skins

**Scenario:** Switch to holiday theme during Christmas

**Solution:**
```sql
-- Activate holiday skin
UPDATE skins SET is_active = false WHERE website_id = 1;
UPDATE skins SET is_active = true WHERE id = 5;  -- Holiday skin
```

**Widget automatically picks it up:**
```html
<script>
  ConversaTree.init({
    websiteId: 1  // ✅ Now uses holiday skin
  });
</script>
```

---

### Use Case 5: Multi-Tenant with Shared Skins

**Scenario:** Multiple websites share the same skin

**Solution:**
```sql
-- Same skin for multiple websites
INSERT INTO skins (website_id, name, theme_config, is_active)
VALUES 
  (1, 'Shared Theme', '...', true),
  (2, 'Shared Theme', '...', true),
  (3, 'Shared Theme', '...', true);
```

**Each website uses its own instance:**
```html
<!-- Website 1 -->
<script>
  ConversaTree.init({ websiteId: 1 });
</script>

<!-- Website 2 -->
<script>
  ConversaTree.init({ websiteId: 2 });
</script>
```

---

## 🔄 Migration: Adding is_active Column

If you have an existing database, run this migration:

```sql
-- Add is_active column
ALTER TABLE skins 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Set first skin as active for each website (optional)
UPDATE skins s1
SET is_active = true
WHERE s1.id = (
  SELECT id FROM skins s2
  WHERE s2.website_id = s1.website_id
  ORDER BY created_at ASC
  LIMIT 1
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_skins_website_active 
ON skins(website_id, is_active) 
WHERE is_active = true;
```

---

## ✅ Best Practices

### 1. **Always Set One Active Skin Per Website**
```sql
-- When activating a new skin, deactivate others
UPDATE skins 
SET is_active = false 
WHERE website_id = 1 AND id != 5;

UPDATE skins 
SET is_active = true 
WHERE id = 5;
```

### 2. **Use skinId for Testing**
```html
<!-- Testing specific skin -->
<script>
  ConversaTree.init({ skinId: 10 });
</script>
```

### 3. **Use websiteId for Production**
```html
<!-- Production: Let system decide -->
<script>
  ConversaTree.init({ websiteId: 1 });
</script>
```

### 4. **Document Your Skins**
- Name them clearly: "Dark Theme", "Mobile Optimized"
- Add descriptions
- Note which is active

---

## 🎯 Summary

| Parameter | Selection Method | Use Case |
|-----------|-----------------|----------|
| `skinId` | Direct skin selection | Testing, previews, specific needs |
| `websiteId` | Active skin for website | Production (recommended) |
| `domain` | Active skin for domain | Auto-detection |
| `treeId` | Manual tree (no skin) | Legacy/override |

**Default Behavior:**
- If multiple skins exist → Uses `is_active = true`
- If no active skin → Uses first created (fallback)
- Always respects `skinId` if provided (highest priority)

---

## 🚀 Quick Reference

```html
<!-- Method 1: Direct skin (NEW) -->
<script>
  ConversaTree.init({ skinId: 5 });
</script>

<!-- Method 2: Website-based -->
<script>
  ConversaTree.init({ websiteId: 1 });
</script>

<!-- Method 3: Domain-based -->
<script>
  ConversaTree.init({ domain: 'example.com' });
</script>

<!-- Method 4: Auto-detect -->
<script>
  ConversaTree.init({ apiUrl: '...' });
</script>
```

