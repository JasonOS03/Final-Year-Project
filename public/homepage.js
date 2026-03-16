const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const register_button = document.getElementById("register_button");
const right_arrow = document.getElementById("right_arrow");
const left_arrow = document.getElementById("left_arrow");
const carousel  = document.getElementById("carousel");



const view_buttons = document.querySelectorAll(".view_full_recomm");


document.addEventListener("DOMContentLoaded", async ()=>{
try{

    const get_submitted_feedback = await fetch("/retrieve_feedback_status");
    const feedback_data = await get_submitted_feedback.json();

    submitted = {};
    feedback_data.submitted_response.forEach(rec_id =>{
        submitted[rec_id] = true;
    })


    const retrieve_data = await fetch("/retrieve_details",{
        method:"GET",
        headers:
        {
            "Content-Type": "application/json"
        }
    })
    const retrieval_response = await retrieve_data.json();
    const competitors = retrieval_response.competitors;
    const ideas = retrieval_response.ideas;
    const products = retrieval_response.products;
    const retrieval = await fetch("/retrieve-recommendations",{
        method: "GET",
        headers: {
            "Content-Type" : "application/json"
        }
    }
    )
    const backend_response = await retrieval.json();
    console.log("RAW OUTPUT FROM BACKEND:", backend_response.output);
    let res = backend_response.output;

     

    const carousel_inner = document.querySelector(".carousel-inner");
    const indicators = document.querySelector(".carousel-indicators");

    indicators.innerHTML = ""; 
    carousel_inner.innerHTML = "";
   
    res.forEach((recommendation,i) =>{
        const list_item = document.createElement("li");
        list_item.setAttribute("data-bs-slide-to",i)
        list_item.setAttribute("data-bs-target","#carousel");
        const carousel_item = document.createElement("div");

        

        carousel_item.className = "carousel-item"
        if(i===0)
        {
            list_item.classList.add("active");
            carousel_item.classList.add("active");
        }
         indicators.appendChild(list_item);
         carousel_inner.appendChild(carousel_item);
        

        carousel_item.innerHTML = `<div class = "row justify-content-center">
            <div id = "container2" class = "col-md-6 bg-success text-center rounded p-4">
                <p id="response" class = "text-white">${recommendation.recomm_text}</p>
                <br><br>
                <button class = "bg-warning text-black p-1 rounded mb-2 view_full_recomm" id = "view_full_recomm">View Full Recommendation</button>
            </div>
    </div>`
    const container = carousel_item.querySelector(".col-md-6");
    const response =  container.querySelector("#response");
    response.innerHTML = recommendation.recomm_text;
    response.dataset.id = recommendation.id;
    response.dataset.summary = recommendation.recomm_text;

    const button = container.querySelector(".view_full_recomm");
    
    button.addEventListener("click",()=>{
        expand(container,response,button);
    })

    handle_filter_input();



    });


        async function expand(container,response,button){
        let rate_recommendations_button;
        const container_height = container.offsetHeight;
        const container_width = container.offsetWidth;

        button.style.display = "none";

        container.style.width = container_width *2.7 + "px";
        container.style.height = container_height *2.7 + "px";
        container.style.overflowY = "auto"
        container.style.position = "relative";
        container.style.outline = "4px solid black";
        container.style.boxShadow = "0 0 10px black";
 

        const x_button = document.createElement("button")
        x_button.textContent = "X";
        x_button.style.top = 0;
        x_button.style.right = 0;
        x_button.style.position = "absolute";
        if(carousel.contains(left_arrow))
        {
            left_arrow.style.display = "none";
        }
        if(carousel.contains(right_arrow))
        {
            right_arrow.style.display = "none";
        }

        try
        {
            const detailed_summary  =  await fetch("/retrieve_full_summary",
            {
                method: "POST",
                headers:
                {
                    "Content-Type":"application/json"
                },
                credentials: "include",
                body: JSON.stringify
                ({
                    id: Number(response.dataset.id),
                    summary:response.dataset.summary
                })
            })
            const resp = await detailed_summary.json();
            if (!resp.output || typeof resp.output !== "string") 
                { console.warn("Output empty: ", resp); container.innerHTML = "<p>Summary retrieval failure</p>"; return; }
            const lower_output = resp.output.toLowerCase();

            const market_conditions = lower_output.match(/market\s*conditions[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const market_size = lower_output.match(/size\s*of\s*potential\s*market[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const potential_cost = lower_output.match(/potential\s*cost[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const uniqueness = lower_output.match(/uniqueness.*idea[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const sources = lower_output.match(/sources[:\-–]\s*([^\n]+)/i)?.[1] ||
             (/source[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const risk_level =(
                lower_output.match(/overall\s*risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
                lower_output.match(/risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
                lower_output.match(/overall\s*risk[:\-–]\s*([^\n]+)/i)?.[1] ||
                "undefined") + "";





            container.innerHTML = `<h3>Summary</h3>
            <br><br>
            <p>${response.dataset.summary}</p>
            <br><br>
            <h4>Detailed Summary</h4>
            <br><br>
            <label>Market Conditions: </label>
            <p>${market_conditions}</p>
            <br><br>
            <label>Market Size</label>
            <p>${market_size}</p>
            <br><br>
            <label>Potential Cost</label>
            <p>${potential_cost}</p>
            <br><br>
            <label> Uniqueness of Product Idea</label>
            <p>${uniqueness}</p>
            <br><br>
            <label>Sources:</label>
            <p>${sources}</p>
            <label> Risk Grading </label>
            <p id = "risk_level"></p>`;

            const recommendation_id = Number(response.dataset.id);

            if(!container.rate_recommendations_button){
                container.rate_recommendations_button = create_ratings_button();
                handle_ratings_button(recommendation_id,container.rate_recommendations_button,container);
            }
            container.appendChild(x_button);
            container.appendChild(container.rate_recommendations_button);

            
            

            x_button.addEventListener("click",()=>{
                collapse(container,response,container_height,container_width,button);
            });

            document.getElementById("risk_level").textContent = risk_level;
            const risk_grading = document.getElementById("risk_level");
            const string_risk = String(risk_level||"");
            if (string_risk.includes("high")||string_risk.includes("7")||string_risk.includes("8")||string_risk.includes("9"))
            {
                risk_grading.style.color = "red";
            }
            else if(string_risk.includes("medium")||string_risk.includes("4")||string_risk.includes("5")||string_risk.includes("6"))
            {
                risk_grading.style.color = "orange";
            }
            else if(string_risk.includes("low")||string_risk.includes("0")||string_risk.includes("1")||string_risk.includes("2")||string_risk.includes("3"))
            {
                risk_grading.style.color = "aquamarine";
            }
            console.log(resp);
        }
        catch(err)
        {
            console.error("Failed to send summary to the backend, error: ",err);
        }
        function collapse(container,response,container_height,container_width,button){
            container.style.width = container_width + "px";
            container.style.height = container_height  + "px";
            container.style.boxShadow = "";
            container.style.outline  = "";

            container.innerHTML = "";
            container.appendChild(response);
            container.appendChild(button);
            button.style.display = "block";
            right_arrow.style.display = "block";
            left_arrow.style.display = "block";
            button.style.position = "absolute";
            button.style.bottom = "1px";
            button.style.left = "50%";
            container.style.overflowY = "hidden";
            button.style.transform = "translateX(-50%)";
            const numbers = document.querySelector(".carousel-indicators");
            numbers.style.bottom = "-14px";
            if(!carousel.contains(left_arrow))
            {
                carousel.insertBefore(left_arrow,carousel.firstChild);
            }
            if(!carousel.contains(right_arrow))
            {
            carousel.insertBefore(right_arrow,carousel.firstChild);
            }

            x_button.remove();
            container.rate_recommendations_button.remove()
            }
            container.arguments = {container,response,container_height,container_width,button}
            container._collapseFn = collapse;

    }
    // function call for competitor button creation
     const comp_button = create_competitor_button();
     carousel.parentNode.insertBefore(comp_button,carousel);
     comp_button.addEventListener("click",
        handle_click(products,ideas,competitors)
     );
  // remove double quotes from the response
}catch(err)
{
    console.log("Error",err);
}


});
function create_modal()
{
        const modal_div =  document.createElement("div");
        modal_div.classList.add("modal", "fade");
        modal_div.tabIndex = -1;
        modal_div.id = "competitor_modal";
        modal_div.setAttribute("aria-hidden","true");
        const document_div = document.createElement("div");
        document_div.classList.add("modal-dialog", "modal-dialog-centered");
        document_div.setAttribute("role","document");
        modal_div.appendChild(document_div);

        const content_div =  document.createElement("div");
        content_div.classList.add("modal-content");
        document_div.appendChild(content_div);

        const header_div = document.createElement("div");
        header_div.classList.add("modal-header");
        content_div.appendChild(header_div);

        const title = document.createElement("h4");
        title.classList.add("modal-title");
        title.id = "modal_title";
        title.textContent = "Competitor Data";
        header_div.appendChild(title);

        const close_modal_button = document.createElement("button");
        close_modal_button.classList.add("btn-close");
        close_modal_button.setAttribute("data-bs-dismiss","modal");
        close_modal_button.type = "button";
        close_modal_button.ariaLabel = "Close modal";
        header_div.appendChild(close_modal_button);

        const modal_body = document.createElement("div");
        modal_body.classList.add("modal-body");
        
        content_div.appendChild(modal_body);

        document.body.appendChild(modal_div);

        return{modal_body:modal_body,modal:modal_div,title:title};


}
function create_modal_table()
{
    const table =  document.createElement("table");
    table.classList.add("table","w-100","mb-4");
    const product_table = document.createElement("table");
    product_table.classList.add("table","w-100","mb-4");
    const table_row1 =  document.createElement("tr");
    const product_table_row = document.createElement("tr");
    const company_name =  document.createElement("th");
    company_name.textContent = "Company Name";
    const market_position = document.createElement("th");
    market_position.textContent = "Market Position"
    const product_name =  document.createElement("th");
    product_name.textContent = "Product Name";
    const product_price = document.createElement("th");
    product_price.textContent = "Product Price";
    const market_share = document.createElement("th");
    market_share.textContent = "Product Market Share";
    const items_sold = document.createElement("th");
    items_sold.textContent = "Users/Items Sold (Estimated)";
    const categories = document.createElement("th");
    categories.textContent = "Categories";

    table.appendChild(table_row1);
    product_table.appendChild(product_table_row);
    table_row1.appendChild(company_name);
    table_row1.appendChild(market_position);
    product_table_row.appendChild(product_name);
    product_table_row.appendChild(product_price);
    product_table_row.appendChild(market_share);
    product_table_row.appendChild(items_sold);
    product_table_row.appendChild(categories);

    return{ table,product_table };
}
function create_modal_accordion()
{
    const accordion_div = document.createElement("div");

    accordion_div.classList.add("accordion","bg-warning");
    accordion_div.id = "comp-accordion";

    const inner_accordion =  document.createElement("div");
    inner_accordion.id = "inner"
    inner_accordion.classList.add("accordion");
    accordion_div.appendChild(inner_accordion);

    
    return accordion_div;

}
async function populate_modal_accordion(competitor_data_retrieval)
{
    const inner = document.getElementById("inner");
    const header = document.createElement("h3");
    header.textContent = "Product Insights";
    header.classList.add("text-black","text-center","mb-4","mt-4");
    header.id = "accordion_insights_header";
    inner.appendChild(header);
    const lower_output = competitor_data_retrieval.competitor_data.toLowerCase();
    const comps = lower_output.split(/competitor \d+:/) .map(b => b.trim()) .filter(b => b.length > 0);
    let i = 1;
    let product_list = [];

    for( const competitor of comps){
        const products = competitor.split(/product\s*\d*:/).slice(1);

            for( const product of products){
                trimmed_product = product.trim();
                if(!trimmed_product)
                {
                    continue;
                }
                product_list.push(trimmed_product);
            }
        }

                const results = await Promise.all(product_list.map(product => retrieve_accordion_data(product)));
                let ind;

                for(ind = 0;ind < product_list.length;ind++){
                    const trimmed_product = product_list[ind];
                    const product_insights = results[ind];
                    const accordion_item = document.createElement("div");
                    accordion_item.classList.add("accordion-item");

                    const accordion_header =  document.createElement("h2");
                    accordion_header.classList.add("accordion-header");

                    accordion_item.appendChild(accordion_header);

                    const item_button = document.createElement("button");
                    item_button.type = "button";
                    item_button.setAttribute("data-bs-toggle","collapse");
                    item_button.setAttribute("data-bs-target",`#collapse_accord_${i}`);
                    item_button.classList.add("accordion-button","collapsed");
                    item_button.textContent = `Product ${i}`;
                    accordion_header.appendChild(item_button);

                    const collapse_accordion =  document.createElement("div");
                    collapse_accordion.classList.add("accordion-collapse","collapse");
                    collapse_accordion.id = `collapse_accord_${i}`;
                    collapse_accordion.setAttribute("data-bs-parent","#inner");

                    const accordion_body = document.createElement("div");
                    accordion_body.classList.add("accordion-body");
                
                    collapse_accordion.appendChild(accordion_body);
                    accordion_item.appendChild(collapse_accordion);
                
                    inner.appendChild(accordion_item);

                    // extract the strengths from the data returned by the backend
                    // The match() function searches for the strengths text followed by a dash or a colon
                    // Everything up to a newline is captured
                    // undefined is returned if there is no match
                    const strengths = product_insights.match(/Strengths[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
                    // extract the weaknesses
                    const weaknesses = product_insights.match(/Weaknesses[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
                    // extract the source links provided
                    // everything including newlines are captured
                    // stops at the heading of the next section
                    const sources = product_insights.match(/Sources[:\-–]\s*([\s\S]*?)(?=\n[A-Z][a-z]+[:\-–]|$)/i)?.[1].trim() || "";
                    // extract the URL's and match the data with the https:// or http:// substring
                    const urls = sources.match(/https?:\/\/[^\s]+/g) || [];
                    // create clickable links for the urls. The map function creates a new array of href links joined by a breakpoint
                    // fallback message shown if no sources were provided
                    const clickable_sources = urls.length ? urls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join("<br>") : "No sources provided";


                    accordion_body.innerHTML = `
                    <label>Strengths: </label>
                    <p3>${strengths}</p3>
                    <br><br>
                    <label>Weaknesses: </label>
                    <p3>${weaknesses}</p3>
                    <br><br>
                    <label>Sources:</label>
                    <p3>${clickable_sources}</p3>
                    `;
                    i++;
            }
    }

async function retrieve_accordion_data(competitor_product)
{
    try{
        const insights = await fetch("/retrieve_accordion_data",
            {
                method: "POST",
                headers:
                {
                    "Content-Type":"application/json"
                },
                body: JSON.stringify
                (
                {
                    competitor_product: competitor_product
                }
                )
            }
        )
            const insights_response =  await insights.json();
            console.log("Insights response",insights_response);
            return insights_response.insights_data;
    }
    catch(err)
    {
        console.error("failed to retrieve competitor product insights",err);
        return null;
    }
}

async function get_competitor_data(products,ideas,competitors)
{
    try{
        const competitor =  await fetch("/get_competitor_data",
            {
                method: "POST",
                headers:
                {
                    "Content-Type":"application/json"
                },
                body: JSON.stringify
                ({
                    products:products,
                    ideas:ideas,
                    competitors:competitors
                })
            }
        )
        const response = await competitor.json();
        console.log("Response received: ",response);
        return response;
    }
    catch
    {
        console.log("failed to retrieve competitor data");
    }
}

function create_competitor_button()
{
        const view_competitor_button = document.createElement("button");
        view_competitor_button.classList.add("bg-warning","text-black", "p-1", "rounded", "mb-2","view-competitor","mx-auto","d-block");
        view_competitor_button.textContent = "View Competitors";
        return  view_competitor_button
}
function handle_click(products,ideas,competitors)
{
    return async() =>
    {
        create_modal();
        const {table, product_table} = create_modal_table();
        const competitor_data_retrieval = await get_competitor_data(products,ideas,competitors);
        if(!competitor_data_retrieval)
        {
            console.error("competitor data could not be found",competitor_data_retrieval);
            return;
        }
        console.log("COMPETITOR DATA RAW:", competitor_data_retrieval);
        const lower_output = competitor_data_retrieval.competitor_data.toLowerCase();


        const comps = lower_output.split(/competitor \d+:/) .map(b => b.trim()) .filter(b => b.length > 0);

        comps.forEach((competitor,i)=>{
            const competitor_name = competitor.match(/competitor name[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const market_position = competitor.match(/market position[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            const table_row = document.createElement("tr");
            table_row.innerHTML = 
            `<td>${competitor_name}</td>
            <td>${market_position}</td>
            `;
            table.appendChild(table_row);

            const products = competitor.split(/product\s*\d*:/).slice(1);

            products.forEach((product,i)=>{
                trimmed_product = product.trim();
                if(!trimmed_product)
                {
                    return;
                }
               const product_name = product.match(/product name.*?:\s*([^\n]+)/i)?.[1] || "undefined"; 
               const product_price = product.match(/product price.*?:\s*([^\n]+)/i)?.[1] || "undefined"; 
               const market_share = product.match(/product market share.*?:\s*([^\n]+)/i)?.[1] || "undefined"; 
               const items_sold = product.match(/items sold.*?:\s*([^\n]+)/i)?.[1] || "undefined"; 
               const categories = product.match(/categories.*?:\s*([^\n]+)/i)?.[1] || "undefined";
            
                const product_table_row = document.createElement("tr");
                product_table_row.innerHTML = 
                `<td>${product_name}</td>
                 <td>${product_price}</td>
                 <td>${market_share}</td>
                 <td>${items_sold}</td>
                 <td>${categories}</td>
                `;
                product_table.appendChild(product_table_row);

            })

        })
                const modal_body = document.querySelector("#competitor_modal .modal-body");
                modal_body.innerHTML = ""; 
                modal_body.appendChild(table); 
                modal_body.appendChild(product_table);

                 const accord = create_modal_accordion();
                 modal_body.appendChild(accord);

                 populate_modal_accordion(competitor_data_retrieval);

                const modal = document.getElementById("competitor_modal"); 
                const the_modal = new bootstrap.Modal(modal);
                the_modal.show();
    }
}
function handle_filter_input()
{
    const the_items = document.querySelectorAll(".carousel-item");
    const input = document.getElementById("filter");
    const indicators = document.querySelectorAll(".carousel-indicators li")
    input.addEventListener("input",()=>{
        let first_container = null;
        the_items.forEach((rec,i)=>{
            const response = rec.querySelector("#response");
            const response_text = response.textContent.toLowerCase();
            const lowercase_input = input.value.toLowerCase();
            if(response_text.includes(lowercase_input))
            {
                rec.style.display = "";
                indicators[i].style.display = "";
                if(!first_container)
                {
                    first_container = rec;
                }
            }
            else
            {
                rec.style.display = "none";
                indicators[i].style.display = "none";
            }
        })
        const active_item = document.querySelector(".carousel-item.active")
        if(active_item && active_item.style.display == "none")
        {
            active_item.classList.remove("active");
        }
        if(first_container)
        {
            if(active_item){
            active_item.classList.remove("active");
            }
            first_container.classList.add("active");
        }
    })
}
function create_ratings_button()
{
        const rate_recommendations_button = document.createElement("button");
        rate_recommendations_button.classList.add("bg-warning","text-black", "p-1", "rounded", "mb-2","Ratings","mx-auto","d-block");
        rate_recommendations_button.textContent = "Rate Recommendations";
        return  rate_recommendations_button
}
function handle_ratings_button(rec_id,ratings_button,container)
{
    ratings_button.addEventListener("click",()=>{

        if(submitted[rec_id])
        {
            const modal = create_modal();
            modal.modal.id = "rating_modal_" + Math.random();
            modal.modal_body.innerHTML = "Rating already submitted for this recommendation";
            const the_modal = new bootstrap.Modal(modal.modal);
            the_modal.show();
            return;
        }
        const modal = create_modal();
        modal.title.textContent = "Rate Recommendation";
        modal.modal.id = "rating_modal_" + Math.random();
        const modal_body = modal.modal_body;
        const ratings_div = document.createElement("div");
        modal_body.appendChild(ratings_div);

        const ratings_input = create_ratings()

        const ratings_label = document.createElement("label");
        ratings_label.classList.add("form-label");
        ratings_label.textContent = "Your Star Rating";
        ratings_div.appendChild(ratings_label);
        ratings_div.appendChild(ratings_input);



        const feedback_label = document.createElement("label");
        feedback_label.classList.add("form-label");
        feedback_label.textContent =  "Additional Feedback";
        ratings_div.appendChild(feedback_label);
        const feedback_box = document.createElement("textarea");
        feedback_box.classList.add("form-control");
        feedback_box.setAttribute("aria-label","Feedback input box");
        ratings_div.appendChild(feedback_box);
        


        const the_modal = new bootstrap.Modal(modal.modal);
        modal.modal.addEventListener("hidden.bs.modal", () => {
        right_arrow.style.display = "block";
        left_arrow.style.display = "block";

        if (container.arguments && container._collapseFn) {
            container._collapseFn(
                container.arguments.container,
                container.arguments.response,
                container.arguments.container_height,
                container.arguments.container_width,
                container.arguments.button
            );

            container.arguments = null;
            container._collapseFn = null;
        }
});


        the_modal.show();



        $(modal.modal).on("shown.bs.modal",()=>{$("#input-rating").rating({theme: "krajee-fas",showCaption: "false",showClear:"false"})});

        const submit_ratings_button = document.createElement("button");
        submit_ratings_button.classList.add("bg-warning","text-black", "p-1", "rounded", "mb-2","submit-rating","mx-auto","d-block");
        submit_ratings_button.textContent = "Submit Rating";
        modal_body.appendChild(submit_ratings_button);
        submit_ratings_button.addEventListener("click",()=>{
            const feedback_text =  feedback_box.value;
            const star_rating = document.getElementById("input-rating").value;
            if(!star_rating && !feedback_text)
            {
                const error_sentence = document.createElement("p");
                error_sentence.textContent = "Please enter a star rating or feedback";
                modal_body.appendChild(error_sentence);
                return;
            }
            submit_ratings(rec_id,star_rating,feedback_text,modal_body);

        })


    })
}
function create_ratings()
{
        const ratings_input = document.createElement("input");
        ratings_input.classList.add("rating");
        ratings_input.id = `input-rating`;
        ratings_input.setAttribute("data-theme","krajee-fas");
        ratings_input.setAttribute("data-min","0");
        ratings_input.setAttribute("data-max","5");
        ratings_input.setAttribute("data-step","1");
        return ratings_input
}

async function submit_ratings(recommendation_id,rating,feedback_text,modal_body)
{
    try{
        const feedback = await fetch("/post_feedback",{
            method: "POST",
            headers:
            {
                "Content-Type":"application/json"
            },
            body: JSON.stringify
            (
            {
                recommendation_id:recommendation_id,
                star_rating:rating,
                feedback:feedback_text
            }
            )

        })
        const res =  await feedback.json();
        console.log("Feedback data posted successfully: ",res);
        if(res.previously_submitted)
        {
            submitted[recommendation_id] = true;
            modal_body.innerHTML = "Feedback already submitted for this recommendation";
            return;
        }
        modal_body.innerHTML = "Feedback successfully submitted";
        submitted[recommendation_id] = true;
    }
    catch(err)
    {
        console.error("failed to send the ratings to the database",err);
    }
}
