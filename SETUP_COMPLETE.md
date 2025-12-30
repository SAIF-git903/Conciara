# ✅ Project Setup Complete!

Both servers are now running and ready to use.

## 🚀 Access Your Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📝 Important Notes

### Database Setup Required

Before you can fully use the application, you need to:

1. **Set up PostgreSQL with pgvector extension**
   ```bash
   # Install pgvector extension in your PostgreSQL database
   # Then update the DATABASE_URL in backend/.env
   ```

2. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

3. **Configure OpenAI API Key** (for vector embeddings)
   - Update `OPENAI_API_KEY` in `backend/.env`
   - Or the app will work without embeddings (just won't generate vectors)

### Current Status

✅ Backend server running on port 3001  
✅ Frontend server running on port 3000  
✅ Dependencies installed  
✅ Environment files created  

### Quick Start

1. Open http://localhost:3000 in your browser
2. The UI is ready to use!
3. Note: You'll need to set up the database first to actually save data

### To Stop Servers

Press `Ctrl+C` in the terminal where the servers are running, or:
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000,3001 | xargs kill
```

### To Restart Servers

```bash
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

## 🎨 Features Available in UI

- Create, edit, and delete dialog trees
- Edit preprompts for each tree
- Create hierarchical dialog nodes
- Visualize dialog trees
- All CRUD operations work through the UI

Enjoy using your Dialog Tree Manager! 🎉

