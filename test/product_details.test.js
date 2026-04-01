process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../public/expressserver.js");

// Functionality under test: /product_details endpoint and product workouts

test("/product_details saves data to database successfully", async () => {
    const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const products = [
        { name: "SaaS CRM", description: "customer lifecycle management" },
        { name: "Analytics Suite", description: "AI usage insights" }
    ];

    const response = await request(app)
        .post("/product_details")
        .send({ username, products });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
});

test("/product_details with missing username is validation fail", async () => {
    const response = await request(app)
        .post("/product_details")
        .send({ products: [{ name: "example" }] });

    assert.equal(response.status, 400);
});
