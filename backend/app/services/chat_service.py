from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List, Optional, cast

from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.core.config import get_settings
from app.utils.azure_factory import AzureFactory
from app.utils.citation_utils import CitationUtils
from app.models.session import ChatResponse, ChatResponseRaw, ReasoningSteps


class ChatService:
    def __init__(self) -> None:
        self.azure_factory = AzureFactory()

    def generate_answer(
        self,
        question: str,
        context_docs: List[Dict[str, Any]],
        history: Optional[Iterable[Dict[str, Any]]] = None,
        model: Optional[str] = None,
    ) -> ChatResponse:
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
            '    * You must answer the user\'s question using **ONLY** the "Context Data" provided below.\n'
            "    * Do **NOT** use your internal knowledge base to answer questions about specific company financials "
            "unless that information is explicitly in the context.\n"
            '    * If the context does not contain the answer, state clearly: *"The provided documents do not contain '
            'information regarding [Topic]."* Do not guess or hallucinate figures.\n\n'
            "2.  **Citation Requirement:**\n"
            "    * Every financial figure, risk factor, or qualitative statement you output must include a citation.\n"
            "    * **Format:** Use brackets at the end of the sentence. "
            "Pattern: `[PDF Name, Page Number, Chunk Number, content_snapshot]`\n"
            '    * **Example:** `Net income rose by 12% [10-K_2023.pdf, Page 12, Chunk 3, "starting text of the chunk..."]`\n\n'
            "3.  **Response Formatting (Inside JSON):**\n"
            '    * **Financials:** Always format currency and large numbers clearly (e.g., "$4.5 billion" or "$4,500M", '
            'not "4500000000").\n'
            '    * **Tables:** If the user asks for a comparison (e.g., "Compare 2023 vs 2024 revenue"), present the data '
            "in a Markdown table.\n"
            '    * **Lists:** Use bullet points for qualitative summaries like "Risk Factors" or "Key Strategic Initiatives".\n'
            "    * **Number Format:** Numbers in brackets are treated as negative numbers.\n"
            "    * **Spacing:** Ensure proper spacing between paragraphs and table rows for readability.\n\n"
            "4.  **Tone & Style:**\n"
            "    * Professional, objective, and concise.\n"
            '    * Avoid conversational filler (e.g., "Here is what I found"). Go straight to the data.\n'
            "    * When discussing risks, use neutral language.\n\n"
            "### **Thinking Process & Output Format**\n"
            "You must document your thinking steps before formulating the final answer. "
            "Your output must be a **strictly valid JSON object** containing exactly two keys:\n\n"
            "**1. `reasoning`** (List of Objects):\n"
            "Document your logical steps to derive the answer. Each step must have:\n"
            '   * `"title"`: A short title for the reasoning step (e.g., "Context Verification", "Data Extraction", "Calculation").\n'
            '   * `"description"`: A detailed description of what you analyzed in this step.\n\n'
            "**2. `answer`** (String):\n"
            "Answer should be formatted in Markdown, including all required citations as specified above.\n\n"
            "The final response to the user in **JSON** format, adhering to all strict citation and formatting rules mentioned above.\n\n"
            "**Example JSON Structure:**\n"
            "```json\n"
            "{\n"
            '  "reasoningSteps": [\n'
            "    {\n"
            '      "title": "Context Verification",\n'
            '      "description": "Checked provided chunks for Q3 revenue figures. Found data in Chunk 2 and Chunk 5."\n'
            "    },\n"
            "    {\n"
            '      "title": "Data Normalization",\n'
            '      "description": "Converted 4,500 million mentioned in text to $4.5B for clarity."\n'
            "    }\n"
            "  ],\n"
            '  "answer": "**Revenue Analysis**\\n\\nRevenue for Q3 was **$4.5B**, an increase of 12% YoY [10-K.pdf, Page 4, Chunk 2, \\"Revenue increased by...\\"]..."\n'
            "}\n"
            "```\n\n"
            "### **Context Data (Retrieval-Augmented Generation)**\n"
            "The following snippets have been retrieved from the uploaded financial documents:\n\n"
            "{{CONTEXT_DATA}}\n\n"
            "**FINAL REMINDER:** Output ONLY the JSON object. Do not add any text before or after the JSON."
            "**STRICT:** Do not use MARKDOWN or any other formatting outside the JSON. Do not add ````json` tags."
        )

        user_content = f"Context:\n{context_str}\n\nQuestion: {question}"

        response = self.azure_factory.run_chat(
            user_message=user_content,
            system_message=system_prompt,
            history=history,
            response_format=ChatResponseRaw,
            model=model,
        )
        
        model_from_response = response.get("model", "")
        
        response = (
            json.loads(response.get("response", "{}"))
            if response
            else {"reasoningSteps": [], "answer": "No answer generated."}
        )
        
        answer = response.get("answer", "")
        
        print("Raw response from Azure OpenAI:", response) #debug

        reasoningSteps = [
            ReasoningSteps.model_validate(step)
            for step in response.get("reasoningSteps", [])
            if isinstance(step, dict)
        ]

        citations = [
            {
                "sourcefile": doc.get("sourcefile"),
                "chunk_id": doc.get("chunkId"),
                "heading": None,
                "page_range": doc.get("pageRange"),
                "document_url": doc.get("documentUrl"),
                "content": doc.get("content"),
                "pointer_url": CitationUtils.build_citation_url(
                    doc.get("documentUrl"),
                    (
                        int(
                            str(doc.get("documentPageNumber") or "")
                            .strip()
                            .split("-", 1)[0]
                        )
                        if str(doc.get("documentPageNumber") or "")
                        else None
                    ),
                    None,
                ),
                "document_page_number": doc.get("documentPageNumber"),
            }
            for doc in context_docs
        ]
        
        linked_citations = CitationUtils.build_linked_citations(answer or "", citations)
        # print("Linked Citations:", linked_citations)
        answer_with_links = CitationUtils.replace_citation_snapshots(
            answer or "", linked_citations
        )
        # print("Answer with Links:", answer_with_links)
        
        # with open("debug_citations.json", "w", encoding="utf-8") as f:
        #     json.dump(citations, f, ensure_ascii=False, indent=4)
        # with open("debug_linked_citations.json", "w", encoding="utf-8") as f:
        #     json.dump(linked_citations, f, ensure_ascii=False, indent=4)
        # with open("debug_answer.txt", "w", encoding="utf-8") as f:
        #     f.write(answer or "")
        # with open("debug_answer_with_links.txt", "w", encoding="utf-8") as f:
        #     f.write(answer_with_links)

        result = {
            "answer": answer_with_links,
            "model": model_from_response,
            "reasoningSteps": reasoningSteps,
            "citations": citations,
            "linkedCitations": linked_citations,
        }

        return ChatResponse.model_validate(result)
