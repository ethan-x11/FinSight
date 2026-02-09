# Visual Walkthrough Notes: FinSight Financial Report Analysis System

## 1. Title Slide & Introduction
*   **Slide Concept:** Clean title screen with the project name "FinSight".
*   **Speaker Notes:**
    *   "Welcome to the visual walkthrough of **FinSight**, a comprehensive financial report analysis system."
    *   "This application leverages the power of Azure AI to transform static financial PDF documents into interactive, queryable insights."
    *   "We will walk through the core architecture, the data ingestion pipeline, and the interactive analysis capabilities."

## 2. High-Level Architecture
*   **Visual Elements:** A flowchart showing the flow from User -> Frontend -> Backend -> Azure Services.
    *   **Frontend:** React/Vite Dashboard.
    *   **Backend:** Python API (FastAPI).
    *   **Data Store:** Azure Cosmos DB (Sessions/Metadata), Azure Blob Storage (Raw Files).
    *   **AI/Processing:** Azure AI Document Intelligence, Azure AI Search, Azure OpenAI.
*   **Speaker Notes:**
    *   "The system is built on a modern stack."
    *   "The **Frontend** allows users to manage sessions and visualize data."
    *   "The **Backend** orchestrates the workflow."
    *   "We use **Azure Cosmos DB** for storing session history and **Blob Storage** for the actual documents."
    *   "The core intelligence comes from **Document Intelligence** for extraction, **Azure AI Search** for retrieval, and **Azure OpenAI** for generation."

## 3. The User Journey: Ingestion Pipeline
*   **Visual Elements:**
    1.  User clicks "Upload" on Dashboard.
    2.  Animation of file moving to **Blob Storage**.
    3.  Icon representing **Document Intelligence** scanning the file.
    4.  Icon representing processing (Chunking & Embedding).
    5.  Data moving into **Azure AI Search Index**.
*   **Step-by-Step Walkthrough:**
    1.  **Upload:** "The user creates a session and uploads a financial report (e.g., a 10-K)."
    2.  **Storage:** "The raw PDF is securely stored in Azure Blob Storage."
    3.  **Extraction:** "Azure Document Intelligence analyzes the document layout, extracting text, tables, and headers with high fidelity."
    4.  **Indexing:** "The extracted text is 'chunked' into semantic pieces. These chunks are generated into vector embeddings and stored in Azure AI Search."
    5.  **Ready State:** "Once indexed, the document is ready for real-time analysis."

## 4. The User Journey: Interactive Analysis & RAG
*   **Visual Elements:**
    1.  Chat interface with a user question (e.g., "What is the revenue growth?").
    2.  Arrow points to **Search Service** (Retrieving context).
    3.  Top K relevant chunks appear.
    4.  Arrow points to **Azure OpenAI** (LLM).
    5.  LLM generates a response with **Citations**.
*   **Speaker Notes:**
    *   "This is the Retrieval-Augmented Generation (RAG) flow."
    *   "When a user asks a question, we don't just send it to ChatGPT."
    *   "First, we query **Azure AI Search** to find the specific paragraphs in the Annual Report that mention revenue."
    *   "We package pertinent chunks along with the user's question and send them to the **Azure OpenAI model**."
    *   "The model acts as a financial analyst, synthesizing the answer strictly from the provided context."

## 5. Key Features Highlight
*   **Visual Elements:** Screenshots of the UI features.
    *   **Session Management:** List of past reports.
    *   **Citations:** Highlighting source text when clicking a citation.
    *   **Insights:** Pre-generated analysis (Risk Factors, Key Financials).
*   **Speaker Notes:**
    *   "Beyond simple chat, the system proactively generates insights."
    *   "It identifies **Risk Factors** and summarizes **Key Financials** immediately after ingestion."
    *   "Every claim in the chat response is backed by **citations**, allowing the user to verify facts against the original source text."

## 6. Technical Deep Dive (Optional)
*   **Visual Elements:** Code snippets or component names.
    *   `IngestionService`: Orchestrates the PDF-to-Index pipeline.
    *   `ChatService`: Manages context window and prompt engineering.
    *   `CosmosDB`: Validates efficient extensive metadata storage.
*   **Speaker Notes:**
    *   "Under the hood, `IngestionService` handles the complex async coordination of document cracking."
    *   "The `ChatService` ensures the LLM stays grounded by enforcing strict system prompts preventing hallucinations."

## 7. Future Roadmap & Conclusion
*   **Visual Elements:** Icons for "Multi-modal support", "Graph Analysis", "Export to Excel".
*   **Speaker Notes:**
    *   "FinSight provides a robust foundation for automated financial research."
    *   "Future updates will include comparing multiple documents simultaneously and deeper table analysis."
    *   "Thank you for watching."


## Presentation Dialogs
Financial Report Analysis & RAG Assistant: A web application that ingests multi-format financial documents, extracts structured data using Azure Document Intelligence, indexed using Azure AI Search and enables natural language Q&A using a RAG (Retrieval-Augmented Generation) architecture.

Upload: "The user creates a session and uploads a financial report (e.g., a 10-K)."
Storage: "The raw PDF is securely stored in Azure Blob Storage."
Extraction: "Azure Document Intelligence analyzes the document layout, extracting text, tables, and headers with high fidelity."
Indexing: "The extracted text is 'chunked' into semantic pieces. These chunks are generated into vector embeddings and stored in Azure AI Search."
Ready State: "Once indexed, the document is ready for real-time analysis."

This is the Retrieval-Augmented Generation (RAG) flow."
User asks: "What is the total profit and loss for fy 24 and 25"

"When a user asks a question, we don't just send it to gpt."
"First, we query Azure AI Search to find the specific chunks of the document."
"We package pertinent chunks along with the user's question and send them to the Azure OpenAI model."
"The model acts as a financial analyst, synthesizing the answer strictly from the provided context."
Chat Agent with RAG System retrieves chunks and Generates answer with Citations.
User can ask related question regarding the previous answer also and the Agent will answer them with proper context.
User asks: provide this data for both consolidated and standalone version.

Chat Agent refer to the previous conversation and related context to answer the question.


"Beyond simple chat, the system proactively generates insights."
"It identifies Risk Factors and summarizes Key Financials immediately after ingestion."
"Every claim in the chat response is backed by citations, allowing the user to verify facts against the original source text."
