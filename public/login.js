const username = document.getElementById("username");
const password =  document.getElementById("password");
const login_submit =  document.getElementById("login_submit");

login_submit.addEventListener("submit" ,async ()=> {
    try{
         const login_details = await fetch("/user_details",{
            method: "GET",
            headers:
            {
                "Content-Type": "application/json"
            }

         })
    }
    catch{
        console.log("failed to fetch user details");
    }
})
