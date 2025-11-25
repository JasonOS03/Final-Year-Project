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
    const retrieved_output = JSON.parse(retrieved_data.output);
    const response_content = retrieved_output.choices[0].message.content;
    response_text.innerHTML = response_content.trim();
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

// listens for user form submission
user_form.addEventListener("submit", async (e)=>{
    e.preventDefault(); // prevents default reloading of page
    const user_prompt =  input.value.trim();// trims whitespace characters from the user prompt
    if(user_prompt.length <= 20) 
        {
            alert("prompt is too short")
            return;
        }

try{
    // send prompt to Express.js server using the HTTP POST method.
const response = await fetch("/submit-prompt", 
{
    method: "POST",
    headers: {
            "Content-Type": "application/json"
            },
            // convert the user prompt to string format 
            // and this prompt is contained within the body
            body: JSON.stringify({user_prompt}) 

})
    // wait for the JSON response from the server
    const server_response = await response.json();
    const trimmed_response = server_response.output; //  extract output field from response
    response_text.innerHTML = 
    trimmed_response.trim(); // replace the current HTML text with the response
    console.log(server_response);
}catch(err)
{
    console.log("Failed to send prompt",err);
}
})