process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

function uniqueUser(prefix = "int") {
    const id = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    return {
        username: id,
        password: "Password123!",
        email: `${id}@example.com`
    };
}

test("Core integration: register, login, update profile, generate + retrieve recommendations", async () => {
    const user = uniqueUser("core");

    // 1. register
    const regRes = await request(app)
        .post("/register_details")
        .send(user);

    assert.equal(regRes.status, 200);

    // 2. login
    const agent = request.agent(app);
    const loginRes = await agent
        .post("/user_login")
        .send({ username: user.username, password: user.password });

    assert.equal(loginRes.status, 200);

    // 3. update profile (no competitors → avoids conflict path)
    const updateRes = await agent
        .post("/update_profile")
        .send({
            ideas: ["AI SaaS"],
            products: ["Dashboard"],
            competitors: []
        });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);

    // 4. generate recommendations
    const genRes = await agent
        .post("/generate_recommendations")
        .send({
            username: user.username,
            ideas: ["AI SaaS"],
            products: ["Dashboard"]
        });

    assert.equal(genRes.status, 200);

    // 5. retrieve recommendations
    const recsRes = await agent.get("/retrieve-recommendations");

    assert.equal(recsRes.status, 200);
    assert.ok(Array.isArray(recsRes.body.output) || typeof recsRes.body.output === "string");
});
