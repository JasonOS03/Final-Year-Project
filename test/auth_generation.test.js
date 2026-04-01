process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: login, registration, generation and list.

test("/register_details creates a user successfully", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const res = await request(app)
        .post("/register_details")
        .send({ username, password: "Password123!", email: `${username}@example.com` });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
});

test("/user_login authenticates valid user and rejects invalid", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";
    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });

    const valid = await request(app).post("/user_login").send({ username, password });
    assert.equal(valid.status, 200);
    assert.equal(valid.body.success, true);

    const invalid = await request(app).post("/user_login").send({ username, password: "bad" });
    assert.equal(invalid.status, 200);
    assert.equal(invalid.body.success, false);
});

test("/generate_recommendations returns an array of suggestions", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const ideas = ["Healthcare SaaS", "AI Chatbot"];
    const products = [{ name: "Analytics" }, { name: "Dashboard" }];

    // Mock call_api for fast response
    app.call_apiMock = async (prompt) => ({ response: "1. Subscription-based platform for healthcare saas with analytics dashboard\n2. AI-powered tool for subscription and ai chatbot\n3. Analytics dashboard for healthcare saas and ai chatbot" });

    await request(app).post("/register_details").send({ username, password: "Password123!", email: `${username}@example.com` });

    const res = await request(app)
        .post("/generate_recommendations")
        .send({ username, ideas, products });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.output));
    assert.ok(res.body.output.length > 0);
});

test("/retrieve_full_summary works for a generated rec when cached or new", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";
    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });
    await request(app).post("/idea_details").send({ username, ideas: ["subscription"] });
    await request(app).post("/product_details").send({ username, products: [{ name: "analytics" }] });
    await request(app).post("/generate_recommendations").send({ username, ideas: ["subscription"], products: [{ name: "analytics" }] });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const retrieveRes = await agent.get("/retrieve-recommendations");
    assert.equal(retrieveRes.status, 200);
    assert.ok(Array.isArray(retrieveRes.body.output));
    const recText = retrieveRes.body.output[0];

    // Mock call_api for full summary
    app.call_apiMock = async (prompt) => ({ response: "1. Expanded Idea: This is a detailed SaaS idea with subscription model.\nMarket Conditions: Growing market.\nPotential Cost: $10/month.\nSize of Potential Market: 1M users.\nUniqueness of Product Idea: Unique features.\nOverall Risk Grading: Medium\nSources: https://example1.com https://example2.com" });

    const fullRes = await agent.post("/retrieve_full_summary").send({ id: 0, summary: recText });
    assert.equal(fullRes.status, 200);
    assert.ok(fullRes.body.output && typeof fullRes.body.output === "string");
});

test("/get_competitor_data returns competitor info with login session", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";
    const ideas = ["Education SaaS"];
    const products = [{ name: "Learning Platform" }];
    const competitors = ["CompetitorOne", "CompetitorTwo"];

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });
    await request(app).post("/idea_details").send({ username, ideas });
    await request(app).post("/product_details").send({ username, products });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    // Mock call_api for competitor data
    app.call_apiMock = async (prompt) => ({ response: '{"competitors": [{"competitor_name": "MockComp1", "market_position": "leader", "source": "mock", "products": [{"product_name": "MockProd", "product_price": "$10", "market_share": "10%", "items_sold": "1000", "categories": ["SaaS"]}]}]}' });

    const dataRes = await agent.post("/get_competitor_data").send({ competitors, ideas, products });
    assert.equal(dataRes.status, 200);
    assert.ok(dataRes.body.competitor_data);
});
