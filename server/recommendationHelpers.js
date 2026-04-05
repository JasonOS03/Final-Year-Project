function normalizeRecommendationText(text) {
    return String(text || "")
        .replace(/^\d+\.\s*/, "")
        .split(/\s+based on this portfolio:/i)[0]
        .split(/\s+and these ideas:/i)[0]
        .trim();
}

function extractIdeaTokens(ideas) {
    const ideasArray = Array.isArray(ideas) ? ideas : [];
    return ideasArray
        .flatMap(idea => String(idea).split(/\W+/))
        .map(token => token.toLowerCase())
        .filter(token => token.length > 3);
}

function extractProductTokens(products) {
    const productsArray = Array.isArray(products) ? products : [];
    return productsArray
        .flatMap(product => String(product).split(/\W+/))
        .map(token => token.toLowerCase())
        .filter(token => token.length > 3);
}

function scoreRecommendation(text, ideas = [], products = []) {
    const normalizedText = normalizeRecommendationText(text).toLowerCase();
    if (!normalizedText) {
        return -100;
    }

    const productTokens = extractProductTokens(products);
    const ideaTokens = extractIdeaTokens(ideas);
    const matchedProductTokens = productTokens.filter(token => normalizedText.includes(token));
    const matchedIdeaTokens = ideaTokens.filter(token => normalizedText.includes(token));
    let score = 0;

    if (matchedProductTokens.length >= 2) {
        score += 5;
    }

    if (matchedIdeaTokens.length >= 1) {
        score += 4;
    }

    const totalMatchedTokens = matchedProductTokens.length + matchedIdeaTokens.length;
    score += totalMatchedTokens * 2;

    if (normalizedText.length >= 35) {
        score += 2;
    }

    if (normalizedText.includes("subscription") || normalizedText.includes("pricing")) {
        score += 1;
    }

    if (normalizedText.includes("dashboard") || normalizedText.includes("platform")) {
        score -= 1;
    }

    return score;
}

function isGenericRecommendation(text, ideas = [], products = []) {
    const normalizedText = normalizeRecommendationText(text).toLowerCase();
    const genericPhrases = [
        "ai-powered platform",
        "saas platform",
        "business management tool",
        "productivity platform",
        "marketplace for businesses"
    ];

    return (
        !normalizedText ||
        normalizedText.includes("undefined") ||
        genericPhrases.some(phrase => normalizedText.includes(phrase)) ||
        scoreRecommendation(normalizedText, ideas, products) < 6
    );
}

function parseRecommendationOutput(message, recommendationCount, ideas, products) {
    const regex = /\n\s*(?=\d+\.\s)/;
    const splitRecommendations = String(message || "").split(regex);
    let formattedRecommendations = splitRecommendations
        .map(part => part.trim())
        .filter(part => /^\d+\.\s/.test(part))
        .map(normalizeRecommendationText);

    if (formattedRecommendations.length === 0) {
        const fallbackRecommendation = normalizeRecommendationText(message);
        if (fallbackRecommendation) {
            formattedRecommendations = [fallbackRecommendation];
        }
    }

    return Array.from(new Set(formattedRecommendations))
        .filter(text => text.length > 0)
        .filter(text => !isGenericRecommendation(text, ideas, products))
        .sort((a, b) => scoreRecommendation(b, ideas, products) - scoreRecommendation(a, ideas, products))
        .slice(0, recommendationCount);
}

async function generateRankedRecommendations({
    ideas,
    products,
    recommendationCount,
    prompt,
    retryPrompt,
    callApi
}) {
    const firstResult = await callApi(prompt);
    let bestRecommendations = parseRecommendationOutput(
        firstResult?.response?.trim() || "",
        recommendationCount,
        ideas,
        products
    );

    if (bestRecommendations.length < recommendationCount) {
        const retryResult = await callApi(retryPrompt);
        const retryRecommendations = parseRecommendationOutput(
            retryResult?.response?.trim() || "",
            recommendationCount,
            ideas,
            products
        );

        bestRecommendations = Array.from(new Set(bestRecommendations.concat(retryRecommendations)))
            .sort((a, b) => scoreRecommendation(b, ideas, products) - scoreRecommendation(a, ideas, products))
            .slice(0, recommendationCount);
    }

    return bestRecommendations;
}

async function getUserRecommendations(database, username, limit = 4) {
    const query = await database.find({
        selector: {
            date_inserted: { $exists: true },
            api_prompt: { "$exists": true },
            username
        },
        fields: [
            "_id",
            "_rev",
            "recomm_text",
            "date_inserted",
            "id"
        ],
        sort: [
            { date_inserted: "desc" }
        ]
    });

    if (!query.docs || query.docs.length === 0) {
        return [];
    }

    const seenTexts = [];
    const deduplicatedValues = query.docs.filter(doc => {
        if (seenTexts.includes(doc.recomm_text)) {
            return false;
        }

        seenTexts.push(doc.recomm_text);
        return true;
    });

    const completeRecommendations = deduplicatedValues.filter(doc => {
        return doc.recomm_text &&
            !doc.recomm_text.includes("undefined") &&
            doc.recomm_text.trim().length > 0;
    });

    return completeRecommendations.slice(0, limit);
}

async function generateNewRecommendation({
    database,
    username,
    products,
    ideas,
    recommendationCount = 1,
    replaceExisting = true,
    buildRecommendationsPrompt,
    buildRecommendationsRetryPrompt,
    callApi
}) {
    const apiPrompt = buildRecommendationsPrompt(ideas, products, recommendationCount);
    const retryPrompt = buildRecommendationsRetryPrompt(ideas, products, recommendationCount);

    let nextRecommendationId = 0;
    const existingRecommendations = await database.find({
        selector: {
            username,
            recomm_text: { $exists: true }
        },
        fields: ["_id", "_rev", "id"]
    });

    if (replaceExisting) {
        for (const doc of existingRecommendations.docs) {
            try {
                await database.destroy(doc._id, doc._rev);
                console.log("Deleted old recommendation:", doc._id);
            } catch (err) {
                console.error("Error deleting old recommendation:", err);
            }
        }
    } else {
        const existingIds = existingRecommendations.docs
            .map(doc => Number(doc.id))
            .filter(id => !Number.isNaN(id));
        nextRecommendationId = existingIds.length > 0
            ? Math.max(...existingIds) + 1
            : existingRecommendations.docs.length;
    }

    const formattedRecommendations = await generateRankedRecommendations({
        ideas,
        products,
        recommendationCount,
        prompt: apiPrompt,
        retryPrompt,
        callApi
    });

    for (let index = 0; index < formattedRecommendations.length; index++) {
        await database.insert({
            username,
            api_prompt: apiPrompt,
            recomm_text: formattedRecommendations[index],
            id: replaceExisting ? index : nextRecommendationId + index,
            date_inserted: new Date().toISOString()
        });
    }

    console.log("Inserted document:", { username, api_prompt: apiPrompt, formatted_recomm: formattedRecommendations });

    if (formattedRecommendations.length === 0) {
        console.log("content is empty");
        return undefined;
    }

    return formattedRecommendations;
}

module.exports = {
    normalizeRecommendationText,
    extractIdeaTokens,
    extractProductTokens,
    scoreRecommendation,
    isGenericRecommendation,
    parseRecommendationOutput,
    generateRankedRecommendations,
    getUserRecommendations,
    generateNewRecommendation
};
