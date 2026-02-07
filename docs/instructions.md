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
1) Run setup:
   - Windows: ```setup_backend```
      - (alternative) ```run setup_backend.bat```
2) (Optional) Create/activate your venv and install manually:
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
