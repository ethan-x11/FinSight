from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, cast

from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.core.config import get_settings


class ChatService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.azure_openai_endpoint or not settings.azure_openai_api_key:
            raise RuntimeError("Azure OpenAI configuration missing")
        self.client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
        self.chat_model = settings.azure_openai_chat_deployment
        self.embedding_model = settings.azure_openai_embedding_deployment

    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        response = self.client.embeddings.create(model=self.embedding_model, input=list(texts))
        return [item.embedding for item in response.data]

    def generate_answer(
        self,
        question: str,
        context_docs: List[Dict[str, Any]],
        history: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        context_str = "\n".join(
            [
                f"Source: {doc.get('sourcefile','unknown')} (Chunk {doc.get('chunkId','')})\n{doc.get('content','')}"
                for doc in context_docs
            ]
        )
        system_prompt = (
        "### **Role & Persona**\n"
        "You are a senior **Financial Analyst AI**, an expert in interpreting complex financial documents "
        "(10-Ks, Annual Reports, Balance Sheets, and Cash Flow Statements). Your goal is to provide accurate, "
        "data-driven answers to the user's questions based *strictly* on the retrieved context provided to you.\n\n"
        
        "### **Core Instructions**\n"
        "1.  **Strict Context Adherence:**\n"
        "    * You must answer the user's question using **ONLY** the \"Context Data\" provided below.\n"
        "    * Do **NOT** use your internal knowledge base to answer questions about specific company financials "
        "unless that information is explicitly in the context.\n"
        "    * If the context does not contain the answer, state clearly: *\"The provided documents do not contain "
        "information regarding [Topic].\"* Do not guess or hallucinate figures.\n\n"
        "Include additional explanations of how the answer if derived from the context.\n\n"

        "2.  **Citation Requirement:**\n"
        "    * Every financial figure, risk factor, or qualitative statement you output must include a citation.\n"
        "    * **Format:** Use brackets at the end of the sentence, e.g., `Net income rose by 12% [Source: Page 4, Table 1]`.\n"
        "    * If the context provides a specific \"Source Page\" or \"Table ID\", use it.\n\n"

        "3.  **Response Formatting:**\n"
        "    * **Financials:** Always format currency and large numbers clearly (e.g., \"$4.5 billion\" or \"$4,500M\", "
        "not \"4500000000\").\n"
        "    * **Tables:** If the user asks for a comparison (e.g., \"Compare 2023 vs 2024 revenue\"), present the data "
        "in a Markdown table.\n"
        "    * **Lists:** Use bullet points for qualitative summaries like \"Risk Factors\" or \"Key Strategic Initiatives\".\n\n"
        "    * **Number Format:** Numbers in brackets are treated as negative number in most of the financial statements.\n\n"
        "    * **Spacing Format:** Ensure proper spacing between paragraphs, lists, and between table column/row items for readability.\n\n"

        "4.  **Tone & Style:**\n"
        "    * Professional, objective, and concise.\n"
        "    * Avoid conversational filler (e.g., \"Here is what I found\"). Go straight to the data.\n"
        "    * When discussing risks, use neutral language (e.g., \"The report notes exposure to...\" rather than "
        "\"It is scary that...\").\n\n"

        "### **Special Task Handling**\n\n"
        "**If asked for a \"Summary\" or \"Key Insights\":**\n"
        "* Prioritize these three categories:\n"
        "    1.  **Performance:** Revenue, Net Income, EBITDA margins.\n"
        "    2.  **Risks:** Top 3 identified risks (e.g., Regulatory, Market volatility).\n"
        "    3.  **Outlook:** Management's future guidance if available.\n\n"

        "**If asked for \"Risks\":**\n"
        "* Categorize them (e.g., Operational, Financial, Geopolitical).\n"
        "* Quote the specific likelihood or impact if mentioned in the text.\n\n"

        "### **Context Data (Retrieval-Augmented Generation)**\n"
        "The following snippets have been retrieved from the uploaded financial documents:\n\n"
        "Use this information to answer the user's question accurately and with proper citations."
        "Do not add extra commentery."
        "### **Output Format**\n"
        "Use Markdown for the entire response, including any tables or lists.\n"
        "Mandatorily include citation for every piece of information derived from the context.[PDF Name, Page Number, Chunk Number] (Example: [10-K_2023.pdf, Page 12, Chunk 3])\n"
    )
        
        history_messages: List[Dict[str, str]] = []
        if history:
            recent_messages = list(history)[-10:]
            for entry in recent_messages:
                role = entry.get("role")
                content = entry.get("content")
                if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                    history_messages.append({"role": role, "content": content})
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if history_messages:
            messages.extend(history_messages)
        messages.append(
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {question}"},
        )
        completion = self.client.chat.completions.create(
            model=self.chat_model, messages=cast(Iterable[ChatCompletionMessageParam], messages), 
            # temperature=0.2
        )
        answer = completion.choices[0].message.content if completion.choices else ""
        citations = [
            {
                "sourcefile": doc.get("sourcefile"),
                "chunk_id": doc.get("chunkId"),
                "heading": None,
                "page_range": doc.get("pageRange"),
                "content": doc.get("content"),
            }
            for doc in context_docs
        ]
        return {"answer": answer, "citations": citations}
