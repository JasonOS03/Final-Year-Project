const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");

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
    response_container.innerHTML = trimmed_response.trim();
    console.log(server_response);
}catch(err)
{
    console.log("Failed to send prompt",err);
}
})