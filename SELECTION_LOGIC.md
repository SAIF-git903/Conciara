# How Skin, A/B Variation, and Dialog Tree Selection Works

## 🎯 Current Selection Logic

When a customer visits a website, the system automatically selects which **Skin**, **A/B Variation**, and **Dialog Tree** to use. Here's how it works:

## 📊 Selection Flow

```
Website (identified by domain or websiteId)
    ↓
1. Find Website
    ↓
2. Get FIRST Skin (ORDER BY created_at ASC LIMIT 1)
    ↓
3. Get ACTIVE A/B Variation (is_active = true)
    If no active → Get FIRST Variation (fallback)
    ↓
4. Get FIRST Dialog Tree (ORDER BY created_at ASC LIMIT 1)
    ↓
5. Apply Skin Theme + Use Dialog Tree
```

## 🔍 Detailed Selection Rules

### 1. Skin Selection

**Current Logic:**
```sql
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY created_at ASC 
LIMIT 1
```

**What this means:**
- Gets the **first skin created** for the website
- No priority or "active" flag
- If multiple skins exist, always uses the oldest one

**Example:**
- Website: "TechStore Pro"
- Skins: "Default Theme" (created first), "Dark Mode" (created later)
- **Selected:** "Default Theme" (oldest)

---

### 2. A/B Variation Selection

**Current Logic:**
```sql
-- First try: Get active variation
SELECT * FROM ab_variations 
WHERE skin_id = $1 AND is_active = true 
ORDER BY created_at ASC 
LIMIT 1

-- Fallback: If no active, get any variation
SELECT * FROM ab_variations 
WHERE skin_id = $1 
ORDER BY created_at ASC 
LIMIT 1
```

**What this means:**
- **Priority 1:** Variation with `is_active = true`
- **Priority 2:** If no active, gets the first variation created
- Uses `is_active` flag to control which variation is live

**Example:**
- Skin: "Default Theme"
- Variations: "Control" (active), "Variant A" (active), "Variant B" (inactive)
- **Selected:** "Control" (first active one found)

---

### 3. Dialog Tree Selection

**Current Logic:**
```sql
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY created_at ASC 
LIMIT 1
```

**What this means:**
- Gets the **first dialog tree created** for the A/B variation
- No priority or "active" flag
- If multiple trees exist, always uses the oldest one

**Example:**
- A/B Variation: "Control"
- Trees: "Product Inquiry Flow" (created first), "Order Support Flow" (created later)
- **Selected:** "Product Inquiry Flow" (oldest)

---

## ⚠️ Current Limitations

### Problem 1: No "Default" or "Active" Skin
- System always picks the **first skin** (oldest)
- Can't mark a specific skin as "default" or "active"
- If you want a different skin, you must delete the old one

### Problem 2: No "Default" Dialog Tree
- System always picks the **first tree** (oldest)
- Can't mark a specific tree as "default"
- If you want a different tree, you must delete the old one

### Problem 3: Only One Tree Per Variation
- Each A/B variation can only have one active tree
- Can't have multiple trees active at once
- Can't switch between trees dynamically

---

## 💡 Ideal Improvements

### Option 1: Add "Active" Flags (Recommended)

Add `is_active` or `is_default` flags to Skins and Dialog Trees:

```sql
-- Skins table
ALTER TABLE skins ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE skins ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Dialog Trees table  
ALTER TABLE dialog_trees ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE dialog_trees ADD COLUMN is_default BOOLEAN DEFAULT false;
```

**Selection Logic:**
```sql
-- Skin: Get active skin, or default, or first
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY is_active DESC, is_default DESC, created_at ASC 
LIMIT 1

-- Dialog Tree: Get active tree, or default, or first
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY is_active DESC, is_default DESC, created_at ASC 
LIMIT 1
```

### Option 2: Add Priority/Order Fields

Add `display_order` or `priority` fields:

```sql
-- Skins table
ALTER TABLE skins ADD COLUMN display_order INT DEFAULT 0;

-- Dialog Trees table
ALTER TABLE dialog_trees ADD COLUMN display_order INT DEFAULT 0;
```

**Selection Logic:**
```sql
-- Skin: Order by display_order, then created_at
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY display_order ASC, created_at ASC 
LIMIT 1

-- Dialog Tree: Order by display_order, then created_at
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY display_order ASC, created_at ASC 
LIMIT 1
```

### Option 3: Website-Level Defaults

Add default selections at the website level:

```sql
ALTER TABLE websites ADD COLUMN default_skin_id INT REFERENCES skins(id);
ALTER TABLE websites ADD COLUMN default_tree_id INT REFERENCES dialog_trees(id);
```

**Selection Logic:**
```sql
-- If website has default_skin_id, use it
-- Otherwise, use current logic

-- If website has default_tree_id, use it
-- Otherwise, use current logic
```

---

## 🎯 Recommended Solution

**Best approach: Add `is_active` flags**

### Why?
1. ✅ Simple and intuitive
2. ✅ Consistent with A/B variations (already has `is_active`)
3. ✅ Easy to implement
4. ✅ Clear UI control (toggle active/inactive)
5. ✅ Allows multiple options, but only one active

### Implementation:

1. **Add `is_active` to Skins:**
   - Default: `true` for first skin, `false` for others
   - UI: Toggle button to activate/deactivate skins
   - Logic: Get active skin, or first if none active

2. **Add `is_active` to Dialog Trees:**
   - Default: `true` for first tree, `false` for others
   - UI: Toggle button to activate/deactivate trees
   - Logic: Get active tree, or first if none active

3. **Update Widget Config API:**
   ```typescript
   // Get active skin
   SELECT * FROM skins 
   WHERE website_id = $1 AND is_active = true 
   ORDER BY created_at ASC LIMIT 1
   
   // If no active, get first
   SELECT * FROM skins 
   WHERE website_id = $1 
   ORDER BY created_at ASC LIMIT 1
   
   // Same for dialog trees
   ```

---

## 📝 Current Behavior Summary

### When Widget Loads:

1. **User visits:** `techstore.com`
2. **Widget calls:** `/api/widget/config?domain=techstore.com`
3. **Backend finds:**
   - Website: "TechStore Pro" (domain: techstore.com)
   - **Skin:** First skin created (e.g., "Default Theme")
   - **A/B Variation:** Active variation (e.g., "Control")
   - **Dialog Tree:** First tree created (e.g., "Product Inquiry Flow")
4. **Widget receives:**
   - `treeId: 1`
   - `theme: { primaryColor: "#2563eb", ... }` (from skin's theme_config)
5. **Widget applies:**
   - Theme colors automatically
   - Uses dialog tree for conversations

### Key Points:

- ✅ **Skin:** Always first created (no control)
- ✅ **A/B Variation:** Active one (you control via `is_active`)
- ✅ **Dialog Tree:** Always first created (no control)
- ⚠️ **Problem:** Can't easily switch skins or trees without deleting

---

## 🔧 How to Control Selection (Current Workaround)

### To Change Skin:
1. Delete the old skin (if you want it gone)
2. OR create new skin first (becomes the "first")
3. ⚠️ Not ideal - destructive

### To Change Dialog Tree:
1. Delete the old tree (if you want it gone)
2. OR create new tree first (becomes the "first")
3. ⚠️ Not ideal - destructive

### To Change A/B Variation:
1. Set `is_active = false` on current variation
2. Set `is_active = true` on desired variation
3. ✅ Works well - non-destructive

---

## 🎨 Visual Example

```
Website: TechStore Pro (techstore.com)
│
├─ Skin: "Default Theme" ✅ (first created - auto-selected)
│  │
│  ├─ A/B Variation: "Control" ✅ (is_active = true - selected)
│  │  │
│  │  └─ Dialog Tree: "Product Inquiry Flow" ✅ (first created - auto-selected)
│  │
│  └─ A/B Variation: "Variant A" ❌ (is_active = false - not selected)
│     │
│     └─ Dialog Tree: "Order Support Flow" ❌ (not selected)
│
└─ Skin: "Dark Mode" ❌ (created later - not selected)
   │
   └─ A/B Variation: "Control" ✅ (is_active = true)
      │
      └─ Dialog Tree: "Style Consultation Flow" ❌ (not selected)
```

**Result:** Widget uses:
- Skin: "Default Theme"
- A/B Variation: "Control"  
- Dialog Tree: "Product Inquiry Flow"

---

## 🚀 Next Steps

Would you like me to implement the `is_active` flags for Skins and Dialog Trees? This would give you full control over which skin and tree are used, just like A/B variations.

