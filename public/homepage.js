const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");
const response_text = document.getElementById("response");
const register_button = document.getElementById("register_button");
const view_full_button = document.getElementById("view_full_recomm");


document.addEventListener("DOMContentLoaded", async ()=>{
try{
    const retrieval = await fetch("/retrieve-recommendations",{
        method: "GET",
        headers: {
            "Content-Type" : "application/json"
        }
    }
    )
    const backend_response = await retrieval.json();
    console.log("RAW OUTPUT FROM BACKEND:", backend_response.output);
    let res = backend_response.output;
    while(typeof res === "string")
    {
        res = JSON.parse(res);
    }
    const message = res?.choices?.[0]?.message; 
    const response_content = message.reasoning_details?.[0]?.summary?.trim() || message.reasoning?.trim() || message.content?.trim();
    response_text.innerHTML = response_content.trim().replace(/"/g, ""); // remove double quotes from the response
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

