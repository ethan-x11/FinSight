# AI Co-Scientist FullStack

A comprehensive platform for hypothesis validation and research paper discovery powered by AI.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ with npm (frontend tooling)
- Python 3.10+ (backend runtime)
- Azure Cosmos DB account (SQL API)

### Windows helper scripts

From the repository root you can bootstrap and run both services:

1. `setup_backend.bat` – creates `.venv` and installs backend dependencies.
2. `setup_frontend.bat` – installs frontend npm modules.
3. `run_backend.bat` – starts the FastAPI server on `http://localhost:8000` with auto-reload.
4. `run_frontend.bat` – starts the Vite dev server on `http://localhost:5173`.

Stop either service with `Ctrl+C` in its terminal window.

### Manual setup (all platforms)

#### Backend

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

> macOS/Linux: replace the last two lines with `source .venv/bin/activate`.

Create `backend/.env` with your credentials (examples shown with placeholder values):

```env
COSMOS_ENDPOINT=https://<your-account>.documents.azure.com:443/
COSMOS_KEY=<your-cosmos-key>
COSMOS_DATABASE=ai-coscientist
JWT_SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=720
ADMIN_PASSWORD=admin123
SEED_MOCK_RESULTS=true
```

Additional Azure OpenAI or agent configuration variables can also live in this file when needed. When the file is ready, launch the API:

```cmd
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive docs are available at `http://localhost:8000/docs`.

#### Frontend

```cmd
cd frontend
npm install
```

Create `frontend/.env` (you can start from `.env.example`) and point the client to your backend:

```env
VITE_API_URL=http://localhost:8000/api
```

If you copy the template, rename the placeholder variable `VITE_API_BASE_URL` to `VITE_API_URL` to match the codebase expectation.

Finally, start the Vite dev server:

```cmd
npm run dev
```

The UI is served at `http://localhost:5173`.

## 📚 Documentation

- **[Backend README](../backend/README.md)** - Backend setup and API documentation

## 🔑 Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the admin password after first login!

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
