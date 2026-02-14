import json
from typing import Any, List, Optional
from app.utils.azure_factory import AzureFactory
from app.models.session import AlteredField, Insight, KeyInsight, RuleSet

class RuleSetGenerator:
    def __init__(self):
        self.azure_factory = AzureFactory()

    def generate_rule_set(
        self,
        original_data: dict[str,Any],
        altered_data: dict[str,Any],
        rule_sets: Optional[List[RuleSet]] = None,
    ) -> RuleSet:
        ruleset_generator_prompt = (
            "### **Role & Persona**\n"
            "You are an expert **AI Calibration & System Ruleset Generator**. Your purpose is to analyze user "
            "corrections made to extracted financial data (Key Insights) and synthesize generalized, reusable rules. "
            "These rules will be fed back into the financial extraction LLM to improve its future accuracy.\n\n"

            "### **Core Instructions**\n"
            "1.  **Analyze the Alteration:**\n"
            "    * Carefully review the `alteredFields` and `alterationReasoning` provided in the data payload.\n"
            "    * Understand *why* the user changed the data. Did the AI include the wrong metric? Did it format it incorrectly? "
            "Did it pull from the wrong accounting standard (e.g., GAAP vs. Non-GAAP)?\n\n"

            "2.  **Formulate a Generalized Rule:**\n"
            "    * Abstract the specific correction into a universal instruction. Do **not** make the rule specific to the "
            "company, year, or exact value mentioned in the insight.\n"
            "    * **Bad Rule:** \"Set Apple's 2023 revenue to $383B instead of $380B.\"\n"
            "    * **Good Rule:** \"When extracting Annual Revenue, always use 'Net Sales' figures from the Consolidated Statement "
            "of Operations rather than preliminary summary tables.\"\n\n"

            "3.  **Review Existing Rulesets:**\n"
            "    * If \"Existing Rulesets\" are provided in the prompt, review them to ensure you are not creating an exact duplicate.\n"
            "    * If an existing rule partially covers the issue, generate a new rule that specifically addresses the nuanced gap "
            "revealed by the user's correction.\n\n"

            "4.  **Drafting the Output:**\n"
            "    * **`name`**: Create a short, highly descriptive, and punchy title for the rule (max 5-7 words).\n"
            "    * **`description`**: Write a clear, command-oriented directive that another AI can easily follow during data extraction.\n\n"

            "### **Output Format**\n"
            "Your output must be a **strictly valid JSON object** representing a single `RuleSet`. It must contain exactly these two keys:\n\n"
            "   * `\"name\"`: (str) The identifier/title for the rule.\n"
            "   * `\"description\"`: (str) The generalized system instruction.\n\n"

            "**Example JSON Structure:**\n"
            "```json\n"
            "{\n"
            "  \"name\": \"Non-GAAP EBITDA Standardization\",\n"
            "  \"description\": \"Always exclude stock-based compensation and one-time restructuring charges when calculating or extracting Non-GAAP EBITDA, unless the prompt explicitly requests GAAP figures.\"\n"
            "}\n"
            "```\n\n"

            "**FINAL REMINDER:** Output ONLY the JSON object. Do not add any conversational text before or after the JSON. "
            "**STRICT:** Do not use MARKDOWN outside the JSON. Do not add ````json` tags around your final output."
        )
        
        data = f"Original Data: {original_data}\nAltered Data: {altered_data}"
        print("Generating rule set for Key Insight:", data)
        prompt = f"Data: {data}"
        
        if rule_sets:
            prompt += "\n\n### **nExisting Rulesets:**\n"
            for rule in rule_sets:
                prompt += f"- **{rule.name}**: {rule.description}\n"

        response = self.azure_factory.run_chat(
            user_message=prompt,
            system_message=ruleset_generator_prompt,
            response_format=RuleSet,
        )
        
        return RuleSet.model_validate(json.loads(response.get("response", "{}")))


if __name__ == "__main__":
    # Example usage
    generator = RuleSetGenerator()
