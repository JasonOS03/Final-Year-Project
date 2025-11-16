
const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();
const nano = require("nano");
const app = express();
const couch_database = nano(process.env.COUCHDB_URL);

app.use(express.json());
const the_database = couch_database.db.use('final_year_project');
app.use(express.static("public"));

    app.get("/retrieve-recommendations", async(request,response)=>
    {
        try{
        
            const query = await the_database.find({
                selector:
                {
                    user_prompt: {"$exists": true }
                },
                fields:
                [
                    "the_output"
                ],
                sort:
                 [
                    { "_id": "desc" }
                 ],
                    limit: 1
                
            });
            const retrieved_response = query.docs[0];
           response.json({ output: retrieved_response.the_output });
           

        }catch(err){
            console.log("failed to retrieve recommendations from the database",err);
            return;
        };
    });

    app.post("/submit-prompt",  async (request,response)=>{
        const user_prompt = request.body.user_prompt.trim();
    
            try {
        

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
            "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000", 
            "X-Title": "SaaS Idea Generator"
            
            },
            body: JSON.stringify({  model: "openrouter/auto", messages: [
    { role: "system", content: "none" },
    { role: "user", content: user_prompt }
  ], max_tokens: 50 })

        });

            if (!resp.ok) 
    {
        const error_text = await resp.text();
        console.error("Model API error:", error_text);
        return response.status(resp.status).json({ error: error_text });
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

