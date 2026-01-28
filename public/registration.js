const { text } = require("express");

const email = document.getElementById("register_email").value;
const error_section  = document.getElementById("error_text")
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_products_button");


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
    const regex = "^[A-Za-z](?=.*\d).{9,}$";
    const matching =  regex.test(password);

    if(!matching)
    {
        error_section.innerHTML = "Password must be at least 10 characters long and must contain at least one digit and must start with a letter"
        return false;
    }
    return true;
}

add_ideas_button.addEventListener("click",()=>
{
     let idea_number = 3;
     const label = document.createElement("label");
     label.className = "text-black form-label";
     label.textContent = "Idea " + ++idea_number;

     const idea_input = document.createElement("input");
     idea_input.className = "form-control mb-2";
     idea_input.type = text;
     idea_input.placeholder = "Please enter a product/service idea";

     idea_list.appendChild(label);
     idea_list.appendChild(input);
}
)

let product_count = 1;
add_products_button.addEventListener("click",()=>{
    const product = document.querySelector(".individual-product");
    const duplicate = product.cloneNode(true);  

    duplicate.querySelector("p3").textContent = "Product " + ++product_count

    duplicate.querySelectorAll("input").forEach(input => {
        if(input.type === "text")
        {
            input.textContent = " ";
        }
        else if(input.type === "checkbox")
        {
            input.checked = false;
        }
    });

    product_portfolio.insertBefore(duplicate,add_products_button);

})


