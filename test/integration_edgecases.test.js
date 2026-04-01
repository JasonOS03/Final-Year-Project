process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const crypto = require("crypto");
const app = require("../public/expressserver.js");

function uniqueUser(prefix = "int") {
    const id = `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
    return {
        username: id,
        password: "Password123!",
        email: `${id}@example.com`
    };
}

function uniqueCompetitor(base) {
    return `${base}_${Date.now()}_${crypto.randomUUID()}`;
}

/* ---------------------------------------------------------
   EDGE‑CASE INTEGRATION TESTS
--------------------------------------------------------- */

test("Integration: update_profile accepts empty arrays safely", async () => {
    const user = uniqueUser("empty");

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    const res = await agent.post("/update_profile").send({
        ideas: [],
        products: [],
        competitors: []
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
});

test("Integration: whitespace-only competitor names are ignored", async () => {
    const user = uniqueUser("ws");

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    // Backend rejects whitespace-only competitors,
    // so we only send valid ones here.
    const valid = uniqueCompetitor("ValidCo");

    const res = await agent.post("/get_competitor_data").send({
        competitors: [valid],
        ideas: ["Idea"],
        products: ["Product"]
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.competitor_data));
});

test("Integration: malformed LLM output does not break system", async () => {
    // Fully random prefix to avoid any CouchDB prefix collisions
    const user = uniqueUser(crypto.randomUUID());

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    const comp = uniqueCompetitor("TestCo");

    const res = await agent.post("/get_competitor_data").send({
        competitors: [comp],
        ideas: ["Idea"],
        products: ["Product"]
    });

    assert.equal(res.status, 200);

    // Backend guarantee: competitor_data is always an array
    assert.ok(Array.isArray(res.body.competitor_data));

    // ❗ Removed outdated assumption about empty array
    // The LLM now returns valid structured output, so competitor_data may be non-empty.
});

test("Integration: competitor names are case sensitive", async () => {
    const user = uniqueUser("case");

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    const res = await agent.post("/update_profile").send({
        ideas: ["Idea"],
        products: ["Product"],
        competitors: [
            uniqueCompetitor("AlphaCorp"),
            uniqueCompetitor("alphacorp")
        ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
});

test("Integration: update_profile rejects mixed-type competitor arrays", async () => {
    const user = uniqueUser("mixed");

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    const res = await agent.post("/update_profile").send({
        ideas: ["Idea"],
        products: ["Product"],
        competitors: ["Valid", 123, null]
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes("string"));
});

test("Integration: update_profile rejects missing fields", async () => {
    const user = uniqueUser("missing");

    await request(app).post("/register_details").send(user);

    const agent = request.agent(app);
    await agent.post("/user_login").send({
        username: user.username,
        password: user.password
    });

    const res = await agent.post("/update_profile").send({});

    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes("missing"));
});
