process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: survey+feedback endpoint (/post_feedback)

test("/post_feedback submits rating successfully once", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const response = await agent.post("/post_feedback").send({ recommendation_id: 1, star_rating: 5, feedback_text: "excellent" });
    assert.equal(response.status, 200);
    assert.equal(response.body.message, "successfully submitted recommendation rating");
});

test("/post_feedback rejects duplicate survey feedback", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";

    await request(app).post("/register_details").send({ username, password, email: `${username}@example.com` });

    const agent = request.agent(app);
    await agent.post("/user_login").send({ username, password });

    const first = await agent.post("/post_feedback").send({ recommendation_id: 2, star_rating: 4, feedback_text: "good" });
    assert.equal(first.status, 200);

    const second = await agent.post("/post_feedback").send({ recommendation_id: 2, star_rating: 5, feedback_text: "still good" });
    assert.equal(second.status, 200);
    assert.equal(second.body.previously_submitted, true);
});
