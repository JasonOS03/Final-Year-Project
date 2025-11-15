
const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();
const nano = require("nano");
const app = express();
const couch_database = nano(process.env.COUCHDB_URL);

app.use(express.json());
const the_database = couch_database.db.use('final_year_project');
app.use(express.static("public"));

    app.post("/submit-prompt",  async (request,response)=>{
        const user_prompt = request.body.user_prompt.trim();
    
            try {
        

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
            "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000", // or your deployed domain
            "X-Title": "SaaS Idea Generator"
            
            },
            body: JSON.stringify({  model: "openrouter/auto", messages: [
    { role: "system", content: "none" },
    { role: "user", content: user_prompt }
  ], max_tokens: 50 })

        });

            if (!resp.ok) 
    {
        const errorText = await resp.text();
        console.error("Model API error:", errorText);
        return response.status(resp.status).json({ error: errorText });
    }

        const result = await resp.json();
        const content = result.choices[0].message.content
        const formatted = JSON.stringify(result);
        const insertion_response = await the_database.insert({ user_prompt,the_output: formatted });
        console.log("Inserted document:", { user_prompt, the_output: formatted });
        console.log("Model output:", formatted);
        if(!content)
        {
            console.log("content is empty");
        }
        else
        {
            response.json({db: insertion_response, output: content});
        }
        } catch (err) {
            console.error("Error inserting prompt to database",err);
        }
    
    });

    app.listen(3000, ()=>
    {
        console.log("listening on port 3000")
    }
    );

