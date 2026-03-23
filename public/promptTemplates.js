function serializeUserInput(ideas = [], products = []) {
  return JSON.stringify({
    ideas,
    products
  });
}

function buildRecommendationsPrompt(ideas, products, recommendationCount) {
  return `Use only this user input to generate exactly ${recommendationCount} SaaS ideas.
User input: ${serializeUserInput(ideas, products)}
Each idea must clearly reflect the user's submitted ideas and at least one portfolio signal such as industry, pricing, subscriptions, or customer type. Keep them specific and avoid generic SaaS ideas.
Rules:
1. No intro or extra text
2. Exactly ${recommendationCount} unique ideas
3. No markdown
4. One numbered line per idea
5. Start at 1 and continue in order`;
}

function buildRecommendationsRetryPrompt(ideas, products, recommendationCount) {
  return `Rewrite the result. Use only this user input and make the ideas more concrete and more specific.
User input: ${serializeUserInput(ideas, products)}
Every idea must mention a clear SaaS use case grounded in the user's submitted ideas and portfolio signals. Reject generic platforms, vague assistants, or broad marketplaces.
Rules:
1. Exactly ${recommendationCount} unique ideas
2. Numbered lines only
3. No markdown
4. No extra text
5. Start at 1 and continue in order`;
}

function buildFullSummaryPrompt(summary) {
  return `Expand this SaaS product/service idea.

Product/service Idea:
${summary}

Output EXACTLY:
1. Expanded Idea: <text>
Market Conditions: <text>
Potential Cost: <text>
Size of Potential Market: <text>
Uniqueness of Product Idea: <text>
Overall Risk Grading: <low/medium/high>
Sources: https://example1.com https://example2.com

RULES:
- Do NOT add any text before "1." or after the final "Sources:" line.
- Do NOT use markdown formatting.
- "Overall Risk Grading" must be low, medium or high.
- Sources MUST contain at least 2 real, reputable URLs related to the product idea or market
- Always include valid sources.
- Sources must be on a single line separated by spaces
- Do NOT change the heading names.
- Do NOT add blank lines anywhere.`;
}

function buildInsightsPrompt(product) {
  return `Based on this SaaS product information:
${product}

Output exactly:
Strengths: <text>
Weaknesses: <text>
Sources: https://example1.com https://example2.com

Rules:
- Sources must be on the same line and include at least 2 real URLs
- Use real sources related to the product
- No text before or after these lines
- No markdown`;
}

function buildCompetitorPrompt(theSummaries, competitors, ideas, products) {
  return `
Return only valid JSON in this structure:
{
  "competitors": [
    {
      "competitor_name": "string",
      "market_position": "string",
      "source": "string",
      "products": [
        {
          "product_name": "string",
          "product_price": "string",
          "market_share": "string",
          "items_sold": "string",
          "categories": ["string"]
        }
      ]
    }
  ]
}

Based on:
LLM recommendation summary: ${theSummaries.join("\n")}
user entered competitors (optional): ${JSON.stringify(competitors || [])}
user ideas: ${JSON.stringify(ideas || [])}
user products: ${JSON.stringify(products || [])}

Rules:
1. Competitors must be real SaaS companies
2. Return 3-5 competitors
3. Return exactly one SaaS product for each competitor
4. Market share must be a percentage
5. No text outside the JSON
6. Categories must match the user's selected product categories
7. Source must be one link
8. If user entered competitors are provided, use them for better relevance; otherwise infer competitors from the user's ideas and products`;
}

module.exports = {
  buildRecommendationsPrompt,
  buildRecommendationsRetryPrompt,
  buildFullSummaryPrompt,
  buildInsightsPrompt,
  buildCompetitorPrompt
};
