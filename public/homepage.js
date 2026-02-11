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
        container.style.position = "relative";
        container.style.outline = "4px solid black";
        container.style.boxShadow = "0 0 10px black";

        if(container.contains(view_buttons[i]))
        {
        container.removeChild(view_buttons[i]);
        }
        const x_button = document.createElement("button")
        x_button.textContent = "X";
        x_button.style.top = 0;
        x_button.style.right = 0;
        x_button.style.position = "absolute";
        if(carousel.contains(left_arrow))
        {
            carousel.removeChild(left_arrow);
        }
        if(carousel.contains(right_arrow))
        {
        carousel.removeChild(right_arrow);
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
                    id: container_texts[i].dataset.id
                })
            })
            const resp = await detailed_summary.json();
            const lower_output = resp.output[i].toLowerCase();
            const risk_level = lower_output.match(/risk\s*level[:\--]\s*(.*)/i)?.[1] || "undefined";
            const market_conditions = lower_output.match(/market\s*conditions[:\--]\s*(.*)/i)?.[1] || "undefined";
            const market_size = lower_output.match(/size\s*of\s*potential\s*market[:\--]\s*(.*)/i)?.[1] || "undefined";
            const potential_cost = lower_output.match(/potential\s*cost[:\--]\s*(.*)/i)?.[1] || "undefined";

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
            <br><br>`;
            console.log(resp);
            container.appendChild(x_button);
        }
        catch
        {
            console.log("Failed to send summary to the backend");
        }
        function collapse(container,clone_button){
            container.style.width = container_width + "px";
            container.style.height = container_height  + "px";
            container.style.boxShadow = "";
            container.style.outline  = "";

            container.innerHTML = "";
            container.appendChild(container_texts[i]);
            container.appendChild(clone_button);
            clone_button.style.position = "absolute";
            clone_button.style.bottom = "1px";
            clone_button.style.left = "50%";
            clone_button.style.transform = "translateX(-50%)";
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

            collapse(container,clone_button);
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

