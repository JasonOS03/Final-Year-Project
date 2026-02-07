
const logout_button = document.getElementById("logout_button");
const logout_form = document.getElementById("logout_form");

logout_button.addEventListener("click", async ()=>
{
   
   logout_form.innerHTML = "Redirecting to Login page";

    const logout = await fetch("/logout",{
    method: "POST",
    "Content-Type": "application/json",
    credentials: "include"
   })
   const userlogout = await logout.json();
   console.log(userlogout);

   setTimeout(()=>{
           window.location.href = "index.html" 
        },2000);
})