# Final Widget Usage - Domain-Based

## ✅ Correct Usage

Since **domain will always be provided**, use this:

```html
<script src="http://localhost:3000/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'techstore.com'  // ✅ Always provided
  });
</script>
```

## 🔄 Selection Logic (Automatic)

When you provide `domain`, the system automatically:

1. **Finds Website** by domain
2. **Selects Active Skin** for that website (`is_active = true`, or first created)
3. **Selects Active Variation** for that skin (`is_active = true`, or first created)
4. **Selects Dialog Tree** for that variation (first created)
5. **Merges Configs** (base skin + variation overrides)

## 🎨 Change Colors

Just update the database:

```sql
UPDATE skins 
SET theme_config = jsonb_set(
  theme_config,
  '{theme,primaryColor}',
  '"#10b981"'
)
WHERE id = 12;
```

Then **hard refresh** (`Cmd+Shift+R` or `Ctrl+Shift+R`) and the widget will automatically:
- ✅ Load new color from database
- ✅ Apply to button, header, send button, quick replies
- ✅ No manual JavaScript needed

## 🔍 Debug

Check what's selected:

```bash
curl "http://localhost:3001/api/widget/config?domain=techstore.com" | jq
```

Look for:
- `websiteId` - Which website
- `skin.id` - Which skin
- `variation.id` - Which variation
- `treeId` - Which tree
- `skin.config.theme.primaryColor` - Current color

## 📋 Console Logs

When widget loads, you should see:

```
📥 Loading widget config... { domain: "techstore.com" }
🌐 Looking up website by domain: techstore.com
✅ Widget config loaded from API: { websiteId: 26, treeId: 18, skinId: 12, ... }
✅ Using full skin config from database
   Primary color: #3b82f6
   Position: bottom-right
   Title: Chat Assistant
✅ Config loaded, initializing widget...
💅 Injecting styles with color: #3b82f6
✅ Widget initialized and added to page
✅ Button rendered with color: #3b82f6
```

## ⚠️ If Colors Don't Update

1. **Check API returns new color:**
   ```bash
   curl "http://localhost:3001/api/widget/config?domain=techstore.com" | jq '.skin.config.theme.primaryColor'
   ```

2. **Hard refresh browser:**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

3. **Check console logs** - should show the new color

4. **Use cache-busting** if needed:
   ```html
   <script>
     const script = document.createElement('script');
     script.src = `http://localhost:3000/widget.js?t=${Date.now()}`;
     document.head.appendChild(script);
     script.onload = () => {
       ConversaTree.init({
         apiUrl: 'http://localhost:3001/api',
         domain: 'techstore.com'
       });
     };
   </script>
   ```

## ✅ Summary

- **Always use `domain`** in script
- **System automatically selects:** Website → Skin → Variation → Tree
- **Update database** → **Refresh page** → **Colors update automatically**
- **No manual JavaScript needed** for color updates

The widget is now fully data-driven and domain-based!

