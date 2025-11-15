
const express = require("express");
const fetch = require("node-fetch");
const nano = require("nano");
const app = express();
const couch_database = nano('http://admin:Jasonantony3@127.0.0.1:5984')

app.use(express.json());
const the_database = couch_database.db.use('final_year_project');
app.use(express.static("public"));

    app.post("/submit-prompt",  async (request,response)=>{
        const user_prompt = request.body.user_prompt.trim();
    
            try {
        

        const resp = await fetch("https://router.huggingface.co/hf-inference", {
            method: "POST",
            headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json"
            
            },
            body: JSON.stringify({ inputs: user_prompt, model: "gpt2" })

        });

        const result = await resp.json();
        const formatted = JSON.stringify(result);
        const insertion_response = await the_database.insert({ user_prompt,the_output: formatted });
        console.log("Inserted document:", { user_prompt, the_output: formatted });
        response.json({db: insertion_response, output: formatted});
        console.log("Model output:", formatted);
        } catch (err) {
            console.error("Error inserting prompt to database",err);
        }
    
    });

    app.listen(3000, ()=>
    {
        console.log("listening on port 3000")
    }
    );

