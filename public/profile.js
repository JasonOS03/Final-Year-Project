const error_section  = document.getElementById("error_text");
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_product");
const update_button = document.getElementById("update_button");

// Keep the text below each range input synced with the current slider value.
function attach_slider_value(slider)
{
    const slider_value = slider.parentElement.querySelector(".slider-value");
    if (!slider_value) {
        return;
    }
    const update_slider_value = () => {
        slider_value.textContent = `Current value: ${slider.value}`;
    };
    update_slider_value();
    slider.addEventListener("input", update_slider_value);
}

// Initialise the slider labels for the inputs that are already on the page.
document.querySelectorAll(".price_range").forEach(attach_slider_value);

document.addEventListener("DOMContentLoaded", () => {

    // Load the saved profile data so the form is prefilled with the current values.
    async function load_details() {

        try {
            const retrieve_reg_details = await fetch("/retrieve_details", {
                method:"GET",
                headers: { "Content-Type" : "application/json" },
                credentials:"include"
            });
            // asynchronously wait for the response and grab all of the fields
            const profile = await retrieve_reg_details.json();
            const username = document.getElementById("update_uname");
            const password = document.getElementById("update_password");
            const email =  document.getElementById("update_email");
            const idea_inputs = document.querySelectorAll(".input-idea");
            const products = document.querySelectorAll("#product_portfolio_div .individual-product");

                // value in the document becomes the retrieved value
                username.value = profile.username;
                password.value = profile.password;
                email.value = profile.email;

                // for each input blocks, display corresponding user idea
                idea_inputs.forEach((input_box, i) => {
                    
                   input_box.value = profile.ideas[i];
                });
           

            for (let i = 0; i < products.length; i++) {

                // if there are no more products left, indicate that all the product fields have been populated
                if (!profile.products[i]) {
                    console.log("All products populated");
                    break;
                }

                const product = products[i];

                // retrieve the industries and the subscriptions
                const industries = product.querySelectorAll(".industries-checkbox");
                const subscriptions = product.querySelectorAll(".subscription-checkbox");

                // assign the retrieved product fields to the values of the page product fields
                product.querySelector(".product_description").value = profile.products[i].description;
                product.querySelector(".product_price").value = profile.products[i].prices;
                product.querySelector(".price_range").value = profile.products[i].price_range;
                attach_slider_value(product.querySelector(".price_range"));

                industries.forEach((industry) => {
                    // if the industries retrieved for that product includes the value of a particular industry
                    if(profile.products[i].industries.includes(industry.value)) {
                        // set checked to be true
                        industry.checked = true;
                    }
                });

                subscriptions.forEach((subscription_type) => {
                    // if the subscription types retrieved for that product includes the value of a particular subscription type
                    if (profile.products[i].subscription_types.includes(subscription_type.value)) {
                        subscription_type.checked = true;
                    }
                });
            }
            const competitors  = document.querySelectorAll(".individual-competitor");
                for(let i = 0; i < competitors.length;i++){
                if (!profile.user_entered_competitors || !profile.user_entered_competitors[i]){ continue;}
                const comp = competitors[i];
                const competitor_name  = comp.querySelector(".competitor-name");
                competitor_name.value = profile.user_entered_competitors[i].competitor;

                const market_position = comp.querySelector(".position");
                market_position.value =  profile.user_entered_competitors[i].market_pos

                const sources = comp.querySelector(".link-source");
                sources.value = profile.user_entered_competitors[i].source

                const products = comp.querySelectorAll(".individual-product");
                products.forEach((product,j) =>{
                const saved = profile.user_entered_competitors[i].products?.[j];
                if (!saved) {
                    return;
                }
                const product_name = product.querySelector(".product-name");
                product_name.value = saved.product_name;

                const target_audience = product.querySelector(".target-audience");
                target_audience.value = saved.target_audience;


                const categories = product.querySelectorAll(".categories-checkbox")
                categories.forEach((category) =>{
                    if(saved.categories?.includes(category.value)
                    )
                {
                    category.checked = true;
                }
                });

                const price_range = product.querySelector(".price_range");
                price_range.value = saved.price_range || price_range.value;
                attach_slider_value(price_range);


                })
            }

        } // if registration details cannot be found, print an error message to the console
        catch(err) {
            console.error("failed to retrieve registration details:", err);
        }

    } 
    // Populate the form as soon as the page has loaded.
    load_details(); 
    // set the initial number of ideas to 3
    let idea_number = 3;
    // Add another idea input when the user wants to store more ideas.
    add_ideas_button.addEventListener("click",()=>
    {
    // create a label with black text and specify that it is of class form-label
     const label = document.createElement("label");
     label.className = "text-black form-label";
     label.textContent = "Idea " + ++idea_number; // increment the idea number on each click of the button


    // create the input elements
     const idea_input = document.createElement("input");
     idea_input.className = "form-control mb-2 input-idea"; // idea is of class form-control with a bottom margin of 2 
     idea_input.type = "text"; // must be of type text
     idea_input.placeholder = "Please enter a product/service idea";

    // append the label and idea input boxes to the idea list
     idea_list.appendChild(label);
     idea_list.appendChild(idea_input);
    }
    )
    let product_count = 1;
    // Clone the product block so the user can add another product portfolio entry.
    add_products_button.addEventListener("click",()=>{
    const product = document.querySelector(".individual-product");
    const duplicate = product.cloneNode(true); // clone the product div if the button is clicked

    // product header contains the incremented product number
    duplicate.querySelector(".product-header").textContent = "Product " + ++product_count

    duplicate.querySelectorAll("input").forEach(input => {
        if(input.type === "text")
        {
            input.value = ""; // set the input value to be null initially
        }
        else if(input.type === "checkbox")
        {
            input.checked = false; // if checkbox, set the checked attribute to be false 
        }
    });
    const slider = duplicate.querySelector(".price_range");
    if (slider) {
        slider.value = slider.min || "0";
        attach_slider_value(slider);
    }

    // append the cloned product to the product portfolio
    product_portfolio.appendChild(duplicate);

})


}); 

update_button.addEventListener("click", async ()=>{
// Send the updated profile data to the backend.
async function update_profile()
{
    const original_button_text = update_button.textContent;
    update_button.disabled = true;
    update_button.textContent = "Saving...";
    const spinner = create_spinner();
    document.body.appendChild(spinner);
    try{
        // create an array of trimmed values fpr each idea input
        const idea_updates = Array.from(document.querySelectorAll(".input-idea")).map(inp => inp.value.trim());
        // create an array of values for each individual product 
        const products = Array.from(document.querySelectorAll("#product_portfolio_div .individual-product")).map(p => {

            product_array = []; //initialise empty product array
            const industries_array = []; // initialise empty industries array
            const industries = p.querySelectorAll(".industries-checkbox");
            industries.forEach(industry => {
            // if a particular industry box is checked, push the value to the array
            if(industry.checked)
            {
                industries_array.push(industry.value);
            }
        });

        const subscriptions_array = []
        const subscriptions = p.querySelectorAll(".subscription-checkbox");
        subscriptions.forEach(sub =>{
            // if a particular subscription box is checked, push the value to the subscriptions array
            if(sub.checked)
            {
            subscriptions_array.push(sub.value);
            }
        });


        // return the descriptiom, subscription types array, prices, price range and industries array
         return {
        description : p.querySelector(".product_description").value,
        subscription_types : subscriptions_array,
        prices : p.querySelector(".product_price").value,
        price_range : p.querySelector(".price_range").value,
        industries : industries_array

        };
        
        });
        const competitors = Array.from(document.querySelectorAll(".individual-competitor")).map(comp =>{

            const competitor_name = comp.querySelector(".competitor-name")?.value || "";
            const market_position = comp.querySelector(".position")?.value || "";
            const sources = comp.querySelector(".link-source")?.value || "";
        // create an array of values for each individual product 
        const products = Array.from(comp.querySelectorAll(".individual-product")).map(p => {
            const product_name =  p.querySelector(".product-name")?.value || "";
            const target_audience = p.querySelector(".target-audience")?.value || "";
            categories_array = []; //initialise empty product array
             // initialise empty industries array
            const categories = p.querySelectorAll(".categories-checkbox");
            categories.forEach(category => {
            // if a particular industry box is checked, push the value to the array
            if(category.checked)
            {
                categories_array.push(category.value);
            }
        });

       const price_range = p.querySelector(".price_range")?.value || "";



        // return the descriptiom, subscription types array, prices, price range and industries array
         return {
        product_name,
        target_audience,
        categories: categories_array,
        price_range

        };
        
        });
        return {
        competitor : competitor_name,
        market_pos: market_position,
        source: sources,
        products: products

        };
        });
        // send a POST method to the backend to update the profile
        const update = await fetch("/update_profile",{
            method : "POST",
            headers:
            {
                "Content-Type":"application/json"

            },
            credentials:"include",
            body:JSON.stringify({ // include the products and ideas in the body
                ideas:idea_updates,
                products:products,
                competitors:competitors
            })
        })
        // asynchronously wait for the response
        if(!update.ok)
        {
            const backend_update = await update.json();
            console.error("Failed update: ",backend_update);
            spinner.remove();
            window.showActionStatus("Failed to update your profile.", "error");
            update_button.disabled = false;
            update_button.textContent = original_button_text;
            return;
        }

        // once a successfull response is retrieved, redirect the user to the homepage
        window.showActionStatus("Profile updated successfully.", "success");
        window.location.href = "homepage.html?updated=true";
        

    }
    catch(err)
    {
        console.error("Error sending profile updates to the backend: ",err)
        spinner.remove();
        window.showActionStatus("Error saving profile changes.", "error");
        update_button.disabled = false;
        update_button.textContent = original_button_text;
    }
}
// call the update profile method
update_profile();
});
document.addEventListener("DOMContentLoaded",()=>{
let prod_count = 1;
const add_competitor_product = document.querySelector(".add_product");
const add_competitor = document.getElementById("add_competitor");
    // Add another product block to the competitor card that triggered the click.
    function add_product(){
    const compBlock = this.closest(".individual-competitor");
    const competitor_product = compBlock.querySelector(".individual-product");
    const duplicate = competitor_product.cloneNode(true);  

    duplicate.querySelector(".competitor-product-header").textContent = "Product  " + ++prod_count

    duplicate.querySelectorAll("input").forEach(input => {
        if(input.type === "text")
        {
            input.value = "";
        }
        else if(input.type === "checkbox")
        {
            input.checked = false;
        }
        else if(input.type === "range")
        {
            input.value = input.min || "0";
        }
    });
    const slider = duplicate.querySelector(".price_range");
    if (slider) {
        attach_slider_value(slider);
    }

    const parent = competitor_product.parentNode;
    parent.appendChild(duplicate);
}

add_competitor_product?.addEventListener("click",add_product);


let comp_count = 1;
add_competitor?.addEventListener("click",()=>{
    // Clone the full competitor block so the user can track another competitor.
    const compBlock = document.querySelector("#competitor_div .individual-competitor");
     const duplicate = compBlock.cloneNode(true);
     
    duplicate.querySelector(".competitor-header").textContent = "Competitor  " + ++comp_count

    duplicate.querySelectorAll("input").forEach(input => {
        if(input.type === "text")
        {
            input.value = "";
        }
        else if(input.type === "checkbox")
        {
            input.checked = false;
        }
        else if(input.type === "range")
        {
            input.value = input.min || "0";
        }
    });
     duplicate.querySelectorAll(".price_range").forEach(attach_slider_value);
     duplicate.querySelector(".add_product").addEventListener("click",add_product);

    const competitor_div = document.getElementById("competitor_div");
    competitor_div.appendChild(duplicate);

     
});
});

function create_spinner()
{
    const loading_spinner = document.createElement("div");
    loading_spinner.classList.add("d-flex","justify-content-center","align-items-center","w-100");
    loading_spinner.style.minHeight = "200px";
    loading_spinner.role = "status";
    const spinner_icon = document.createElement("div");
    spinner_icon.classList.add("spinner-border","text-success");
    const spinner_span = document.createElement("span");
    spinner_span.classList.add("visually-hidden");
    spinner_span.textContent = "Saving your details and generating your recommendations...";
    spinner_icon.appendChild(spinner_span);
    loading_spinner.appendChild(spinner_icon);
    return loading_spinner;
}
