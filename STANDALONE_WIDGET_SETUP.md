# Standalone Widget Setup Guide

## 🎉 No Iframe Needed!

The standalone widget is a pure JavaScript solution that embeds directly into your website - no iframe required!

## ✅ Advantages Over Iframe

- ✅ **No iframe restrictions** - Fully integrated with your page
- ✅ **Better performance** - No extra frame overhead
- ✅ **Easier styling** - Can be customized to match your site
- ✅ **Better UX** - No frame boundaries or scrolling issues
- ✅ **Simpler setup** - Just add a script tag

## 🚀 Quick Start

### Step 1: Make sure your servers are running

**Backend:**
```bash
cd backend
npm run dev
# Running on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

### Step 2: Embed in your website

Add this code to your HTML (before closing `</body>` tag):

```html
<!-- Load the widget script -->
<script src="http://localhost:3000/widget.js"></script>

<!-- Initialize the widget -->
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    treeId: 1,
    position: 'bottom-right',
    primaryColor: '#6366f1',
    title: 'Chat Assistant'
  });
</script>
```

That's it! The chatbot will appear in the bottom-right corner.

## 📝 Configuration Options

```javascript
ConversaTree.init({
  // Required
  apiUrl: 'http://localhost:3001/api',  // Your backend API URL
  treeId: 1,                             // Your dialog tree ID
  
  // Optional
  position: 'bottom-right',              // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  primaryColor: '#6366f1',                // Button and accent color
  backgroundColor: '#ffffff',             // Widget background
  textColor: '#1f2937',                   // Text color
  title: 'Chat Assistant'                 // Chat window title
});
```

## 🎨 Customization Examples

### Change Position

```javascript
ConversaTree.init({
  apiUrl: 'http://localhost:3001/api',
  treeId: 1,
  position: 'bottom-left'  // or 'top-right', 'top-left'
});
```

### Custom Colors

```javascript
ConversaTree.init({
  apiUrl: 'http://localhost:3001/api',
  treeId: 1,
  primaryColor: '#10b981',    // Green
  backgroundColor: '#f9fafb', // Light gray
  textColor: '#111827'         // Dark gray
});
```

### Match Your Brand

```javascript
ConversaTree.init({
  apiUrl: 'http://localhost:3001/api',
  treeId: 1,
  primaryColor: '#your-brand-color',
  title: 'Your Company Support'
});
```

## 🔧 Alternative: Auto-Initialize with Data Attributes

You can also use data attributes for auto-initialization:

```html
<script 
  src="http://localhost:3000/widget.js"
  data-conversatree
  data-api-url="http://localhost:3001/api"
  data-tree-id="1"
  data-position="bottom-right"
  data-primary-color="#6366f1"
  data-title="Chat Assistant"
></script>
```

No additional JavaScript needed - it initializes automatically!

## 📦 Production Setup

### Option 1: Serve from your frontend

The widget file is at `frontend/public/widget.js` and is automatically served by Next.js.

**Development:**
```
http://localhost:3000/widget.js
```

**Production:**
```
https://your-domain.com/widget.js
```

### Option 2: Copy to your CDN

1. Copy `frontend/public/widget.js` to your CDN
2. Update the script src to point to your CDN:

```html
<script src="https://cdn.yourdomain.com/widget.js"></script>
```

### Option 3: Bundle with your site

1. Copy `frontend/public/widget.js` to your project
2. Include it in your build process
3. Reference it locally:

```html
<script src="/js/widget.js"></script>
```

## 🌐 CORS Configuration

Make sure your backend allows requests from your website's domain:

**Development (backend/src/server.ts):**
```typescript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow all localhost ports for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    // In production, whitelist your domain
    if (origin === 'https://yourdomain.com') {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));
```

## 📱 Full Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is my website content...</p>
    
    <!-- Chatbot Widget -->
    <script src="http://localhost:3000/widget.js"></script>
    <script>
        ConversaTree.init({
            apiUrl: 'http://localhost:3001/api',
            treeId: 1,
            position: 'bottom-right',
            primaryColor: '#6366f1',
            title: 'Need Help?'
        });
    </script>
</body>
</html>
```

## 🔍 Testing

1. **Test the widget file directly:**
   ```
   http://localhost:3000/widget.js
   ```
   Should load JavaScript (not HTML)

2. **Test in your website:**
   - Add the script tags
   - Open your website
   - Look for chat button in bottom-right
   - Click to open chat
   - Send a message

3. **Check browser console:**
   - Open DevTools (F12)
   - Check for any errors
   - Verify API calls are working

## 🐛 Troubleshooting

### Widget not appearing

**Check:**
- Is frontend running on port 3000?
- Can you access `http://localhost:3000/widget.js`?
- Check browser console for errors
- Make sure script tag is before closing `</body>`

### CORS errors

**Check:**
- Is backend running on port 3001?
- Is CORS configured correctly?
- Check network tab for failed requests

### No response from chatbot

**Check:**
- Is treeId correct? (find it in admin UI)
- Does the tree have nodes with bot responses?
- Check browser console for API errors
- Verify backend is receiving requests

### Styling issues

**Check:**
- Widget styles are injected automatically
- If conflicts, check z-index (widget uses 9999)
- Custom colors should be valid hex codes

## 🎯 Next Steps

1. **Replace treeId** with your actual dialog tree ID
2. **Customize colors** to match your brand
3. **Test thoroughly** with different dialog trees
4. **Deploy to production** when ready

## 📚 API Reference

The widget automatically handles:
- Session management
- Message sending/receiving
- Quick replies
- Loading states
- Error handling

All communication happens via:
```
POST /api/chat/message
```

## ✅ Checklist

Before going live:
- [ ] Widget file accessible at `/widget.js`
- [ ] Backend CORS configured for your domain
- [ ] treeId is correct
- [ ] Dialog tree has nodes
- [ ] Tested in your website
- [ ] Custom colors match your brand
- [ ] Error handling works

## 🚀 Production Checklist

- [ ] Update API URL to production backend
- [ ] Update widget.js URL to production domain
- [ ] Configure CORS for production domain
- [ ] Test on production environment
- [ ] Monitor for errors
- [ ] Set up analytics (optional)

