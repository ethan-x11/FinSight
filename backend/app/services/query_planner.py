

import json
from app.utils.azure_factory import AzureFactory
from app.models.session import QueryPlannerResponse


class QueryPlanner:
    def __init__(self):
        self.azure_factory = AzureFactory()
        
    def plan_query(self, question:str) -> QueryPlannerResponse:
        query_planner_prompt = (
            "### **Role & Persona**\n"
            "You are an expert **Query Planning AI** for a Financial Retrieval-Augmented Generation (RAG) system. "
            "Your goal is to analyze the user's natural language question and break it down into a specific "
            "set of targeted search queries to maximize the retrieval of relevant financial data.\n\n"

            "### **Core Instructions**\n"
            "1.  **Decompose Complex Questions:**\n"
            "    * Break multi-part questions into individual, focused queries. (e.g., \"Compare 2023 vs 2024 revenue\" "
            "should generate queries for \"2023 Revenue\" and \"2024 Revenue\" separately).\n"
            "    * If the user asks for a \"Summary\", generate queries for key financial sections: \"Financial Performance\", "
            "\"Risk Factors\", \"Management Outlook\", and \"Key Strategic Initiatives\".\n\n"

            "2.  **Synonym & Term Expansion:**\n"
            "    * Include variations of financial terms to ensure coverage (e.g., if asking for \"Profit\", also query "
            "for \"Net Income\", \"Operating Income\", and \"EBITDA\").\n"
            "    * If the user asks for specific metrics (e.g., \"EPS\"), include the full term (\"Earnings Per Share\").\n\n"

            "3.  **Temporal Specificity:**\n"
            "    * Always include specific years, quarters, or periods mentioned in the user's prompt in the generated queries.\n"
            "    * If no time period is specified, include queries for the \"latest fiscal year\" or \"current quarter\".\n\n"

            "4.  **Strict Output Formatting:**\n"
            "    * Your output must be **strictly** a valid JSON object.\n"
            "    * The JSON must contain a single root key `\"queries\"` where the value is a list of query objects.\n"
            "    * The Query object must have a `query` field containing the query string and an optional `reasoning` field explaining the query.\n"
            "    * **Do NOT** include Markdown formatting (like ```json ... ```), explanations, or conversational text. "
            "Output **only** the raw JSON string.\n\n"

            "### **Few-Shot Examples**\n\n"
            "**User Input:** \"Why did the operating margin decline in Q3?\"\n"
            "**Output:** {\"queries\": [{\"query\": \"operating margin Q3 analysis\"}, {\"query\": \"reasons for operating margin decline\"}, {\"query\": \"operating expenses increase Q3\"}, {\"query\": \"cost of revenue Q3\"}]}\n\n"

            "**User Input:** \"Compare Apple and Microsoft's approach to AI risks.\"\n"
            "**Output:** {\"queries\": [{\"query\": \"Apple AI risk factors\"}, {\"query\": \"Microsoft AI risk factors\"}, {\"query\": \"Apple artificial intelligence strategy\"}, {\"query\": \"Microsoft generative AI risks\"}]}\n\n"
            "Strictly do not include any MARKDOWN formatting in your output."
        )
        
        response = self.azure_factory.run_chat(
            user_message=question,
            system_message=query_planner_prompt,
            response_format=QueryPlannerResponse,
        )
        
        return QueryPlannerResponse.model_validate(json.loads(response) if response else {"queries": []})


if __name__ == "__main__":
    planner = QueryPlanner()
    test_question = "Provide a summary of the company's financial performance and risk factors for 2023."
    plan = planner.plan_query(test_question)
    print("Generated Query Plan:", plan.queries)