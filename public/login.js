const username = document.getElementById("username").value;
const password =  document.getElementById("password").value;
const login_submit =  document.getElementById("login_submit");
const login_form = document.getElementById("login_form");
const error_message = document.getElementById("credential_message");

const register_params = new URLSearchParams(window.location.search);
if(register_params.get("registered") === "true")
{
    showToast("You have registered successfully! Please log in to view your recommendations.");
    setTimeout(()=>{
        const toast = document.querySelector(".toast");
        if(toast)
        {
            toast.classList.remove("show");
            toast.remove();
        }
},6000);
}

login_submit.addEventListener("click" ,async (e)=> {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const original_button_text = login_submit.textContent;
    login_submit.disabled = true;
    login_submit.textContent = "Signing in...";
    const spinner = create_spinner();
    spinner.classList.add("text-center");
    const span = spinner.querySelector("span");
    span.textContent = "Verifying your credentials...";
    spinner.classList.remove("text-success");
    spinner.classList.add("text-warning");
    login_form.appendChild(spinner);
    await new Promise(requestAnimationFrame);
    try{
         const login_details = await fetch("/user_login",{
            method: "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify
            ({
                username:username,
                password:password
            }),
            credentials: "include"

         })
         const resp = await login_details.json();
         spinner.remove();
         
         if(resp.success)
        {
         window.showActionStatus("Login successful. Redirecting...", "success");
         login_form.innerHTML = "Correct credentials entered, redirecting to homepage";
        setTimeout(()=>{
           window.location.href = "homepage.html" 
        },2000);

        }
        else
        {
            error_message.innerHTML = "password or username does not match, try again";
            window.showActionStatus("Incorrect username or password.", "error");
            login_submit.disabled = false;
            login_submit.textContent = original_button_text;
        }

    }
    catch{
        console.log("failed to fetch user details");
        spinner.remove();
        error_message.innerHTML = "An error occurred during login, please try again";
        window.showActionStatus("An error occurred during login.", "error");
        login_submit.disabled = false;
        login_submit.textContent = original_button_text;
    }

})
function create_spinner()
{
    const loading_spinner = document.createElement("div");
    loading_spinner.classList.add("spinner-border","text-success","justify-content-center","d-flex");
    loading_spinner.role = "status";
    const spinner_span = document.createElement("span");
    spinner_span.classList.add("visually-hidden");
    spinner_span.textContent = "Saving your details and generating your recommendations...";
    loading_spinner.appendChild(spinner_span);
    return loading_spinner;
}
