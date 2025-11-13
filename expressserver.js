const exp = require('express');
const app = exp();
const nano = require('nano');
const couch_database = nano('http://admin:Jasonantony3@127.0.0.1:5984')
const input = document.getElementById('promptbox');
const input_form = document.getElementById('prompt_form');

const the_database = couch_database.db.use('final_year_project');

input_form.addEventListener("submit", async (e)=>
{
    e.preventDefault();
    user_prompt = input.value.trim();
    try{
     const insertion_response = await the_database.insert({user_prompt: user_prompt});
     return insertion_response;
    }catch{
        alert("error inserting prompt to database");
    }



}
);

