# API Documentation

The ConversaTree backend API is fully documented using Swagger/OpenAPI 3.0.

## Accessing the API Documentation

Once the server is running, you can access the interactive API documentation at:

**http://localhost:3001/api-docs**

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive API testing (try out endpoints directly from the browser)
- Request/response schema definitions
- Authentication support (JWT Bearer tokens)

## Features

### Authentication
Most endpoints require authentication using JWT Bearer tokens. To authenticate:

1. Use the `/api/auth/login` endpoint to get a token
2. Click the "Authorize" button in Swagger UI
3. Enter your token in the format: `Bearer <your-token>`
4. All authenticated requests will now include the token

### API Endpoints

The API is organized into the following categories:

- **Authentication** - Login, logout, token refresh, password management
- **Users** - User management (admin only)
- **Dialog Trees** - Dialog tree CRUD operations
- **Dialog Nodes** - Dialog node management
- **Chat** - Chat message processing and conversation history
- **Widget** - Widget configuration and validation
- **Skins** - Skin/theming management
- **Websites** - Website management
- **Customer Types** - Customer type management
- **A/B Variations** - A/B testing variations
- **Preprompts** - Preprompt management
- **Conversations** - Conversation history
- **Media** - Media upload endpoints
- **API Keys** - API key management
- **Trace** - Tracing and debugging
- **Health** - Health check endpoints

## Development

The Swagger documentation is automatically generated from JSDoc comments in the route files. To add or update documentation:

1. Add `@swagger` JSDoc comments to your route handlers
2. Follow the OpenAPI 3.0 specification format
3. Reference schemas defined in `src/config/swagger.ts`

## Example Usage

### Testing an Endpoint

1. Navigate to http://localhost:3001/api-docs
2. Find the endpoint you want to test (e.g., `/api/auth/login`)
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute"
6. View the response

### Using the API Programmatically

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use the token
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer <your-token>"
```

## Schema Definitions

Common schemas are defined in `src/config/swagger.ts`:
- `User` - User object with websites
- `DialogTree` - Dialog tree structure
- `DialogNode` - Dialog node structure
- `ChatMessage` - Chat message request
- `ChatResponse` - Chat response
- `LoginRequest` - Login credentials
- `LoginResponse` - Login response with tokens

## Production

In production, you may want to:
- Restrict access to `/api-docs` endpoint
- Update the server URL in the Swagger config
- Add rate limiting information to the documentation
- Include API versioning
