process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /idea_details endpoint and idea storage logic

test("/idea_details saves data to database successfully", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const response = await request(app)
        .post("/idea_details")
        .send({ username, ideas: ["Financial Subscription App", "GP Subscription App"] });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.message.includes("success"));
});

test("/idea_details rejects invalid ideas payload", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const response = await request(app)
        .post("/idea_details")
        .send({ username, ideas: "this is not an array" });

    // In current implementation invalid payload may still be accepted and return 200,
    // so assert behaviour is explicit.
    assert.equal(response.status, 400);
});
