# Skin Selection & A/B Variation Implementation

## ✅ What Was Implemented

### 1. **Added `is_active` Column to Skins Table**

**Migration Update:**
- Added `is_active BOOLEAN DEFAULT false` column
- Added index for performance: `idx_skins_website_active`
- Backward compatible (existing databases get column added automatically)

**Selection Logic:**
- Priority: `is_active = true` → First created (fallback)
- Only one active skin per website (enforced by application logic)

---

### 2. **Added `skinId` Parameter to Widget Script**

**New Parameter:**
```javascript
ConversaTree.init({
  skinId: 5  // ✅ Direct skin selection (highest priority)
});
```

**Selection Priority:**
1. `skinId` - Direct skin selection (bypasses website)
2. `websiteId` - Active skin for website
3. `domain` - Active skin for domain
4. Auto-detect - From current domain

---

### 3. **Updated API Endpoint**

**`GET /api/widget/config`** now accepts:
- `?skinId=5` - Direct skin selection
- `?websiteId=1` - Website-based (uses active skin)
- `?domain=example.com` - Domain-based (uses active skin)

**Response includes:**
- Full `skin.config` object
- Legacy `theme` object (backward compatible)
- `variation` metadata

---

### 4. **Updated All Widget Implementations**

**Files Updated:**
- ✅ `backend/src/routes/widget.ts` - API endpoint
- ✅ `backend/src/services/skinService.ts` - Selection logic
- ✅ `frontend/components/ChatbotWidget.tsx` - React component
- ✅ `frontend/public/widget.js` - Standalone widget

---

## 📊 How Skin Selection Works

### Scenario 1: Multiple Skins Per Website

```sql
-- Website has 3 skins
Skin 1: "Light Theme" (is_active = false)
Skin 2: "Dark Theme" (is_active = true)  ✅ Selected
Skin 3: "Holiday Theme" (is_active = false)
```

**Widget automatically uses active skin:**
```html
<script>
  ConversaTree.init({
    websiteId: 1  // ✅ Uses Skin 2 (is_active = true)
  });
</script>
```

---

### Scenario 2: Direct Skin Selection

```html
<script>
  ConversaTree.init({
    skinId: 3  // ✅ Uses Skin 3 directly, regardless of is_active
  });
</script>
```

**Use Cases:**
- Testing specific skins
- Previewing skins
- Overriding website default

---

### Scenario 3: No Active Skin (Fallback)

```sql
-- All skins have is_active = false
Skin 1: "Light Theme" (is_active = false)
Skin 2: "Dark Theme" (is_active = false)
```

**Widget uses first created:**
```html
<script>
  ConversaTree.init({
    websiteId: 1  // ✅ Uses Skin 1 (first created, fallback)
  });
</script>
```

---

## 🎯 A/B Variation Use Cases

### Use Case 1: A/B Testing UI Designs

**Test:** Does a smaller button increase engagement?

**Base Skin:**
```json
{
  "components": {
    "button": { "size": "large" }
  }
}
```

**Variation A (Control):**
```json
{
  "overrides": {
    "components.button.size": "large"
  }
}
```

**Variation B (Test):**
```json
{
  "overrides": {
    "components.button.size": "small"
  }
}
```

**Usage:**
- Set both as `is_active = true`
- Set one as `is_primary = true` (the one to test)
- Switch primary to test the other
- Track metrics

---

### Use Case 2: Seasonal Themes

**Base Skin:** Default blue theme

**Christmas Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#dc2626",
    "components.header.title": "🎄 Holiday Chat"
  }
}
```

**Usage:**
- Create seasonal variation
- Set as `is_primary = true` during season
- Switch back after season

---

### Use Case 3: Feature Flags

**Base Skin:** No quick replies

**Feature Variation:**
```json
{
  "overrides": {
    "components.quickReplies.show": true
  }
}
```

**Usage:**
- Create variation with feature enabled
- Use JavaScript to randomly assign 10% of users
- Pass `skinId` for variation-specific config
- Gradually increase percentage

---

### Use Case 4: Customer Segments

**Base Skin:** Standard theme

**Premium Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#fbbf24",
    "components.header.title": "Premium Support"
  }
}
```

**Usage:**
- Detect user segment (premium/free)
- Load appropriate variation via `skinId`
- Or use different `websiteId` per segment

---

### Use Case 5: Mobile Optimization

**Base Skin:** Desktop (384px width)

**Mobile Variation:**
```json
{
  "overrides": {
    "components.window.width": 320,
    "components.messages.showAvatars": false
  }
}
```

**Usage:**
- Detect mobile user
- Use `skinId` parameter to load mobile variation
- Or use JavaScript to switch based on screen size

---

## 📝 Migration Steps

### Step 1: Run Migration

The migration will automatically:
- Add `is_active` column if it doesn't exist
- Create index for performance

```bash
cd backend
npm run migrate
```

### Step 2: Set Active Skins (Optional)

If you want to set the first skin as active for each website:

```sql
UPDATE skins s1
SET is_active = true
WHERE s1.id = (
  SELECT id FROM skins s2
  WHERE s2.website_id = s1.website_id
  ORDER BY created_at ASC
  LIMIT 1
);
```

### Step 3: Test

```html
<!-- Test direct skin selection -->
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    skinId: 1
  });
</script>

<!-- Test website-based selection -->
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1
  });
</script>
```

---

## 🎨 Script Injection Examples

### Example 1: Direct Skin Selection

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    skinId: 5  // ✅ Uses skin ID 5 directly
  });
</script>
```

### Example 2: Website-Based (Recommended for Production)

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1  // ✅ Uses active skin for website
  });
</script>
```

### Example 3: Domain-Based

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'example.com'  // ✅ Uses active skin for domain
  });
</script>
```

### Example 4: A/B Testing

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  // Randomly assign users to different skins
  const skinId = Math.random() < 0.5 ? 1 : 2;
  
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    skinId: skinId  // ✅ 50/50 split
  });
</script>
```

---

## 🔧 API Endpoint

### GET `/api/widget/config`

**Query Parameters:**
- `skinId` (number, optional) - Direct skin selection
- `websiteId` (number, optional) - Website-based selection
- `domain` (string, optional) - Domain-based selection

**Example Requests:**
```
GET /api/widget/config?skinId=5
GET /api/widget/config?websiteId=1
GET /api/widget/config?domain=example.com
```

**Response:**
```json
{
  "websiteId": 1,
  "websiteName": "Example Site",
  "treeId": 1,
  "theme": { /* legacy format */ },
  "skin": {
    "id": 5,
    "name": "Dark Theme",
    "config": { /* full MergedSkinConfig */ }
  },
  "variation": {
    "id": 1,
    "name": "Control"
  }
}
```

---

## ✅ Summary

### What You Can Now Do:

1. ✅ **Multiple Skins Per Website**
   - Set one as `is_active = true`
   - Widget automatically uses active skin

2. ✅ **Direct Skin Selection**
   - Use `skinId` parameter in script
   - Bypasses website lookup
   - Perfect for testing/previews

3. ✅ **A/B Testing**
   - Create variations with different overrides
   - Test UI changes easily
   - Track metrics

4. ✅ **Seasonal/Themed Updates**
   - Create themed variations
   - Switch primary variation
   - No code changes needed

5. ✅ **Feature Rollouts**
   - Gradual feature rollouts
   - Test with small percentage
   - Increase over time

---

## 📚 Documentation

- **`SKIN_SELECTION_GUIDE.md`** - Complete skin selection guide
- **`AB_VARIATION_USE_CASES.md`** - A/B variation use cases and examples
- **`SKIN_RENDERER_IMPLEMENTATION.md`** - Data-driven skin renderer docs

---

## 🚀 Next Steps

1. Run migration to add `is_active` column
2. Set active skins for your websites
3. Test with `skinId` parameter
4. Create A/B variations for testing
5. Monitor and iterate!

