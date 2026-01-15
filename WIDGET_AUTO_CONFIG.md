# Widget Auto-Configuration Guide

## 🎉 New Features Implemented

The widget now supports automatic configuration based on website ID or domain! No more manual treeId needed.

## ✨ What's New

### 1. **Domain Field Added to Websites**
- Websites now have a `domain` field
- Used for automatic website detection

### 2. **Widget Config API Endpoint**
- `GET /api/widget/config?websiteId=X` or `?domain=X`
- Automatically finds:
  - Active skin → gets theme colors
  - Active A/B variation → gets dialog tree
  - Returns complete widget configuration

### 3. **Auto-Detection in Widget**
- Widget can now auto-detect website from domain
- Automatically loads theme from skin
- Automatically loads correct dialog tree

## 🚀 Usage Examples

### Method 1: By Website ID (Recommended)

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1  // ✅ Auto-loads tree + theme
  });
</script>
```

### Method 2: By Domain

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'techstore.com'  // ✅ Auto-loads tree + theme
  });
</script>
```

### Method 3: Auto-Detect from Current Domain

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api'
    // ✅ Automatically detects current domain and loads config
  });
</script>
```

### Method 4: Manual (Still Works)

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    treeId: 1,  // Manual override
    primaryColor: '#2563eb'  // Manual theme override
  });
</script>
```

## 📡 API Endpoint

### GET `/api/widget/config`

Get widget configuration for a website.

**Query Parameters:**
- `websiteId` (number, optional): Website ID
- `domain` (string, optional): Website domain

**Example Requests:**
```
GET /api/widget/config?websiteId=1
GET /api/widget/config?domain=techstore.com
```

**Response:**
```json
{
  "websiteId": 1,
  "websiteName": "TechStore Pro",
  "treeId": 1,
  "theme": {
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937"
  },
  "position": "bottom-right",
  "title": "Chat Assistant",
  "hasTree": true,
  "hasSkin": true,
  "hasVariation": true
}
```

**Error Response (No Tree Found):**
```json
{
  "error": "No dialog tree found for this website",
  "websiteId": 1,
  "websiteName": "TechStore Pro",
  "hasSkin": true,
  "hasVariation": true,
  "hint": "Please create a dialog tree in the admin panel for this A/B variation"
}
```

## 🎨 How Skin Theme is Applied

1. **Widget fetches config** from `/api/widget/config`
2. **Backend finds website** → gets active skin
3. **Backend parses `theme_config`** from skin (JSON)
4. **Returns theme colors** in response
5. **Widget applies colors** automatically:
   - Chat button color
   - Header background
   - Bot message bubbles
   - Quick reply buttons
   - Send button
   - Widget background

## 🔄 How Website → Chatbot Mapping Works

```
User visits: techstore.com
    ↓
Widget auto-detects domain
    ↓
Calls: GET /api/widget/config?domain=techstore.com
    ↓
Backend finds:
  - Website: "TechStore Pro" (domain: techstore.com)
  - Active Skin: "Default Theme" (theme_config: {...})
  - Active A/B Variation: "Control"
  - Dialog Tree: "Product Inquiry Flow" (treeId: 1)
    ↓
Returns: { treeId: 1, theme: {...} }
    ↓
Widget applies theme and uses treeId
    ↓
Chatbot shows with correct colors and conversation!
```

## 📝 Setting Up Domains

### In Admin UI:
1. Go to website settings
2. Add domain field (e.g., "techstore.com")
3. Save

### Via API:
```javascript
// Update website with domain
PUT /api/website/1
{
  "name": "TechStore Pro",
  "description": "...",
  "domain": "techstore.com"
}
```

### In Seed Data:
Domains are automatically added when you run `npm run seed`

## 🧪 Testing

### Test 1: By Website ID
```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1
  });
</script>
```

### Test 2: By Domain
```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'techstore.com'
  });
</script>
```

### Test 3: API Directly
```bash
curl "http://localhost:3001/api/widget/config?websiteId=1"
curl "http://localhost:3001/api/widget/config?domain=techstore.com"
```

## 🎯 Priority Order

When multiple configs are provided, priority is:

1. **Manual overrides** (highest priority)
   - `treeId`, `primaryColor`, etc. in init()
2. **API config** (medium priority)
   - From `/api/widget/config`
3. **Defaults** (lowest priority)
   - Fallback values

## ✅ Benefits

- ✅ **No manual treeId needed** - Auto-detects from website
- ✅ **Automatic theme** - Colors from skin applied automatically
- ✅ **Domain-based** - Works with real domains
- ✅ **Backward compatible** - Manual mode still works
- ✅ **Flexible** - Can override any setting manually

## 🐛 Troubleshooting

### Widget not appearing
- Check browser console for errors
- Verify website has a domain set
- Verify website has a dialog tree

### Wrong theme colors
- Check skin's `theme_config` in database
- Verify theme_config is valid JSON
- Check browser console for parsing errors

### No tree found
- Create a dialog tree for the A/B variation
- Verify A/B variation is active (`is_active = true`)
- Check API response for hints

## 📚 Example: Complete Setup

1. **Create Website with Domain:**
   ```
   POST /api/website
   {
     "customer_type_id": 1,
     "name": "My Store",
     "domain": "mystore.com"
   }
   ```

2. **Create Skin with Theme:**
   ```
   POST /api/skin
   {
     "website_id": 1,
     "name": "Brand Theme",
     "theme_config": {
       "primaryColor": "#ff6b6b",
       "backgroundColor": "#ffffff",
       "textColor": "#333333"
     }
   }
   ```

3. **Create A/B Variation:**
   ```
   POST /api/ab-variation
   {
     "skin_id": 1,
     "name": "Control",
     "is_active": true
   }
   ```

4. **Create Dialog Tree:**
   ```
   POST /api/dialog-tree
   {
     "name": "Support Flow",
     "ab_variation_id": 1
   }
   ```

5. **Embed Widget:**
   ```html
   <script src="http://localhost:3000/widget.js"></script>
   <script>
     ConversaTree.init({
       apiUrl: 'http://localhost:3001/api',
       domain: 'mystore.com'
     });
   </script>
   ```

That's it! The widget will automatically:
- Find the website by domain
- Load the skin theme
- Use the correct dialog tree
- Apply all colors automatically

