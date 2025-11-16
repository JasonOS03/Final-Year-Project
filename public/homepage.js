const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");
const response_text = document.getElementById("response");

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
    const retrieved_output = retrieved_data.output;
    response_text.innerHTML = retrieved_output.trim();
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

user_form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const user_prompt =  input.value.trim();

try{
const response = await fetch("/submit-prompt", 
{
    method: "POST",
    headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({user_prompt}) 

})
    const server_response = await response.json();
    const trimmed_response = server_response.output;
    response_text.innerHTML = trimmed_response.trim();
    console.log(server_response);
}catch(err)
{
    console.log("Failed to send prompt",err);
}
})