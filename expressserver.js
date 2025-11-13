import { InferenceClient } from "@huggingface/inference";
import fetch  from "node-fetch";


const exp = require('express');
const app = exp();
const nano = require('nano');
const couch_database = nano('http://admin:Jasonantony3@127.0.0.1:5984')
const input = document.getElementById('promptbox');
const input_form = document.getElementById('prompt_form');
const client = new InferenceClient(process.env.HF_TOKEN);

const the_database = couch_database.db.use('final_year_project');
app.use(exp.static("public"));

    app.post("/submit-prompt",  async (request,response)=>{
        const user_prompt = request.body.user_prompt
        user_prompt.trim()
    
            try {
        const insertion_response = await the_database.insert({ user_prompt });

        const resp = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct", {
            method: "POST",
            headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: user_prompt }) 
        });

        const result = await resp.json();
        response.json({db: insertion_response, output: result})
        console.log("Model output:", result);
        } catch (err) {
            console.error("Error inserting prompt to database")
        }
    
    });

