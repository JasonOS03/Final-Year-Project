const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");
const response_container2 = document.getElementById("container2");
const response_container3 = document.getElementById("container3");
const response_text = document.getElementById("response1");
const response_text2 = document.getElementById("response2");
const response_text3 = document.getElementById("response3");
const register_button = document.getElementById("register_button");
const right_arrow = document.getElementById("right_arrow");
const left_arrow = document.getElementById("left_arrow");
const carousel = document.getElementById("carousel");


const containers = [response_container,response_container2,response_container3];
const container_texts = [response_text,response_text2,response_text3];
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
   
  

    for( let i = 0;i<res.length;i++){
        container_texts[i].innerHTML = res[i].recomm_text;
        container_texts[i].dataset.id = res[i].id;
        container_texts[i].dataset.summary = res[i].recomm_text;
    }
    

    

        async function expand(container,i){
        const container_height = container.offsetHeight;
        const container_width = container.offsetWidth;

        const clone_button = view_buttons[i].cloneNode(true)
        clone_button.addEventListener("click",()=>{
            expand(container,i);
        })
        container.style.width = container_width *2.7 + "px";
        container.style.height = container_height *2.7 + "px";
        container.style.overflowY = "auto"
        container.style.position = "relative";
        container.style.outline = "4px solid black";
        container.style.boxShadow = "0 0 10px black";

        if(container.contains(view_buttons[i]))
        {
            view_buttons[i].style.display = "none";
        }
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
                    id: Number(container_texts[i].dataset.id),
                    summary:container_texts[i].dataset.summary
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

            const risk_level =(
                lower_output.match(/overall\s*risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
                lower_output.match(/risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
                lower_output.match(/overall\s*risk[:\-–]\s*([^\n]+)/i)?.[1] ||
                "undefined") + "";





            container.innerHTML = `<h3>Summary</h3>
            <br><br>
            <p>${container_texts[i].dataset.summary}</p>
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
            <label> Risk Grading </label>
            <p id = "risk_level"></p>`;

            container.appendChild(x_button);

            x_button.addEventListener("click",()=>{
                collapse(container);
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
        function collapse(container){
            container.style.width = container_width + "px";
            container.style.height = container_height  + "px";
            container.style.boxShadow = "";
            container.style.outline  = "";

            container.innerHTML = "";
            container.appendChild(container_texts[i]);
            container.appendChild(view_buttons[i]);
            view_buttons[i].style.display = "block";
            view_buttons[i].style.position = "absolute";
            view_buttons[i].style.bottom = "1px";
            view_buttons[i].style.left = "50%";
            container.style.overflowY = "hidden";
            view_buttons[i].style.transform = "translateX(-50%)";
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

        x_button.addEventListener("click",()=>{

            collapse(container);
        });
    }
    containers.forEach((container,i)=>{
        view_buttons[i].addEventListener("click",()=>{
            expand(container,i);
        });

    });
   


 
  // remove double quotes from the response
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

