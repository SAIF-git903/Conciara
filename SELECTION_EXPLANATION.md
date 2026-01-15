# How Selection Works - Complete Explanation

## 🎯 Current Selection Logic (After Improvements)

### When Widget Loads:

1. **Website** → Identified by `domain` or `websiteId`
2. **Skin** → Selected by: `is_active = true` → First created (fallback)
3. **A/B Variation** → Selected by: `is_primary = true` → `is_active = true` → First created (fallback)
4. **Dialog Tree** → Selected by: `is_active = true` → First created (fallback)

## 📊 Selection Priority Order

### 1. Skin Selection

```sql
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY 
  CASE WHEN is_active = true THEN 0 ELSE 1 END,  -- Active first
  created_at ASC                                  -- Then oldest
LIMIT 1
```

**Priority:**
1. ✅ Active skin (`is_active = true`)
2. ⚠️ First created skin (if no active)

**Example:**
- "Fashion Theme" (active) ✅
- "Dark Mode" (inactive) ❌

**Result:** "Fashion Theme" is selected

---

### 2. A/B Variation Selection

```sql
-- First: Try primary variation
SELECT * FROM ab_variations 
WHERE skin_id = $1 AND is_primary = true 
ORDER BY created_at ASC 
LIMIT 1

-- Fallback: Active variations
SELECT * FROM ab_variations 
WHERE skin_id = $1 AND is_active = true 
ORDER BY created_at ASC 
LIMIT 1

-- Last resort: Any variation
SELECT * FROM ab_variations 
WHERE skin_id = $1 
ORDER BY created_at ASC 
LIMIT 1
```

**Priority:**
1. ✅ **Primary variation** (`is_primary = true`) - **NEW!**
2. ✅ Active variation (`is_active = true`)
3. ⚠️ First created (if no active)

**Example with your situation:**
- "Control" (is_active = true, is_primary = false)
- "Test" (is_active = true, is_primary = false)

**Current Result:** "Control" is selected (first active, oldest)

**After setting primary:**
- "Control" (is_active = true, is_primary = **true**) ✅
- "Test" (is_active = true, is_primary = false) ❌

**New Result:** "Control" is selected (primary takes priority)

---

### 3. Dialog Tree Selection

```sql
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY 
  CASE WHEN is_active = true THEN 0 ELSE 1 END,  -- Active first
  created_at ASC                                  -- Then oldest
LIMIT 1
```

**Priority:**
1. ✅ Active tree (`is_active = true`)
2. ⚠️ First created tree (if no active)

**Example:**
- "Style Consultation Flow" (active) ✅
- "Product Inquiry Flow" (inactive) ❌

**Result:** "Style Consultation Flow" is selected

---

## 🔧 How to Control Selection

### For A/B Variations (Your Question)

**Problem:** Both "Control" and "Test" are active. Which one is chosen?

**Current Behavior:**
- System picks the **oldest active** variation (first created)
- If "Control" was created before "Test", "Control" is chosen

**Solution: Use `is_primary` Flag**

1. **Set one variation as primary:**
   - Mark "Control" as `is_primary = true`
   - System will **always** choose the primary variation
   - Other variations can still be active for testing/analytics

2. **Only one primary per skin:**
   - When you set a variation as primary, others are automatically unset
   - Ensures only one variation is used for the widget

### For Skins

**Problem:** Multiple skins exist. Which one is chosen?

**Solution: Use `is_active` Flag**

1. **Set one skin as active:**
   - Mark "Fashion Theme" as `is_active = true`
   - System will choose the active skin
   - When you activate a skin, others are automatically deactivated

### For Dialog Trees

**Problem:** Multiple trees exist. Which one is chosen?

**Solution: Use `is_active` Flag**

1. **Set one tree as active:**
   - Mark "Style Consultation Flow" as `is_active = true`
   - System will choose the active tree
   - When you activate a tree, others for the same variation are automatically deactivated

---

## 🎨 Visual Example

### Your Current Situation:

```
Website: FashionHub
│
├─ Skin: "Fashion Theme" ✅ (is_active = true)
│  │
│  ├─ A/B Variation: "Control" ✅ (is_active = true, is_primary = false)
│  │  │
│  │  └─ Dialog Tree: "Style Consultation Flow" ✅ (is_active = true)
│  │
│  └─ A/B Variation: "Test" ✅ (is_active = true, is_primary = false)
│     │
│     └─ Dialog Tree: "Product Inquiry Flow" ❌ (not selected)
```

**Current Selection:**
- Skin: "Fashion Theme" ✅
- Variation: "Control" ✅ (oldest active)
- Tree: "Style Consultation Flow" ✅

### After Setting Primary:

```
Website: FashionHub
│
├─ Skin: "Fashion Theme" ✅ (is_active = true)
│  │
│  ├─ A/B Variation: "Control" ✅ (is_active = true, is_primary = **true**)
│  │  │
│  │  └─ Dialog Tree: "Style Consultation Flow" ✅ (is_active = true)
│  │
│  └─ A/B Variation: "Test" ✅ (is_active = true, is_primary = false)
│     │
│     └─ Dialog Tree: "Product Inquiry Flow" ❌ (not selected)
```

**New Selection:**
- Skin: "Fashion Theme" ✅
- Variation: "Control" ✅ (primary takes priority)
- Tree: "Style Consultation Flow" ✅

---

## 🚀 What Changed

### New Features Added:

1. **`is_active` flag for Skins**
   - Control which skin is used
   - Only one active skin per website

2. **`is_primary` flag for A/B Variations**
   - Control which variation is used for widget
   - Only one primary variation per skin
   - Other variations can still be active for testing

3. **`is_active` flag for Dialog Trees**
   - Control which tree is used
   - Only one active tree per variation

### Automatic Behavior:

- When you activate a skin → others are deactivated
- When you set a variation as primary → others are unset
- When you activate a tree → others for same variation are deactivated
- First item created is automatically set as active/primary

---

## 📝 Summary

**Your Question:** "It is showing two Variations active. How does it know which to choose?"

**Answer:**
1. **Current:** Picks the **oldest active** variation (first created)
2. **New:** Set one as `is_primary = true` → it will always be chosen
3. **Best Practice:** Only one variation should be primary for production use

**Your Question:** "What Skins to choose?"

**Answer:**
1. **Current:** Picks the **oldest** skin (first created)
2. **New:** Set one as `is_active = true` → it will be chosen
3. **Best Practice:** Only one skin should be active per website

The system now has proper control flags, so you can explicitly choose which items to use!

