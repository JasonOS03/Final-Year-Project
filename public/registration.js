const error_section  = document.getElementById("error_text")
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_product");
const register_button = document.getElementById("register_button");



function validate_username()
{
    const u_name = document.getElementById("register_uname").value;
    if (u_name.length < 8)
    {
        error_section.innerHTML = `Invalid username length, username must be at least 8 letters`;
        return false;
    }
    return true;
}

function validate_password()
{
    const password = document.getElementById("register_password").value;
    const regex = /^[A-Za-z](?=.*\d).{9,}$/;
    const matching =  regex.test(password);

    if(!matching)
    {
        error_section.innerHTML = "Password must be at least 10 characters long and must contain at least one digit and must start with a letter"
        return false;
    }
    return true;
}

let idea_number = 3;

add_ideas_button.addEventListener("click",()=>
{
     const label = document.createElement("label");
     label.className = "text-black form-label";
     label.textContent = "Idea " + ++idea_number;

     const idea_input = document.createElement("input");
     idea_input.className = "form-control mb-2 input-idea";
     idea_input.type = "text";
     idea_input.placeholder = "Please enter a product/service idea";

     idea_list.appendChild(label);
     idea_list.appendChild(idea_input);
}
)

let product_count = 1;
add_products_button.addEventListener("click",()=>{
    const product = document.querySelector(".individual-product");
    const duplicate = product.cloneNode(true);  

    duplicate.querySelector(".product-header").textContent = "Product " + ++product_count

    duplicate.querySelectorAll("input").forEach(input => {
        if(input.type === "text")
        {
            input.value = "";
        }
        else if(input.type === "checkbox")
        {
            input.checked = false;
        }
    });

    product_portfolio.appendChild(duplicate);

})

register_button.addEventListener("click",async (e)=>{
    e.preventDefault();

    if(!validate_password() || !validate_username())
    {
        console.log("unable to register, username or password invalid");
        return;
    }
    const u_name = document.getElementById("register_uname").value;
    const email = document.getElementById("register_email").value;
    const password = document.getElementById("register_password").value;
    


    try{
         const registration_details = await fetch("/register_details",{
            method: "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
                username : u_name,
                password : password,
                email : email
            })

           
         })
         const response = await registration_details.json();
         console.log(response);
    }
    catch(error)
    {
        console.error("failed to send personal details to the backend")
    }

    const ideas = document.querySelectorAll(".input-idea");
    const idea_array = [];
    ideas.forEach(input =>{
        idea_array.push(input.value);

    });

    try{
         const idea_list_details = await fetch("/idea_details",{
            method: "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
               username:u_name,
               ideas: idea_array
            })

           
         })
         const response = await idea_list_details.json();
         console.log(response);
    }
    catch(error)
    {
        console.error("failed to idea list to the backend to the backend");
    }
  

   
  
    product_array = []
    const products = document.querySelectorAll(".individual-product");

    products.forEach(product_block => {

        const industries_array = [];
        const industries = product_block.querySelectorAll(".industries-checkbox");
        industries.forEach(industry => {
            if(industry.checked)
            {
                industries_array.push(industry.id);
            }
        });

        const subscriptions_array = []
        const subscriptions = product_block.querySelectorAll(".subscription-checkbox");
        subscriptions.forEach(sub =>{
            if(sub.checked)
            {
            subscriptions_array.push(sub.id);
            }
        });



        const product = {
        description : product_block.querySelector(".product_description").value,
        subscription_types : subscriptions_array,
        prices : product_block.querySelector(".product_price").value,
        price_range : product_block.querySelector(".price_range").value,
        industries : industries_array

        };
        product_array.push(product);
        
    });

    try{
         const product_details = await fetch("/product_details",{
            method: "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
               username:u_name,
               products : product_array
            })

           
         })
         const response = await product_details.json();
         console.log(response);
    }
    catch(error)
    {
        console.error("failed to send product portfolio to the backend");
    }



})

