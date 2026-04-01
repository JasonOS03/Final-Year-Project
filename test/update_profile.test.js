process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /update_profile policy for replaced recommendations

test("/update_profile regenerates one new recommendation on idea/product change", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Test1234!";

    // Mock call_api for fast response
    app.call_apiMock = async (prompt) => ({ response: "1. Updated subscription idea\n2. Updated chatbot idea\n3. Updated analytics idea" });

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });
    await request(app).post("/idea_details").send({ username, ideas: ["Temp idea"] });
    await request(app).post("/product_details").send({ username, products: [{ name: "Temp" }] });
    await request(app).post("/generate_recommendations").send({ username, ideas: ["Temp idea"], products: [{ name: "Temp" }] });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const before = await agent.get("/retrieve-recommendations");
    const beforeCount = before.body.output.length;

    const updateRes = await agent.post("/update_profile").send({ ideas: ["New idea"], products: [{ name: "Temp" }], competitors: [] });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);

    const after = await agent.get("/retrieve-recommendations");
    assert.equal(after.status, 200);
    assert.ok(after.body.output.length >= 1);
    assert.notStrictEqual(after.body.output[0], before.body.output[0], "Top recommendation should change after updated profile content");
});

test("/update_profile handles invalid input gracefully", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Test1234!";

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });
    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const res = await agent.post("/update_profile").send({ ideas: "not-array", products: "not-array", competitors: "bad" });
    assert.equal(res.status, 400);
});
