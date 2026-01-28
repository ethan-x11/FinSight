**Financial Report Analysis Platform**

## 1. Project Overview

**Title:** Financial Report Analysis & RAG Assistant
**Goal:** To build a web application that ingests multi-format financial documents, extracts structured data using **Azure Document Intelligence**, and enables natural language Q&A using a **RAG (Retrieval-Augmented Generation)** architecture.

### Technical Stack

* **Document Processing:** Azure Document Intelligence (Layout Model).
* **Storage:**
* **Azure Blob Storage:** Stores original PDF files.
* **Azure Cosmos DB:** Stores session metadata, chat history, and extracted insights.


* **Backend Logic:** RAG Pipeline (Embeddings, Chunking, Retrieval).

---

## 2. Feature Modules

### A. Session Management

* **New Session:** Option to start a fresh analysis workspace (clears current view).
* **Session History:** A sidebar list of past user sessions.
* **State Restoration:** Clicking a history entry restores the full context:
* The original uploaded PDF (fetched from Blob).
* The previous Chat History (fetched from Cosmos).
* The previously extracted dashboard data.



### B. Document Ingestion & Processing

* **Upload Interface:** Drag/drop or click-to-upload area.
* **Process Visualization (Simulation):** Upon upload, a progress list visually checks off backend steps to keep the user informed:
1. Triggering Azure Document Intelligence.
2. Extracting Tables (handling horizontal/top-bottom layouts).
3. Chunking Content.
4. Generating Embeddings.


* **Document Preview Panel:** A dedicated panel to render the original PDF for reference alongside the analysis.

### C. Financial Dashboard (Analysis View)

* **Layout Handling:** specific logic to handle distinct financial layouts (e.g., balance sheets, cash flow).
* **Toggle View:**
* **Key Insights:** Summarized cards and auto-extracted risks (High-level).
* **Structured Data:** Raw tables extracted from the PDF (Detail-level).



### D. RAG Chatbot (Assistant View)

* **Interface:** Modern chat UI.
* **Smart Retrieval:**
* **Contextual Answers:** Optimized for financial queries (Revenue, Net Income, Risks).
* **Citations:** Responses must include source tags (e.g., *"Source: Page 4, Table 1"*) linking back to the document.


* **Feedback Loop:**
* **Mechanism:** Thumbs Up / Thumbs Down icons on every bot response.
* **Negative Feedback:** Clicking Thumbs Down triggers a modal to collect specific user comments (e.g., *"Incorrect figure extracted"*). This data is stored for model improvement.



---

## 3. UI/UX Layout & Navigation

### Sidebar & Navigation

* **Global Navigation:** Switch between "Document Analysis" (Dashboard) and "RAG Assistant" (Chat).
* **Session List:** Scrollable history of past analyses.
* **System Status:** A visual indicator (Green/Red dot) simulating connection status to Azure Services.

### Main Workspace Layout

The workspace dynamically adjusts based on the user's selection:

| View Mode | Left Panel | Right Panel |
| --- | --- | --- |
| **Analysis Mode** | **Document Preview** (Original PDF) | **Financial Dashboard** (Insights/Tables) |
| **Chat Mode** | **Document Preview** (Original PDF) | **RAG Chatbot** (Q&A Interface) |

---

## 4. Data Flow Architecture

1. **User Input:** User uploads `Annual_Report.pdf` (New Session).
2. **Storage:** File is saved to **Azure Blob Storage**.
3. **Processing:**
* Azure Doc Intelligence analyzes layout (Tables, Headers).
* Text is chunked and embedded.


4. **Database:** Session ID, file path, and initial insights are saved to **Cosmos DB**.
5. **Interaction:**
* User asks: *"What is the net income?"*
* RAG System retrieves chunks + Generates answer with Citations.
* Chat pair (Q&A) is appended to the session document in **Cosmos DB**.


6. **Restoration:** When a user clicks a History item, the app queries **Cosmos DB** for that Session ID to populate the UI.



**Technical Schema Definition** for your Azure Cosmos DB container.

This schema is designed for a **NoSQL (Document)** approach, where a single JSON document contains the entire state of a session (Document metadata, Extracted Insights, and Chat History). This ensures fast retrieval when a user restores a session.

### **Core Database Strategy**

* **Container Name:** `UserSessions`
* **Partition Key:** `/userId` (This groups all sessions for a specific user together, making the "Session History" sidebar query highly efficient).
* **ID:** `sessionId` (Unique identifier for the specific analysis session).

---

### **JSON Document Structure**

```json
{
  "id": "sess_123456789",
  "userId": "user_alice_01",
  "type": "analysis_session",
  "version": "1.0",
  
  // 1. Session Metadata (For Sidebar History)
  "metadata": {
    "title": "Q3 Financial Report - Acme Corp",
    "createdAt": "2026-01-27T10:00:00Z",
    "lastAccessed": "2026-01-27T14:30:00Z",
    "isActive": true
  },

  // 2. Source Document (For Document Preview Panel)
  "sourceDocument": {
    "fileName": "Acme_Q3_Report.pdf",
    "fileSize": "4.5MB",
    "blobPath": "users/alice_01/sess_12345/Acme_Q3.pdf",
    "blobContainer": "financial-uploads"
  },

  // 3. Processing State (For "Simulation" Progress Bar)
  "systemStatus": {
    "overallStatus": "completed", // pending, processing, completed, failed
    "steps": {
      "docIntelligenceTriggered": true,
      "dataExtracted": true,
      "contentChunked": true,
      "embeddingsGenerated": true
    }
  },

  // 4. Financial Dashboard Data (Result of Azure Doc Int)
  "analysisOutput": {
    "keyInsights": [
      {
        "id": "ins_1",
        "category": "Revenue",
        "value": "$4.5B",
        "trend": "Up 12% YoY",
        "confidenceScore": 0.98
      },
      {
        "id": "ins_2",
        "category": "Net Income",
        "value": "$1.2B",
        "trend": "Stable",
        "confidenceScore": 0.95
      }
    ],
    "identifiedRisks": [
      {
        "severity": "High",
        "description": "Significant exposure to currency fluctuations in APAC region.",
        "sourcePage": 12
      }
    ],
    // Flexible structure for various layout formats
    "structuredTables": [
      {
        "tableId": "tbl_balance_sheet",
        "title": "Consolidated Balance Sheet",
        "pageNumber": 4,
        "layoutType": "horizontal", // Handles your layout requirement
        "dataRef": "path/to/json/table_data.json" // Offload large raw table data if needed
      }
    ]
  },

  // 5. RAG Chatbot History & Feedback
  "chatHistory": [
    {
      "messageId": "msg_001",
      "role": "user",
      "content": "What is the primary risk factor mentioned?",
      "timestamp": "2026-01-27T14:35:00Z"
    },
    {
      "messageId": "msg_002",
      "role": "assistant",
      "content": "The primary risk factor is foreign exchange volatility...",
      "timestamp": "2026-01-27T14:35:05Z",
      
      // Citations for the UI
      "citations": [
        {
          "label": "Page 12, Risk Factors",
          "snippet": "...currency fluctuations remain a high risk..."
        }
      ],
      
      // Feedback Module Data
      "userFeedback": {
        "thumbRating": "down", // "up" or "down" or null
        "comment": "This refers to last year's report, check date.",
        "submittedAt": "2026-01-27T14:36:00Z"
      }
    }
  ]
}

```

### **Schema Highlights for Your Requirements**

1. **`sourceDocument.blobPath`**: Stores the direct reference to Azure Blob Storage. When the user clicks a history entry, the frontend uses this path to fetch the PDF SAS token and render the **Document Preview Panel**.
2. **`analysisOutput.structuredTables`**: Includes a `layoutType` field. This allows your frontend to decide whether to render the table in a "top-bottom" list style or a "horizontal" matrix style, satisfying the **Various Layouts Format Analysis** requirement.
3. **`chatHistory.userFeedback`**: This object is nested directly inside the specific message. This creates a perfect dataset for future Fine-Tuning or RLHF (Reinforcement Learning from Human Feedback), as the negative comment is tightly coupled with the specific prompt and bot response.
4. **`systemStatus`**: This object persists the state of the ingestion pipeline. If a user refreshes the page mid-process, the UI can read this state and resume the "Visual Simulation" progress bar exactly where it left off.

---


### **1. Core Session Interfaces**

These interfaces define the top-level structure and metadata handling for the sidebar and session restoration.

```typescript
// Core Data Model matching Cosmos DB
export interface AnalysisSession {
  id: string; // Session ID (Partition Key candidate)
  userId: string;
  type: 'analysis_session';
  version: string;
  metadata: SessionMetadata;
  sourceDocument: SourceDocument;
  systemStatus: ProcessingStatus;
  analysisOutput: AnalysisOutput | null; // Nullable if processing isn't done
  chatHistory: ChatMessage[];
}

export interface SessionMetadata {
  title: string;       // e.g., "Q3 Financial Report - Acme Corp"
  createdAt: string;   // ISO 8601 Date String
  lastAccessed: string;
  isActive: boolean;
}

export interface SourceDocument {
  fileName: string;
  fileSize: string;    // Human readable, e.g., "4.5MB"
  blobPath: string;    // Used to fetch SAS Token
  blobContainer: string;
}

```

### **2. Processing Status (Simulation)**

This maps directly to your "Document Uploader" and "Simulation" requirements.

```typescript
export type ProcessStage = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessingStatus {
  overallStatus: ProcessStage;
  // Progress indicators for the UI visualization
  steps: {
    docIntelligenceTriggered: boolean;
    dataExtracted: boolean;
    contentChunked: boolean;
    embeddingsGenerated: boolean;
  };
  errorMessage?: string; // Optional field for error handling
}

```

### **3. Financial Dashboard (Analysis View)**

These interfaces handle the "Key Insights" and "Structured Data" toggles.

```typescript
export interface AnalysisOutput {
  keyInsights: KeyInsight[];
  identifiedRisks: RiskFactor[];
  structuredTables: FinancialTable[];
}

export interface KeyInsight {
  id: string;
  category: 'Revenue' | 'Net Income' | 'EBITDA' | 'Expenses' | string;
  value: string;         // e.g., "$4.5B"
  trend: string;         // e.g., "Up 12% YoY"
  confidenceScore: number; // 0.0 to 1.0 (For UI color coding)
}

export interface RiskFactor {
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  sourcePage: number;    // Click to jump to page in Preview Panel
}

export interface FinancialTable {
  tableId: string;
  title: string;
  pageNumber: number;
  // Critical for your "Various Layouts" requirement
  layoutType: 'horizontal' | 'top-bottom' | 'matrix'; 
  dataRef?: string;      // URL to fetch large JSON data if lazy loading
  // Optional: Inline data if the table is small enough
  rows?: Record<string, any>[]; 
}

```

### **4. RAG Chatbot & Feedback**

These interfaces manage the conversation flow and the feedback loop mechanism.

```typescript
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  messageId: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  citations?: Citation[];
  userFeedback?: FeedbackData; // Optional, only exists if user interacted
  isStreaming?: boolean;       // Frontend-only flag for UI typing effects
}

export interface Citation {
  label: string;    // e.g., "Page 4, Table 1"
  snippet: string;  // Context text for tooltip
  pageIndex: number; // For PDF viewer navigation
}

export interface FeedbackData {
  thumbRating: 'up' | 'down';
  comment?: string; // Required if rating is 'down'
  submittedAt: string;
}

```

---

### **Usage Example (React Context/State)**

Here is how you would compose these into a global state interface for your application:

```typescript
// app-state.ts

export interface AppState {
  // Navigation
  currentView: 'dashboard' | 'chat';
  isSidebarOpen: boolean;

  // Active Session Data
  activeSessionId: string | null;
  sessionData: AnalysisSession | null;
  
  // UI Loading States
  isLoadingSession: boolean;
  isUploading: boolean;
}

// Example Initial State
export const initialSessionState: AnalysisSession = {
  id: '',
  userId: 'current_user',
  type: 'analysis_session',
  version: '1.0',
  metadata: {
    title: 'Untitled Session',
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    isActive: true
  },
  sourceDocument: { fileName: '', fileSize: '', blobPath: '', blobContainer: '' },
  systemStatus: {
    overallStatus: 'pending',
    steps: {
      docIntelligenceTriggered: false,
      dataExtracted: false,
      contentChunked: false,
      embeddingsGenerated: false
    }
  },
  analysisOutput: null,
  chatHistory: []
};




class UploadResponse(BaseModel):
    blob_name: str
    blob_url: str
    indexer_run_started: bool

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3)
    top_k: int = Field(8, ge=3, le=30)

class SourceSnippet(BaseModel):
    sourcefile: str
    chunk_id: str
    heading: str
    page_range: str
    content: str

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceSnippet]



### Sample Backend Design

This is a robust, production-ready backend design using **FastAPI** with **JWT Authentication** and an **Agentic RAG** architecture. I have integrated the specific security requirements and modularized the Azure services.

### **1. High-Level Directory Structure**

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # App entry, CORS, Router inclusion
│   ├── core/                   # Security, Config, Logging
│   │   ├── config.py           # Env vars & Azure Credentials
│   │   ├── security.py         # JWT Handling, Password Hashing
│   │   └── dependencies.py     # Current User Injection
│   ├── db/                     # Database Connections
│   │   ├── cosmos.py           # Cosmos Client Singleton
│   │   └── blob.py             # Blob Client Singleton
│   ├── models/                 # Pydantic Schemas (Data Validation)
│   │   ├── user.py             # Auth models (Login, Token)
│   │   ├── session.py          # Session & Chat history
│   │   └── document.py         # File & Status models
│   ├── repositories/           # CRUD Operations (Cosmos DB)
│   │   ├── user_repo.py
│   │   └── session_repo.py
│   ├── services/               # Business Logic & Azure Integrations
│   │   ├── auth_service.py     # Login logic
│   │   ├── blob_service.py     # Azure Blob Storage
│   │   ├── doc_int_service.py  # Azure Document Intelligence
│   │   ├── search_service.py   # Azure AI Search (Indexing)
│   │   └── agent_service.py    # Agentic RAG (Foundry/OpenAI)
│   ├── routes/                 # API Controllers
│   │   ├── auth.py             # Login/Register endpoints
│   │   ├── documents.py        # Upload & Process
│   │   ├── chat.py             # RAG Chat
│   │   └── sessions.py         # History management
│   └── utils/
│       ├── chunking.py         # Text splitters
│       └── parsers.py          # Doc Intelligence output parser
└── requirements.txt

```

---

### **2. Core & Security (`app/core`)**

**`app/core/security.py`**
Handles JWT creation and password hashing (using `passlib` and `python-jose`).

```python
from datetime import datetime, timedelta
from typing import Union, Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

```

**`app/core/dependencies.py`**
Protects routes by verifying the JWT and fetching the user.

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.repositories.user_repo import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await UserRepository().get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

```

---

### **3. Database Layer (`app/db`, `app/repositories`)**

**`app/db/cosmos.py`**
Singleton connection to ensure efficient socket usage.

```python
from azure.cosmos import CosmosClient
from app.core.config import settings

class CosmosDB:
    client = CosmosClient(settings.COSMOS_ENDPOINT, settings.COSMOS_KEY)
    database = client.get_database_client(settings.COSMOS_DB_NAME)
    users_container = database.get_container_client("Users")
    sessions_container = database.get_container_client("UserSessions")

db = CosmosDB()

```

**`app/repositories/user_repo.py`**

```python
from app.db.cosmos import db
from app.models.user import UserInDB

class UserRepository:
    async def get_user_by_email(self, email: str):
        query = "SELECT * FROM c WHERE c.email = @email"
        items = list(db.users_container.query_items(
            query=query, parameters=[{"name": "@email", "value": email}], 
            enable_cross_partition_query=True
        ))
        return UserInDB(**items[0]) if items else None

    async def create_user(self, user_data: dict):
        return db.users_container.create_item(body=user_data)

```

---

### **4. Services Layer (`app/services`)**

**`app/services/agent_service.py` (The Agentic RAG)**
Orchestrates the retrieval and generation. This connects Azure AI Search with Azure Foundry/OpenAI.

```python
from openai import AzureOpenAI
from app.services.search_service import SearchService
from app.core.config import settings

class AgenticRAGService:
    def __init__(self):
        self.search_service = SearchService()
        self.client = AzureOpenAI(
            api_key=settings.OPENAI_API_KEY,
            api_version="2024-02-15-preview",
            azure_endpoint=settings.OPENAI_ENDPOINT
        )

    async def run_agent(self, session_id: str, query: str):
        # 1. Retrieve relevant chunks (Vector + Semantic Reranking)
        docs = await self.search_service.search_documents(query, filter_session=session_id)
        
        # 2. Construct System Prompt (The "Agent" persona)
        context_text = "\n\n".join([f"[Source: {d['source_page']}] {d['content']}" for d in docs])
        
        system_message = f"""
        You are a Financial Analyst Agent. 
        Use the following extracted financial data to answer the user's question.
        ALWAYS cite your sources using the [Source: Page X] format provided in the context.
        
        Context Data:
        {context_text}
        """

        # 3. Call LLM
        response = self.client.chat.completions.create(
            model=settings.OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ],
            temperature=0.2 # Low temperature for factual financial data
        )
        
        return {
            "answer": response.choices[0].message.content,
            "citations": docs # Return metadata for the UI to render citations
        }

```

**`app/services/search_service.py` (Azure AI Search)**
Handles indexing (pushing data) and retrieval.

```python
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings

class SearchService:
    def __init__(self):
        self.client = SearchClient(
            endpoint=settings.AI_SEARCH_ENDPOINT,
            index_name=settings.AI_SEARCH_INDEX,
            credential=AzureKeyCredential(settings.AI_SEARCH_KEY)
        )

    async def index_content(self, session_id: str, chunks: list):
        # Maps Python objects to Search Index Schema
        documents = []
        for chunk in chunks:
            documents.append({
                "id": f"{session_id}-{chunk['id']}",
                "content": chunk['text'],
                "session_id": session_id,
                "source_page": chunk['page_num'],
                "embedding": chunk['vector'] # If you are generating vectors in python
            })
        self.client.upload_documents(documents)

    async def search_documents(self, query: str, filter_session: str):
        # Hybrid Search (Keyword + Vector) logic
        results = self.client.search(
            search_text=query,
            filter=f"session_id eq '{filter_session}'",
            top=5
        )
        return [doc for doc in results]

```

---

### **5. Routes Layer (`app/routes`)**

**`app/routes/auth.py`**
Standard JWT Login flow.

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.services.auth_service import AuthService
from app.core.security import create_access_token
from app.models.user import Token

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await AuthService.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

```

**`app/routes/documents.py`**
Integrates Auth and Background Tasks.

```python
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from app.services.blob_service import BlobService
from app.services.doc_int_service import DocIntService
from app.repositories.session_repo import SessionRepository
from app.core.dependencies import get_current_user

router = APIRouter()

async def background_ingestion_pipeline(session_id: str, blob_url: str):
    # This function runs the "Simulation" steps
    repo = SessionRepository()
    
    # Step 1: Trigger Doc Intelligence
    await repo.update_status(session_id, "Extracting Tables")
    data = await DocIntService().process(blob_url)
    
    # Step 2: Indexing
    await repo.update_status(session_id, "Generating Embeddings")
    # ... call SearchService.index_content ...
    
    await repo.update_status(session_id, "Completed")

@router.post("/upload")
async def upload_financial_doc(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user = Depends(get_current_user)
):
    # Secure upload
    blob_url = await BlobService().upload(file, current_user.id)
    
    # Create Session
    session = await SessionRepository().create_session(current_user.id, file.filename)
    
    # Trigger Pipeline
    background_tasks.add_task(background_ingestion_pipeline, session['id'], blob_url)
    
    return session

```

### **Summary of Integrations**

1. **JWT Auth:** The `OAuth2PasswordBearer` in `routes/auth.py` and `core/dependencies.py` ensures that all `/chat` and `/upload` endpoints require a valid token.
2. **Azure Document Intelligence:** Located in `doc_int_service.py`, called asynchronously via `BackgroundTasks` to prevent API blocking.
3. **Agentic RAG:** The `agent_service.py` acts as the brain, querying `SearchService` (Azure AI Search) first, then passing grounded context to `AzureOpenAI`.
4. **Cosmos DB:** Stores user profiles (hashed passwords) and session metadata/chat history, accessed via `repositories`.


### Note
Everything that is not there like index, indexer, cosmos db locations etc should be auto created.