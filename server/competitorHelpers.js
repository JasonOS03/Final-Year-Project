async function parseCompetitorData(competitorData) {
    try {
        if (!competitorData || !competitorData.response) {
            console.warn("Invalid competitor data response:", competitorData);
            return { competitors: [] };
        }

        const trimmedResponse = competitorData.response.trim().match(/{[\s\S]*}/)?.[0] || "{}";
        const parsedResponse = JSON.parse(trimmedResponse);

        if (!parsedResponse.competitors || !Array.isArray(parsedResponse.competitors)) {
            console.warn("Invalid competitors array in response:", parsedResponse);
            return { competitors: [] };
        }

        parsedResponse.competitors = parsedResponse.competitors.map(competitor => ({
            competitor_name: competitor.competitor_name || competitor.competitor || "",
            market_position: (competitor.market_position || competitor.market_pos || "").toLowerCase(),
            source: competitor.source || "",
            products: (competitor.products || []).map(product => ({
                product_name: product.product_name || "",
                product_price: product.product_price || product.price_range || "",
                market_share: product.market_share || "",
                items_sold: product.items_sold || "",
                categories: product.categories || []
            }))
        }));

        return parsedResponse;
    } catch (err) {
        console.error("Error parsing competitor data:", err);
        return { competitors: [] };
    }
}

function formatCompetitorData(competitors = []) {
    if (!Array.isArray(competitors) || competitors.length === 0) {
        return [];
    }

    return competitors.map((competitor, index) => {
        const product = competitor.products?.[0] || {};

        return {
            competitor_number: index + 1,
            competitor_name: competitor.competitor_name || "",
            market_position: competitor.market_position || "",
            product: {
                product_name: product.product_name || "",
                product_price: product.product_price || "",
                market_share: product.market_share || "",
                items_sold: product.items_sold || "",
                categories: Array.isArray(product.categories) ? product.categories : []
            }
        };
    });
}

async function getOrGenerateAccordionInsight({
    database,
    username,
    product,
    buildInsightsPrompt,
    callApi
}) {
    const insightsQuery = await database.find({
        selector: {
            username,
            product,
            insights: { "$exists": true }
        },
        fields: [
            "insights"
        ]
    });

    if (insightsQuery.docs.length >= 1) {
        return insightsQuery.docs[0].insights;
    }

    const insightsPrompt = buildInsightsPrompt(product);
    const insightsData = await callApi(insightsPrompt);
    const responseData = insightsData.response;

    await database.insert({
        username,
        prompt: insightsPrompt,
        product,
        insights: responseData
    });

    return responseData;
}

async function generateCompetitorData({
    username,
    products,
    ideas,
    competitors,
    summaries,
    buildCompetitorPrompt,
    callApi
}) {
    try {
        const competitorDataPrompt = buildCompetitorPrompt(summaries, competitors, ideas, products);
        const competitorData = await callApi(competitorDataPrompt);
        return await parseCompetitorData(competitorData);
    } catch (err) {
        console.log("error generating competitor data", err);
        throw err;
    }
}

module.exports = {
    parseCompetitorData,
    formatCompetitorData,
    getOrGenerateAccordionInsight,
    generateCompetitorData
};
