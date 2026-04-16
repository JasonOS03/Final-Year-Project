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

    const productTokens = extractProductTokens(products); // extract the words from the product text
    const ideaTokens = extractIdeaTokens(ideas); // extract the words from the idea list text
    const matchedProductTokens = productTokens.filter(token => normalizedText.includes(token));
    const matchedIdeaTokens = ideaTokens.filter(token => normalizedText.includes(token));
    let score = 0;

    if (matchedProductTokens.length >= 2) {
        score += 5; // increase the score by 5 if there is at least two matched words from
        // the users product portfolio
    }

    if (matchedIdeaTokens.length >= 1) {
        score += 4; // increase the score by 4 if there is at least one matched word
        // from the idea list
    }

    const totalMatchedTokens = matchedProductTokens.length + matchedIdeaTokens.length;
    score += totalMatchedTokens * 2; // add the total matched *2 to the score

    if (normalizedText.length >= 35) {
        score += 2; // increase score by 2 if text length is greater than 35 characters
    }

    if (normalizedText.includes("subscription") || normalizedText.includes("pricing")) {
        score += 1; // increase the score if the recommendation contains the word subscription
    }

    if (normalizedText.includes("dashboard") || normalizedText.includes("platform")) {
        score -= 1; // decrease score if it contains the generic dashboard and platform words
    }

    return score;
}

function isGenericRecommendation(text, ideas = [], products = []) {
    // normalise the recommendation text and convert to lowercase
    const normalizedText = normalizeRecommendationText(text).toLowerCase();
    const genericPhrases = [ // create an array of generic phrases
        "ai-powered platform",
        "saas platform",
        "business management tool",
        "productivity platform",
        "marketplace for businesses"
    ];
    // reject if text is not normalised, includes the word undefined, contains generic
    // phrases or has a score of less than 6
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
        .map(part => part.trim()) // trim the whitespace
        .filter(part => /^\d+\.\s/.test(part)) // filter to only include items with a number followed by a dot
        .map(normalizeRecommendationText); // remove trailing phrases and numbering

    if (formattedRecommendations.length === 0) { // if not formatted correctly
        const fallbackRecommendation = normalizeRecommendationText(message);
        if (fallbackRecommendation) {
            formattedRecommendations = [fallbackRecommendation]; // use the fallback recommendation 
        }
    }

    return Array.from(new Set(formattedRecommendations)) // create a new set from the formatted recommendations
        .filter(text => text.length > 0)
        .filter(text => !isGenericRecommendation(text, ideas, products)) // remove generic recommendations
        .sort((a, b) => scoreRecommendation(b, ideas, products) - scoreRecommendation(a, ideas, products)) // sort from best to worst
        .slice(0, recommendationCount); // limit the number of recommendations to the count
}

async function generateRankedRecommendations({ // generate the recommendations
    ideas,
    products,
    recommendationCount,
    prompt,
    retryPrompt,
    callApi
}) {
    const firstResult = await callApi(prompt); // call the LLM API
    let bestRecommendations = parseRecommendationOutput( // parse the output
        firstResult?.response?.trim() || "",
        recommendationCount,
        ideas,
        products
    );

    if (bestRecommendations.length < recommendationCount) { // if there are not enough good recommendations
        const retryResult = await callApi(retryPrompt); // call the API again with a retry prompt
        const retryRecommendations = parseRecommendationOutput( // parse the output
            retryResult?.response?.trim() || "",
            recommendationCount,
            ideas,
            products
        );

        bestRecommendations = Array.from(new Set(bestRecommendations.concat(retryRecommendations))) // add the retried recommendations to the best recommendations and remove duplicates
            .sort((a, b) => scoreRecommendation(b, ideas, products) - scoreRecommendation(a, ideas, products)) // sort from best to worst
            .slice(0, recommendationCount);
    }

    return bestRecommendations;
}

async function getUserRecommendations(database, username, limit = 4) { // get a maximum of 4 recommendations from the database
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
            { date_inserted: "desc" } // newest to oldest
        ]
    });

    if (!query.docs || query.docs.length === 0) {
        return []; // return empty array
    }

    const seenTexts = [];
    const deduplicatedValues = query.docs.filter(doc => { // remove duplicate reccommendations
        if (seenTexts.includes(doc.recomm_text)) {
            return false;
        }

        seenTexts.push(doc.recomm_text); // push the recommendation text to the array
        return true;
    });

    const completeRecommendations = deduplicatedValues.filter(doc => { // remove empty or invalid recommendations
        return doc.recomm_text &&
            !doc.recomm_text.includes("undefined") &&
            doc.recomm_text.trim().length > 0;
    });

    return completeRecommendations.slice(0, limit); // return the recommendations
}

async function generateNewRecommendation({ // generate one new recommendation upon profile update
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

    if (replaceExisting) { // if replace existing = true
        for (const doc of existingRecommendations.docs) {
            try {
                await database.destroy(doc._id, doc._rev); // delete old recommendation
                console.log("Deleted old recommendation:", doc._id);
            } catch (err) {
                console.error("Error deleting old recommendation:", err);
            }
        }
    } else { // otherwise 
        const existingIds = existingRecommendations.docs
            .map(doc => Number(doc.id))
            .filter(id => !Number.isNaN(id));
        nextRecommendationId = existingIds.length > 0
            ? Math.max(...existingIds) + 1
            : existingRecommendations.docs.length; // if valid ID, set the next ID to max existing +1, otherwise set it as the length of the existing recommendations
    }

    const formattedRecommendations = await generateRankedRecommendations({ // generate the recommendations
        ideas,
        products,
        recommendationCount,
        prompt: apiPrompt,
        retryPrompt,
        callApi
    });

    for (let index = 0; index < formattedRecommendations.length; index++) {
        await database.insert({ // insert the formatted recommendation into the database
            username,
            api_prompt: apiPrompt,
            recomm_text: formattedRecommendations[index],
            id: replaceExisting ? index : nextRecommendationId + index, // if replace existing is true, then use 0,1,2 otherwise continue from next rec id
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
