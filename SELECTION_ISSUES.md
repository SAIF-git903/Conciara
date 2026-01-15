# Selection Issues and Solutions

## 🚨 Current Problem

When multiple items are active, the system uses **arbitrary selection** (oldest created). This is not ideal.

## 📊 Current Selection Logic

### 1. Skin Selection
```sql
SELECT * FROM skins 
WHERE website_id = $1 
ORDER BY created_at ASC  -- ⚠️ Always picks OLDEST
LIMIT 1
```
**Problem:** No control - always uses first created skin

### 2. A/B Variation Selection
```sql
SELECT * FROM ab_variations 
WHERE skin_id = $1 AND is_active = true 
ORDER BY created_at ASC  -- ⚠️ If multiple active, picks OLDEST
LIMIT 1
```
**Problem:** If "Control" and "Test" are both active, it picks whichever was created first

### 3. Dialog Tree Selection
```sql
SELECT * FROM dialog_trees 
WHERE ab_variation_id = $1 
ORDER BY created_at ASC  -- ⚠️ Always picks OLDEST
LIMIT 1
```
**Problem:** No control - always uses first created tree

## 🎯 What Happens When Multiple Active

### Scenario: Two Active A/B Variations

**Your Situation:**
- "Control" (created first, is_active = true)
- "Test" (created later, is_active = true)

**System Picks:** "Control" (oldest active variation)

**Why?** The query orders by `created_at ASC` and takes the first one.

## 💡 Solutions

### Solution 1: Only One Active at a Time (Recommended)

**Enforce:** Only one variation can be active per skin.

**Implementation:**
- When setting a variation to active, automatically deactivate others
- Add validation: "Only one variation can be active at a time"

### Solution 2: Add Priority/Order Field

**Add:** `display_order` or `priority` field to control selection order.

**Implementation:**
- Lower number = higher priority
- Order by priority, then created_at

### Solution 3: Add "is_default" Flag

**Add:** `is_default` flag to mark the primary/default selection.

**Implementation:**
- One item can be marked as default
- Selection: default → active → first created

### Solution 4: Add "is_primary" Flag (Best for A/B Testing)

**Add:** `is_primary` flag for A/B variations.

**Implementation:**
- Primary variation is used for widget
- Other active variations are for testing/analytics
- Selection: primary → active → first created

