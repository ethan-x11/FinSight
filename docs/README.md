# FinSight FullStack

A comprehensive platform for financial document analysis.

## 🚀 Quick Start

# FinSight setup and run

## Prereqs
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- Azure service credentials in .env (see "Environment" below)

## Environment
Create a .env file at the repo root (same folder as package.json) with required values:

- COSMOS_ENDPOINT
- COSMOS_KEY
- COSMOS_DATABASE
- AZURE_STORAGE_CONNECTION_STRING
- BLOB_CONTAINER_NAME
- AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
- AZURE_DOCUMENT_INTELLIGENCE_KEY
- AZURE_DOCUMENT_INTELLIGENCE_API_VERSION
- AZURE_SEARCH_ENDPOINT
- AZURE_SEARCH_ADMIN_KEY
- AZURE_SEARCH_INDEX_NAME
- AZURE_SEARCH_INDEXER_NAME
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_VERSION
- AZURE_OPENAI_CHAT_DEPLOYMENT_NAME
- AZURE_OPENAI_TEXT_DEPLOYMENT_NAME
- AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME
- AZURE_OPENAI_EMBED_DIMS
- AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME
- AZURE_AI_AGENT_ENDPOINT
- AZURE_AI_AGENT_SUBSCRIPTION_ID
- AZURE_AI_AGENT_RESOURCE_GROUP_NAME
- AZURE_AI_AGENT_PROJECT_NAME
- JWT_SECRET_KEY
- ADMIN_USER_ID
- ADMIN_NAME
- ADMIN_EMAIL
- ADMIN_PASSWORD

## Setup

### Backend
1) Install Azure CLI:
   - Windows: ```winget install --exact --id Microsoft.AzureCLI```
2) Run setup:
   - Windows: ```az login```
   - Windows: ```setup_backend```
      - (alternative) ```run setup_backend.bat```
3) (Optional) Create/activate your venv and install manually:
   - ```python -m venv backend/.venv```
   - ```backend/.venv/Scripts/activate```
   - ```pip install -r backend/requirements.txt```

### Frontend
1) Run setup:
   - Windows: ```setup_frontend``` 
      - (alternative) ```run setup_frontend.bat```
2) (Optional) Install manually:
   - ```cd frontend```
   - ```npm install```

## Run

### Backend
- Windows: ```run_backend``` 
   - (alternatively) ```run run_backend.bat```
- Manual:
  - ```cd backend```
  - ```uvicorn app.main:app --host 0.0.0.0 --port 8000```

### Frontend
- Windows: ```run_frontend```
   -  (alternatively) ```run run_frontend.bat```
- Manual:
  - ```cd frontend```
  - ```npm run dev```

## Notes
- Frontend expects backend at http://localhost:8000/api unless overridden by VITE_API_URL / VITE_API_BASE_URL.
- Use Azure CLI login for local Azure AI Agent access if production flag is false.


## 🏗️ Architecture

### Frontend (React + TypeScript)
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui components
- API client (`dataHandlerAPI.ts`)

### Backend (FastAPI + Python)
- FastAPI for REST API
- Azure Cosmos DB for data storage
- JWT authentication with bcrypt
- Auto-initialization of database and admin user

## 📁 Project Structure

```
.
├── backend/                 # FastAPI backend
│   ├── app/                 # Application package
│   ├── requirements.txt     # Python dependencies
│   ├── startup.sh           # Convenience launcher for Unix shells
│   └── README.md            # Backend-specific documentation
├── frontend/                # React + Vite frontend
│   ├── src/                 # React components and utilities
│   ├── package.json         # Frontend dependencies
│   └── .env.example         # Frontend environment template
├── docs/                    # Project guides and API docs
│   └── README.md            # (You are here)
├── setup_backend.bat        # Backend dependency installer (Windows)
├── setup_frontend.bat       # Frontend dependency installer (Windows)
├── run_backend.bat          # Backend dev server launcher (Windows)
└── run_frontend.bat         # Frontend dev server launcher (Windows)
```

## 🔧 Features

- ✅ User authentication and authorization
- ✅ Session management
- ✅ Feedback collection
- ✅ Admin dashboard
- ✅ Statistics and analytics
- ✅ Multi-provider AI model support

## 🌐 API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - Login
- `POST /api/change-password` - Change password
- `POST /api/forgot-password` - Request password reset

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/{id}` - Get user by ID
- `PATCH /api/users/{id}` - Update user profile



## 🔒 Security

- Passwords hashed with bcrypt
- JWT token-based authentication
- 24-hour token expiration
- Role-based access control
- Protected API endpoints

## 📊 Database

Azure Cosmos DB containers:
- **users** - User accounts
- **sessions** - Research sessions
- **feedback** - User feedback
- **providers** - AI providers
- **models** - AI models

Containers are automatically created on first run.

## 🧪 Testing

Visit the interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🚢 Deployment

### Backend
1. Set production `SECRET_KEY` in environment
2. Configure production Cosmos DB
3. Enable HTTPS
4. Deploy to Azure App Service or similar

### Frontend
1. Update API base URL for production
2. Build: `npm run build`
3. Deploy to static hosting (Vercel, Netlify, Azure Static Web Apps)

## 🆘 Support

For issues or questions:
1. Check the documentation in `backend/README.md`
2. Check API docs at `/docs` endpoint
3. Review browser console and backend logs

Happy researching! 🔬🧪
