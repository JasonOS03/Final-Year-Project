const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const response_container = document.getElementById("container");
const response_text = document.getElementById("response");
const register_button = document.getElementById("register_button");
const view_full_button = document.getElementById("view_full_recomm");


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
    while(typeof res === "string")
    {
        res = JSON.parse(res);
    }
    const message = res?.choices?.[0]?.message; 
    const response_content = message.reasoning_details?.[0]?.summary?.trim() || message.reasoning?.trim() || message.content?.trim();
    response_text.innerHTML = response_content.trim().replace(/"/g, "");
    response_text.dataset.summary = response_content.trim().replace(/"/g, "");

    view_full_button.addEventListener("click",async ()=>{
        const container = document.getElementById("container");
        const container_height = container.offsetHeight;
        const container_width = container.offsetWidth;
        container.style.width = container_width *2.7 + "px";
        container.style.height = container_height *2.7 + "px";
        container.style.position = "relative";
        container.style.outline = "4px solid black";
        container.style.boxShadow = "0 0 10px black";
        container.removeChild(view_full_button);
        const x_button = document.createElement("button")
        x_button.textContent = "X";
        container.appendChild(x_button);
        x_button.style.top = 0;
        x_button.style.right = 0;
        x_button.style.position = "absolute";

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
                    summary: response_text.dataset.summary
                })
            })
            const resp = await detailed_summary.json();
            const lower_output = resp.output.toLowerCase();
            const risk_level = lower_output.split("risk level:")[1]?.trim() ||"Risk level: undefined";
            const market_size = lower_output.split("size of potential market:")[1]?.trim() ||"Size of Market: undefined";
            const market_conditions = lower_output.split("market conditions:")[1]?.trim() || "Market Conditions: undefined";
            const potential_cost = lower_output.split("potential cost:")[1]?.trim() || "Cost: undefined";
            response_container.innerHTML = `<h3>Summary</h3>
            <br><br>
            <p>${response_text.dataset.summary}</p>
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
        }
        catch
        {
            console.log("Failed to send summary to the backend");
        }

        x_button.addEventListener("click",()=>{
            container.style.width = container_width + "px";
            container.style.height = container_height + "px";
            container.style.boxShadow = "";
            container.style.outline  = "";
            container.appendChild(view_full_button);

            x_button.remove();
        })

    }) // remove double quotes from the response
}catch(err)
{
    console.log("failed to retrieve recommendation");
}

});

