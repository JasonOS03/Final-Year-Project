const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const register_button = document.getElementById("register_button");
const right_arrow = document.getElementById("right_arrow");
const left_arrow = document.getElementById("left_arrow");
const carousel  = document.getElementById("carousel");



const view_buttons = document.querySelectorAll(".view_full_recomm");


document.addEventListener("DOMContentLoaded", async ()=>{
try{
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



    });


        async function expand(container,response,button){
        const container_height = container.offsetHeight;
        const container_width = container.offsetWidth;

        button.style.display = "none";

        container.style.width = container_width *2.7 + "px";
        container.style.height = container_height *2.7 + "px";
        container.style.overflowY = "auto"
        container.style.position = "relative";
        container.style.outline = "4px solid black";
        container.style.boxShadow = "0 0 10px black";

        const view_competitor_button = document.createElement("button");
        view_competitor_button.classList.add("bg-warning", "text-black","p-1", "rounded", "mb-2", "view-competitor");

        view_competitor_button.addEventListener("click",()=>
        {
                create_modal();
                create_modal_table();
        })

        

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

            container.appendChild(x_button);

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
            }

    }
   
     create_competitor_button();
  // remove double quotes from the response
}catch(err)
{
    console.log("failed to retrieve recommendation");
}


});
function create_modal()
{
        const modal_div =  document.createElement("div");
        modal_div.classList.add("modal fade");
        const document_div = document.createElement("div");
        document_div.classList.add("modal-dialog modal-dialog-centered");
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
        close_modal_button.classList.add("close");
        close_modal_button.setAttribute("data-bs-dismiss","modal");
        close_modal_button.type = "button";
        close_modal_button.ariaLabel = "Close modal";
        close_modal_button.textContent = "X";
        header_div.appendChild(close_modal_button);

        const modal_body = document.createElement("div");
        modal_body.classList.add("modal-body");


}
function create_modal_table()
{
    const table =  document.createElement("table");
    const table_row1 =  document.createElement("tr");
    const company_name =  document.createElement("th");
    company_name.textContent = "Company Name";
    const product_name =  document.createElement("th");
    product_name.textContent = "Product Name";
    const product_price = document.createElement("th");
    product_price.textContent = "Product Price";
    const market_share = document.createElement("th");
    market_share.textContent = "Product Market Share";
    const items_sold = document.createElement("th");
    items_sold.textContent = "Users/Items Sold (Estimated)";

    table.appendChild(table_row1);
    table_row1.appendChild(company_name);
    table_row1.appendChild(product_name);
    table_row1.appendChild(product_price);
    table_row1.appendChild(market_share);
    table_row1.appendChild(items_sold);
}
async function get_competitor_data(summary,id)
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
                    id: Number(response.dataset.id),
                    summary:response.dataset.summary
                })
            }
        )
        const response = await competitor.json();
    }
    catch
    {
        console.log("failed to retrieve competitor data");
    }
}

function create_competitor_button()
{
        const view_competitor_button = document.createElement("button");
        view_competitor_button.classList.add("bg-warning text-black p-1 rounded mb-2 view-competitor");
        document.appendChild(view_competitor_button);
        return  view_competitor_button
}
function handle_click(view_competitor_button)
{
    view_competitor_button.addEventListener("click",()=>
    {
        create_modal();
        create_modal_table();
    })
}
