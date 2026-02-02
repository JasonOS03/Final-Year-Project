const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");
const response_text = document.getElementById("response");
const register_button = document.getElementById("register_button");


document.addEventListener("DOMContentLoaded", async ()=>{
try{
    const retrieval = await fetch("/retrieve-recommendations",{
        method: "GET",
        headers: {
            "Content-Type" : "application/json"
        }
    }
    )
    const retrieved_data = await retrieval.json();
    const retrieved_output = JSON.parse(retrieved_data.output);
    const response_content = retrieved_output.choices[0].message.content;
    response_text.innerHTML = response_content.trim().replace(/"/g, ""); // remove double quotes from the response
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

