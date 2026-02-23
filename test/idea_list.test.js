const test = require("node:test"); 
const assert = require("node:assert"); 
const request = require("supertest"); 
const app = require("../public/expressserver.js");

test("/idea_list saves data to database successfully", async () =>{
    const response = await request(app).post("/idea_details").send({username: "Jason",ideas : ["Financial Subscription App", "GP Subscription App"]})
    assert.equal(response.body.success, true);
    assert.equal(response.status,200);
    assert.ok(response.body != null);

})