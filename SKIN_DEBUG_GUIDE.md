# 🐛 Skin Debugging Guide

## Problem: Chatbot Not Changing Theme on Website

If the debug panel works on the test page but the chatbot doesn't change on your website, here's how to debug and fix it.

## 🔍 Debugging Steps

### 1. **Check Browser Console**

Open your website with the chatbot and check the browser console (F12 → Console tab). Look for:

```
[ConversaTree] ✅ Skin config loaded from API: {...}
[ChatbotWidget] ✅ Config loaded: {...}
```

**What to check:**
- Is `skinId` being passed correctly?
- Does the API response include `skin.config.theme`?
- Are the theme colors (backgroundColor, textColor) in the response?

### 2. **Use the Debug Panel**

The debug panel should appear automatically. If not:

1. Look for the **🐛 Debug Skin** button in the bottom-left corner
2. Click it to open the debug panel
3. Check:
   - **Skin ID**: Is it correct?
   - **Theme Colors**: Are they showing? Do they match your dark theme?
   - **API Response**: Does it include `skin.config`?

### 3. **Check Network Tab**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "config"
4. Find the request: `GET /api/widget/config?skinId=X`
5. Check the response:
   - Does it have `skin.config.theme`?
   - Are the colors correct?

### 4. **Verify Database**

Check if the theme_config is saved correctly in the database:

```sql
SELECT id, name, theme_config FROM skins WHERE id = YOUR_SKIN_ID;
```

The `theme_config` should be a JSON object like:
```json
{
  "theme": {
    "primaryColor": "#3b82f6",
    "backgroundColor": "#1f2937",
    "textColor": "#f9fafb",
    "borderColor": "#374151"
  }
}
```

## 🔧 Common Issues & Fixes

### Issue 1: Widget.js Not Updated

**Problem**: The standalone `widget.js` file might be cached or not updated.

**Fix**:
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check if `widget.js` is being served from the correct location
3. Verify the file has the latest changes

### Issue 2: Theme Colors Not Applied

**Problem**: The widget loads config but doesn't apply all colors.

**Fix**: The widget.js has been updated to:
- Extract ALL theme colors (not just primaryColor)
- Apply backgroundColor to window, messages, and input
- Apply textColor to all text elements
- Apply borderColor to borders

### Issue 3: Config Not Loading

**Problem**: API call fails or returns wrong data.

**Fix**:
1. Check API URL is correct
2. Verify CORS is enabled
3. Check backend logs for errors
4. Test API directly: `curl http://localhost:3001/api/widget/config?skinId=5`

### Issue 4: Styles Not Updating

**Problem**: Widget renders before config loads.

**Fix**: The widget now:
- Re-injects styles when config loads
- Updates all DOM elements with inline styles
- Forces re-render when config changes

## 📝 Testing Checklist

- [ ] Debug panel shows correct skinId
- [ ] Debug panel shows theme colors
- [ ] API response includes `skin.config.theme`
- [ ] Browser console shows config loaded successfully
- [ ] Widget window has dark background (if dark theme)
- [ ] Text is readable (correct textColor)
- [ ] Borders use correct borderColor
- [ ] Button uses correct primaryColor

## 🚀 Quick Test

1. **Test Page**: `http://localhost:3000/skin-test?skinId=YOUR_SKIN_ID`
2. **Check Debug Panel**: Click 🐛 Debug Skin button
3. **Check Console**: Look for `[ConversaTree]` and `[ChatbotWidget]` logs
4. **Verify Appearance**: Does the widget look dark?

## 💡 What Was Fixed

1. ✅ Added debug panel component
2. ✅ Enhanced console logging
3. ✅ Updated widget.js to extract ALL theme colors
4. ✅ Updated widget.js to apply backgroundColor to all containers
5. ✅ Updated widget.js to apply textColor to all text
6. ✅ Updated widget.js to apply borderColor to borders
7. ✅ Added force style update when config loads

## 🔄 Next Steps

If it's still not working:

1. **Share Debug Info**: Copy the debug panel info (click Copy button)
2. **Share Console Logs**: Copy all `[ConversaTree]` and `[ChatbotWidget]` logs
3. **Share API Response**: Check Network tab → config request → Response
4. **Check Database**: Verify theme_config JSON structure

The debug panel will help identify exactly where the issue is!

