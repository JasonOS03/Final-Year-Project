
const username = document.getElementById("username").value;
const password =  document.getElementById("password").value;
const login_submit =  document.getElementById("login_submit");
const login_form = document.getElementById("login_form");
const error_message = document.getElementById("credential_message");

login_submit.addEventListener("click" ,async (e)=> {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
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
         
         if(resp.success)
        {
         login_form.innerHTML = "Correct credentials entered, redirecting to homepage";

         login_form.appendChild(document.createElement("br"));

         const spinner = document.createElement("div")
         spinner.classList.add("spinner-border text-warning");
         spinner.setAttribute("role","status");

         const span =  document.createElement("span");
         span.textContent = "Redirecting....";
         span.classList.add("visually-hidden");

         spinner.style.height = "5rem";
         spinner.style.width = "5rem";

         spinner.appendChild(span);
         login_form.appendChild(spinner);

        setTimeout(()=>{
           window.location.href = "homepage.html" 
        },2000);

        }
        else
        {
            error_message.innerHTML = "password or username does not match, try again";
        }

    }
    catch{
        console.log("failed to fetch user details");
    }



})


