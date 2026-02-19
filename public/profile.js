const error_section  = document.getElementById("error_text");
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_product");
const update_button = document.getElementById("update_button");

document.addEventListener("DOMContentLoaded", () => {

    async function load_details() {

        try {
            const retrieve_reg_details = await fetch("/retrieve_details", {
                method:"GET",
                headers: { "Content-Type" : "application/json" },
                credentials:"include"
            });

            const profile = await retrieve_reg_details.json();
            const username = document.getElementById("update_uname");
            const password = document.getElementById("update_password");
            const email =  document.getElementById("update_email");
            const idea_inputs = document.querySelectorAll(".input-idea");
            const products = document.querySelectorAll(".individual-product");

                username.value = profile.username;
                password.value = profile.password;
                email.value = profile.email;


                idea_inputs.forEach((input_box, i) => {
                    
                   input_box.value = profile.ideas[i];
                });
           

            for (let i = 0; i < products.length; i++) {


                if (!profile.products[i]) {
                    console.log("All products populated");
                    break;
                }

                const product = products[i];


                const industries = product.querySelectorAll(".industries-checkbox");
                const subscriptions = product.querySelectorAll(".subscription-checkbox");

                product.querySelector(".product_description").value = profile.products[i].description;
                product.querySelector(".product_price").value = profile.products[i].prices;
                product.querySelector(".price_range").value = profile.products[i].price_range;

                industries.forEach((industry) => {
                    if(profile.products[i].industries.includes(industry.id)) {
                        industry.checked = true;
                    }
                });

                subscriptions.forEach((subscription_type) => {
                    if (profile.products[i].subscription_types.includes(subscription_type.id)) {
                        subscription_type.checked = true;
                    }
                });
            }

        } catch(err) {
            console.error("failed to retrieve registration details:", err);
        }

    } 
    load_details(); 

}); 

update_button.addEventListener("click", async ()=>{
async function update_profile()
{
    try{
        const idea_updates = Array.from(document.querySelectorAll(".input-idea")).map(inp => inp.value.trim());
        const products = Array.from(document.querySelectorAll(".individual-product")).map(p => {
            product_array = []
            const industries_array = [];
            const industries = p.querySelectorAll(".industries-checkbox");
            industries.forEach(industry => {
            if(industry.checked)
            {
                industries_array.push(industry.id);
            }
        });

        const subscriptions_array = []
        const subscriptions = p.querySelectorAll(".subscription-checkbox");
        subscriptions.forEach(sub =>{
            if(sub.checked)
            {
            subscriptions_array.push(sub.id);
            }
        });



         return {
        description : p.querySelector(".product_description").value,
        subscription_types : subscriptions_array,
        prices : p.querySelector(".product_price").value,
        price_range : p.querySelector(".price_range").value,
        industries : industries_array

        };
        
        });
        
        
        const update = await fetch("/update_profile",{
            method : "POST",
            headers:
            {
                "Content-Type":"application/json"

            },
            credentials:"include",
            body:JSON.stringify({
                ideas:idea_updates,
                products:products
            })
        })
        const backend_update = await update.json();
        console.log("Backend response: ",backend_update);

        window.location.href = "homepage.html";

    }
    catch(err)
    {
        console.error("Error sending profile updates to the backend: ",err)
    }
}
update_profile();
});
