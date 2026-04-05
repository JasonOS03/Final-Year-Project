const error_section  = document.getElementById("error_text")
const product_portfolio = document.getElementById("product_portfolio_div");
const idea_list =  document.getElementById("idea_list_div");
const add_ideas_button = document.getElementById("add_ideas_button");
const add_products_button =  document.getElementById("add_product");
const register_button = document.getElementById("register_button");

function attach_slider_value(slider)
{
    // Update the helper text below a range input whenever its value changes.
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

document.querySelectorAll(".price_range").forEach(attach_slider_value);

function validate_username()
{
    // Require a minimum username length before allowing registration.
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
    // Require a stronger password and stop it from matching the username.
    const password = document.getElementById("register_password").value;
    const u_name = document.getElementById("register_uname").value;
    const regex = /^[A-Za-z](?=.*\d).{9,}$/;
    const matching =  regex.test(password);

    if(password === u_name)
    {
        error_section.innerHTML = "Username and password must different"
        return false;
    }
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
     // Add another blank idea input to the registration form.
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
    // Clone the product block so the user can add another product portfolio item.
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
    const slider = duplicate.querySelector(".price_range");
    if (slider) {
        slider.value = slider.min || "0";
        attach_slider_value(slider);
    }

    product_portfolio.appendChild(duplicate);

});
// ADD THIS
const add_competitor = document.getElementById("add_competitor");

let competitor_count = 1;

add_competitor.addEventListener("click", () => {
    // Clone the competitor template and reset its fields for a new competitor entry.
    const template = document.querySelector(".individual-competitor");
    const clone = template.cloneNode(true);

    clone.querySelector(".competitor-header").textContent = "Competitor " + ++competitor_count;

    clone.querySelectorAll("input").forEach(input => {
        if (input.type === "text") input.value = "";
        if (input.type === "checkbox") input.checked = false;
    });
    const slider = clone.querySelector(".price_range");
    if (slider) {
        slider.value = slider.min || "0";
        attach_slider_value(slider);
    }

    document.querySelector("#competitor_div").appendChild(clone);
});

document.addEventListener("click", e => {
    if (e.target.id === "add_product" && e.target.closest(".individual-competitor")) {
        // Add another product inside the competitor card that the user clicked.

        const comp = e.target.closest(".individual-competitor");
        const template = comp.querySelector(".individual-product");
        const clone = template.cloneNode(true);

        clone.querySelectorAll("input").forEach(input => {
            if (input.type === "text") input.value = "";
            if (input.type === "checkbox") input.checked = false;
        });
        const slider = clone.querySelector(".price_range");
        if (slider) {
            slider.value = slider.min || "0";
            attach_slider_value(slider);
        }

        comp.appendChild(clone);
    }
});


register_button.addEventListener("click",async (e)=>{
    // Collect each section of the form and send it to the backend in order.
    e.preventDefault();

    if(!validate_password() || !validate_username())
    {
        console.log("unable to register, username or password invalid");
        window.showActionStatus("Please fix the registration form errors.", "error");
        return;
    }
    const original_button_text = register_button.textContent;
    register_button.disabled = true;
    register_button.textContent = "Registering...";
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
    const products = document.querySelectorAll("#product_portfolio_div .individual-product");

    products.forEach(product_block => {

        const industries_array = [];
        const industries = product_block.querySelectorAll(".industries-checkbox");
        industries.forEach(industry => {
            if(industry.checked)
            {
                industries_array.push(industry.value);
            }
        });

        const subscriptions_array = []
        const subscriptions = product_block.querySelectorAll(".subscription-checkbox");
        subscriptions.forEach(sub =>{
            if(sub.checked)
            {
            subscriptions_array.push(sub.value);
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
    if(product_array.length < 1 && idea_array.length < 1)
    {
        error_section.innerHTML = "Please enter at minimum one idea or one product";
        window.showActionStatus("Please enter at least one idea or one product.", "error");
        register_button.disabled = false;
        register_button.textContent = original_button_text;
        return;
    }

    try{
         const product_details = await fetch("/product_details",{
            method: "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
               username: u_name,
               products : product_array
            })

           
         });
         const response = await product_details.json();
         console.log(response);

         
    }
    catch(error)
    {
        console.error("failed to send product portfolio to the backend");
    }
    const competitors = Array.from(document.querySelectorAll(".individual-competitor")).map(comp =>{

            const competitor_name = comp.querySelector(".competitor-name").value
            const market_position = comp.querySelector(".position").value
            const sources = comp.querySelector(".link-source").value
        // create an array of values for each individual product 
        const products = Array.from(comp.querySelectorAll(".individual-product")).map(p => {
            const product_name =  p.querySelector(".product-name").value;
            const target_audience = p.querySelector(".target-audience").value;
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



        // return the description, subscription types array, prices, price range and industries array
         return {
        product_name : product_name,
        target_audience: target_audience,
        categories: categories_array,
        price_range: price_range

        };
        
        });
        return {
        competitor : competitor_name,
        market_pos: market_position,
        source: sources,
        products: products

        };
        });
        
    try
    {
        const competitors_response =  await fetch("/competitor_details",{
            method: "POST",
            headers:
            {
                "Content-Type":"application/json"
            },
            body: JSON.stringify(
                {
                    username:u_name,
                    competitors:competitors
                }
            )

        })
        const resp = await competitors_response.json();
        console.log(resp.output);
    }
    catch(error)
    {
        console.error("failed to send competitor details to the backend");
    }
        const spinner = create_spinner();
        document.body.appendChild(spinner);

    try{
        const generate_recommendations = await fetch("/generate_recommendations", {
            method : "POST",
            headers:
            {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
                username: u_name,
                products: product_array,
                ideas: idea_array
            })
         });
         const resp = await generate_recommendations.json();
         console.log(resp.output);
         window.showActionStatus("Registration complete. Redirecting...", "success");
         window.location.href = "index.html?registered=true";
    }catch(err)
    {
        console.error("failed to send recommendation generation request to the backend",err);
        spinner.remove();
        error_section.innerHTML = "Error generating recommendations, please try again";
        window.showActionStatus("Error generating recommendations.", "error");
        register_button.disabled = false;
        register_button.textContent = original_button_text;
    }



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

