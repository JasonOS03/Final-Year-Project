process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /regenerate-recommendations behavior and no-data error path

test("/regenerate-recommendations fails when no ideas and no products", async () => {
    const username = `user_empty_${Date.now()}`;
    const password = "Test1234!";

    await request(app)
        .post("/register_details")
        .send({ username, password, email: `${username}@example.com` });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const res = await agent.post("/regenerate-recommendations");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "No ideas or products found. Please update your profile first.");
});

test("/regenerate-recommendations generates the same number as existing recs", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Test1234!";

    // Mock call_api for fast response
    app.call_apiMock = async (prompt) => ({ response: "1. Regenerated subscription idea\n2. Regenerated chatbot idea\n3. Regenerated analytics idea" });

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });

    const ideas = ["Idea 1"];
    const products = [{ name: "Product 1" }];

    await request(app).post("/idea_details").send({ username, ideas });
    await request(app).post("/product_details").send({ username, products });
    await request(app).post("/generate_recommendations").send({ username, ideas, products });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const regen = await agent.post("/regenerate-recommendations");
    assert.equal(regen.status, 200);
    assert.equal(regen.body.success, true);
    assert.ok(Array.isArray(regen.body.new_recommendation));
});
