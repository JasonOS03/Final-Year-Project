const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");

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
    console.log(server_response);
}catch(err)
{
    console.log("Failed to send prompt",err);
}
})