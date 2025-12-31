# Iframe Embedding Setup Guide

## ✅ What's Been Fixed

1. **Widget Page Created**: `/widget` route is now available at `http://localhost:3000/widget`
2. **CORS Updated**: Backend now allows requests from any localhost port
3. **Iframe Headers**: Next.js configured to allow iframe embedding
4. **Example HTML**: Created `WIDGET_EMBED_EXAMPLE.html` for testing

## 🚀 Quick Start

### Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Should run on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Should run on http://localhost:3000
```

### Step 2: Test the Widget Page Directly

Open in browser:
```
http://localhost:3000/widget?treeId=1
```

You should see the chatbot widget. If you see it, the page is working!

### Step 3: Embed in Your Other Project

In your other localhost project (e.g., `localhost:3002`), add this HTML:

```html
<!-- Chatbot Widget Iframe -->
<div style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; z-index: 9999;">
    <iframe 
        src="http://localhost:3000/widget?treeId=1&apiUrl=http://localhost:3001/api"
        style="width: 100%; height: 100%; border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        allow="microphone"
        title="Chatbot Widget"
    ></iframe>
</div>
```

## 🔧 Parameters

- **treeId** (required): The ID of your dialog tree
  - Example: `?treeId=1`
  - Find your tree ID in the ConversaTree admin UI

- **apiUrl** (optional): The API URL
  - Default: `http://localhost:3001/api`
  - Example: `&apiUrl=http://localhost:3001/api`

## 📝 Full Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website with Chatbot</title>
</head>
<body>
    <h1>My Website</h1>
    <p>This is my website content...</p>
    
    <!-- Embedded Chatbot -->
    <div style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; z-index: 9999;">
        <iframe 
            src="http://localhost:3000/widget?treeId=1&apiUrl=http://localhost:3001/api"
            style="width: 100%; height: 100%; border: none; border-radius: 8px;"
            allow="microphone"
        ></iframe>
    </div>
</body>
</html>
```

## 🐛 Troubleshooting

### 404 Error

**Problem**: Getting 404 when accessing `/widget`

**Solutions**:
1. Make sure frontend is running: `cd frontend && npm run dev`
2. Check the URL: Should be `http://localhost:3000/widget` (not `/widget` alone)
3. Restart the Next.js dev server after creating the widget page
4. Check browser console for errors

### CORS Error

**Problem**: "CORS policy" error in browser console

**Solutions**:
1. Make sure backend is running on port 3001
2. Check `backend/src/server.ts` - CORS should allow all localhost ports
3. The backend should have this CORS config:
   ```typescript
   app.use(cors({
     origin: function (origin, callback) {
       if (!origin) return callback(null, true);
       if (origin.match(/^http:\/\/localhost:\d+$/)) {
         return callback(null, true);
       }
       callback(null, true);
     },
     credentials: true
   }));
   ```

### Widget Not Loading

**Problem**: Iframe is blank or shows error

**Solutions**:
1. Open `http://localhost:3000/widget?treeId=1` directly in browser - does it work?
2. Check browser console for errors
3. Verify treeId exists in database
4. Check network tab - are API calls failing?

### Wrong Tree ID

**Problem**: Chatbot shows wrong conversation or no conversation

**Solutions**:
1. Find your tree ID in the ConversaTree admin UI
2. Update the `treeId` parameter in iframe URL
3. Make sure the tree has nodes with bot responses

## 🎨 Customization

### Change Widget Size

```html
<!-- Smaller widget -->
<iframe 
    src="http://localhost:3000/widget?treeId=1"
    style="width: 350px; height: 500px;"
></iframe>

<!-- Larger widget -->
<iframe 
    src="http://localhost:3000/widget?treeId=1"
    style="width: 500px; height: 700px;"
></iframe>
```

### Change Position

```html
<!-- Bottom left -->
<div style="position: fixed; bottom: 20px; left: 20px; ...">
    <iframe ...></iframe>
</div>

<!-- Top right -->
<div style="position: fixed; top: 20px; right: 20px; ...">
    <iframe ...></iframe>
</div>
```

## ✅ Checklist

Before embedding, make sure:

- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Widget page accessible: `http://localhost:3000/widget?treeId=1`
- [ ] Dialog tree exists with ID (check in admin UI)
- [ ] Dialog tree has nodes with bot responses
- [ ] CORS configured correctly
- [ ] Iframe headers configured in `next.config.js`

## 📞 Testing Steps

1. **Test widget page directly:**
   ```
   http://localhost:3000/widget?treeId=1
   ```
   Should show chatbot widget

2. **Test in iframe:**
   Open `WIDGET_EMBED_EXAMPLE.html` in browser
   Should show chatbot in bottom-right corner

3. **Test in your project:**
   Add iframe code to your project
   Should work the same way

## 🎯 Next Steps

Once it's working:
- Replace `treeId=1` with your actual tree ID
- Customize the iframe size and position
- Style it to match your website
- Test with different dialog trees

