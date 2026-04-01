process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /competitor_details endpoint and competitor data persistence

test("/competitor_details saves data to database successfully", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const competitors = [
        { competitor_name: "EdgeTech", market_position: "niche" },
        { competitor_name: "MacroApps", market_position: "market_leader" }
    ];

    const response = await request(app)
        .post("/competitor_details")
        .send({ username, competitors });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
});

test("/competitor_details rejects empty competitor shapes", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const response = await request(app)
        .post("/competitor_details")
        .send({ username, competitors: "bad-data" });

    assert.equal(response.status, 400);
});
