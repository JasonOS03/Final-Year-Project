const error_section  = document.getElementById("error_text")
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_product");
const update_button = document.getElementById("update_button");

async function load_details(){
try
{
    const u_name = document.getElementById("register_uname").value;
    const retrieve_reg_details = await fetch("/retrieve_details",{
        method:"GET",
        headers:
        {
            "Content-Type" : "application/json"
        },
        credentials:"include"

    })
    const profile = await retrieve_reg_details.json();
    const idea_inputs = document.querySelectorAll(".input-idea");
    const products = document.querySelectorAll(".individual-product");
    
    idea_inputs.forEach((input_box,i) =>{
        input_box.value = profile.ideas[i];
    })
    products.forEach((product,i)=>{
        const industries = product.querySelectorAll(".industries-checkbox");
        const subscriptions =  product.querySelectorAll(".subscription-checkbox")

        product.querySelector(".product_description").value = profile.products[i].description;
        product.querySelector(".product_price").value = profile.products[i].prices;
        product.querySelector(".price_range").value = profile.products[i].price_range
        industries.forEach((industry,j)=>{
            industry.value = profile.products[i].industries[j];
        })
        subscriptions.forEach((subscription_type,j)=>{
            subscription_type.value =  profile.products[i].subscription_types[j];
        })
    })
    
}
catch
{
    console.log("Failed to retrieve registration details");
}
}

load_details();