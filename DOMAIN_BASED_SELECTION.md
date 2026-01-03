# Domain-Based Widget Selection Logic

## 🎯 Selection Flow

When a **domain** is provided, the widget follows this selection logic:

### Step 1: Find Website by Domain
```sql
SELECT * FROM websites WHERE domain = $1
```
- Looks up website by exact domain match
- Returns 404 if website not found

### Step 2: Get Active Skin for Website
```sql
SELECT * FROM skins 
WHERE website_id = $1 AND is_active = true 
ORDER BY created_at ASC 
LIMIT 1
```
**Priority:**
1. ✅ Skin with `is_active = true` (if multiple, first created)
2. ⚠️ Fallback: First skin created (if no active skin)

### Step 3: Get Active A/B Variation for Skin
```sql
SELECT * FROM ab_variations 
WHERE skin_id = $1 AND is_active = true 
ORDER BY created_at ASC 
LIMIT 1
```
**Priority:**
1. ✅ Variation with `is_active = true` (if multiple, first created)
2. ⚠️ Fallback: First variation created (if no active variation)

### Step 4: Get Dialog Tree for Variation
```sql
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY created_at ASC 
LIMIT 1
```
- Gets first dialog tree for the selected variation
- Returns `null` if no tree exists

### Step 5: Merge Configurations
1. Parse base skin config from `theme_config` JSONB
2. Parse variation overrides from `variation_config` JSONB
3. Merge: `baseConfig + variationOverrides = finalConfig`

## 📋 Example Flow

**Input:** `domain = "techstore.com"`

1. **Website:** Found → `website_id = 26`
2. **Skin:** Active skin → `skin_id = 12` (Default Theme)
3. **Variation:** Active variation → `variation_id = 1` (Control)
4. **Tree:** First tree → `tree_id = 18` (Product Inquiry Flow)
5. **Config:** Merged skin config with variation overrides

**Output:**
```json
{
  "websiteId": 26,
  "websiteName": "TechStore Pro",
  "treeId": 18,
  "skin": {
    "id": 12,
    "name": "Default Theme",
    "config": { /* merged config */ }
  },
  "variation": {
    "id": 1,
    "name": "Control"
  }
}
```

## 🔧 Usage

### Standard Usage (Domain Always Provided)
```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'techstore.com'  // ✅ Always provided
  });
</script>
```

### Selection Logic Summary

| Step | Selection Method | Priority |
|------|-----------------|----------|
| Website | Exact domain match | Domain → 404 if not found |
| Skin | Active flag | `is_active = true` → first created |
| Variation | Active flag | `is_active = true` → first created |
| Tree | First created | First tree → null if none |

## ✅ What Gets Selected

1. **Website:** By domain (exact match)
2. **Skin:** Active skin for website (or first if none active)
3. **Variation:** Active variation for skin (or first if none active)
4. **Tree:** First tree for variation (or null if none)
5. **Config:** Merged skin + variation configs

## 🎨 Config Merging

The final config is:
```
Base Skin Config (from theme_config)
  +
Variation Overrides (from variation_config)
  =
Merged Skin Config (used by widget)
```

Variation overrides can change:
- Colors (primaryColor, backgroundColor, etc.)
- Component settings (button size, position, etc.)
- State messages (loading, error, empty)

## 🔍 Debugging

Check what was selected:

```bash
curl "http://localhost:3001/api/widget/config?domain=techstore.com" | jq
```

Look for:
- `websiteId` - Which website was found
- `skin.id` - Which skin was selected
- `variation.id` - Which variation was selected
- `treeId` - Which tree was selected
- `skin.config` - The final merged config

## ⚠️ Common Issues

### Issue 1: No Active Skin
**Symptom:** Widget uses default colors
**Fix:** Set `is_active = true` on a skin:
```sql
UPDATE skins SET is_active = true WHERE id = 12;
```

### Issue 2: No Active Variation
**Symptom:** Widget works but no variation overrides applied
**Fix:** Set `is_active = true` on a variation:
```sql
UPDATE ab_variations SET is_active = true WHERE id = 1;
```

### Issue 3: No Dialog Tree
**Symptom:** Widget shows but chat doesn't work
**Fix:** Create a dialog tree for the variation:
```sql
INSERT INTO dialog_trees (name, ab_variation_id)
VALUES ('Main Flow', 1);
```

## 📝 Summary

**Domain → Website → Active Skin → Active Variation → First Tree → Merged Config**

This ensures consistent, predictable selection based on database state.

