process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /retrieve-recommendations and max-4 selection logic

test("/retrieve-recommendations returns empty when not logged in", async () => {
    const response = await request(app).get("/retrieve-recommendations");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.output, []);
});

test("/retrieve-recommendations returns latest <=4 recs after login", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Test1234!";

    // Mock call_api to return fast response
    app.call_apiMock = async (prompt) => ({ response: "1. SaaS idea for A1 and P1\n2. AI chatbot for A2\n3. Analytics platform for P1" });

    // establish new user account and session
    await request(app)
        .post("/register_details")
        .send({ username, password, email: `${username}@example.com` });

    await request(app)
        .post("/idea_details")
        .send({ username, ideas: ["A1", "A2"] });

    await request(app)
        .post("/product_details")
        .send({ username, products: [{ name: "P1" }] });

    await request(app)
        .post("/generate_recommendations")
        .send({ username, ideas: ["A1", "A2"], products: [{ name: "P1" }] });

    const agent = request.agent(app);
    const loginRes = await agent.post("/user_login").send({ username, password });
    assert.equal(loginRes.body.success, true);

    const recRes = await agent.get("/retrieve-recommendations");
    assert.equal(recRes.status, 200);
    assert.ok(Array.isArray(recRes.body.output));
    assert.ok(recRes.body.output.length <= 4);
});
