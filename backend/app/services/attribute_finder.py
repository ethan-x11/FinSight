import json
from typing import List, Optional
from app.utils.azure_factory import AzureFactory
from app.models.session import Insight, SessionRuleSet
from app.services.chat_service import ChatService
from app.services.query_planner import QueryPlanner
from app.services.search_service import SearchService


class AttributeFinder:
    def __init__(self):
        self.azure_factory = AzureFactory()
        self.chat_service = ChatService()
        self.search_service = SearchService()
        self.query_planner = QueryPlanner()

    def find_attribute(
        self,
        name: str,
        description: str,
        index_name: str,
        rule_sets: Optional[List[SessionRuleSet]] = None,
    ) -> Insight:
        insight_finder_prompt = (
            "### **Role & Persona**\n"
            "You are a specialized **Financial Insight Extractor**. Your goal is to analyze financial text "
            "and extract specific data points into a structured JSON format based on the user's specific request.\n\n"
            "### **Target Insight Task**\n"
            "You must focus your analysis to find data specifically matching the following requirement:\n"
            "1. **Insight Name:** {{NAME}}\n"
            "2. **Insight Description:** {{DESCRIPTION}}\n\n"
            "If the Context Data does not contain information relevant to this specific insight, return an empty list `[]`.\n\n"
            "### **Core Instructions**\n"
            "1.  **Strict Context Adherence:**\n"
            '    * Extract data using **ONLY** the "Context Data" provided below.\n'
            '    * If the Context Data does not contain information relevant to this specific insight, set "Not Found".\n'
            "    * Do **NOT** use internal knowledge. If the specific metric requested is not found, do not invent it.\n\n"
            "2.  **Citation Requirement:**\n"
            "    * Every extracted insight must include a citation strictly adhering to the format.\n"
            "    * **Pattern:** `[PDF Name, Page Number, Chunk Number, content_snapshot]`\n"
            '    * **Example:** `[10-K_2023.pdf, Page 12, Chunk 3, "Net income rose by..."]`\n\n'
            "3.  **Data Formatting:**\n"
            '    * **Category:** Use the provided "Insight Name" (`{{NAME}}`) as the category.\n'
            '    * **Value:** Use the exact value from the context data along with used format(e.g. "$4.5B").\n'
            '    * **Trend:** Capture direction and magnitude (e.g., "+12% YoY", "-50 bps", "Stable"). If no trend is stated, use "N/A".\n\n'
            "4.  **Memory & Conversation History:**\n"
            "    * **Contextual Awareness:** Refer to conversation history to understand specific nuances if the description is vague.\n\n"
            "5.  **Ruleset Priority:**\n"
            "    * If a specific **Ruleset** is provided, you must prioritize and strictly adhere to those rules above all others.\n\n"
            "{{RULESETS}}\n\n"
            "### **Output Format**\n"
            "Your output must be a **strictly valid JSON list** of objects. Each object represents an `Insight` and must contain exactly these four keys:\n\n"
            '   * `"category"`: (str) The specific financial metric or topic (Should match `{{NAME}}`).\n'
            '   * `"value"`: (str) The extracted figure or key status.\n'
            '   * `"trend"`: (str) The associated change or movement.\n'
            '   * `"citation"`: (str) The strict source reference.\n\n'
            "**Example JSON Structure:**\n"
            "```json\n"
            "[\n"
            "  {\n"
            '    "category": "{{NAME}}",\n'
            '    "value": "$4.5B",\n'
            '    "trend": "+12% YoY",\n'
            '    "citation": "[10-K.pdf, Page 4, Chunk 2, \\"Revenue increased by...\\"]"\n'
            "  }\n"
            "]\n"
            "```\n\n"
            "### **Context Data (Retrieval-Augmented Generation)**\n"
            "The following snippets have been retrieved from the uploaded financial documents:\n\n"
            "{{CONTEXT_DATA}}\n\n"
            "**FINAL REMINDER:** Output ONLY the raw JSON list. Do not add Markdown formatting (like ```json) or conversational text."
            "Strictly do not include any MARKDOWN formatting in your output."
        )

        prompt = "name: " + name + ",description: " + description

        query_plan = self.query_planner.plan_query(prompt)

        queries = [queryObj.query for queryObj in query_plan.queries]

        results = self.search_service.search_single_batch(index_name, queries, top=8)

        context_str = "\n".join(
            [
                f"Source: {doc.get('sourcefile','unknown')} (Chunk {doc.get('chunkId','')})\n{doc.get('content','')}"
                for doc in results
            ]
        )

        user_content = f"Context:\n{context_str}\n\nQuestion: {prompt}"
        
        if rule_sets:
            user_content += "\n\n### **Rulesets:**\n"
            for rule in rule_sets:
                user_content += f"- **{rule.name}**: {rule.description}\n"

        response = self.azure_factory.run_chat(
            user_message=user_content,
            system_message=insight_finder_prompt,
            response_format=Insight,
        )

        return Insight.model_validate(
            json.loads(response.get("response", "")) if response else {"queries": []}
        )


if __name__ == "__main__":
    planner = AttributeFinder()
    indexname = (
        "financials-chunks71ead0afe5ac4c628cdd23d28de0f15dannual-report-2024-2025-pdf"
    )
    insight = planner.find_attribute(
        name="Revenue",
        description="Extract the total revenue figure for the most recent fiscal year, along with any stated growth trend compared to the prior year.",
        index_name=indexname,
    )
    print("Extracted Insight:", insight)
