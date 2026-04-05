// Cache the page elements once so the rest of the script can reuse them.
const user_form = document.getElementById("prompt_form");
const input = document.getElementById("promptbox");
const register_button = document.getElementById("register_button");
const right_arrow = document.getElementById("right_arrow");
const left_arrow = document.getElementById("left_arrow");
const carousel = document.getElementById("carousel");
const insights_cache = new Map();
let submitted = {};

// Pull helper functions from the separate helper file to keep this page script focused on page flow.
const {
    createCompetitorButton,
    createRegenerateButton,
    handleRegenerateClick,
    handleClick,
    handleFilterInput,
    createRatingsButton,
    handleRatingsButton,
    createSpinner,
    createProgressBar,
    parseDetailedSummary,
    applyRiskLevelColor
} = window.HomepageHelpers;

// Show a one-time success toast when the user lands here after updating their profile.
const update_params = new URLSearchParams(window.location.search);
if (update_params.get("updated") === "true") {
    showToast("You have updated your profile successfully! Here are your revised recommendations.");
    setTimeout(() => {
        const toast = document.querySelector(".toast");
        if (toast) {
            toast.classList.remove("show");
            toast.remove();
        }
    }, 6000);
}

// Load the recommendation data and build the carousel once the page is ready.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const get_submitted_feedback = await fetch("/retrieve_feedback_status", {
            credentials: "include"
        });
        const feedback_data = await get_submitted_feedback.json();

        // Convert the list of submitted recommendation ids into a quick lookup object.
        submitted = {};
        feedback_data.submitted_response.forEach(rec_id => {
            submitted[rec_id] = true;
        });

        // Fetch the profile details used by the competitor and regenerate actions.
        const retrieve_data = await fetch("/retrieve_details", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        const retrieval_response = await retrieve_data.json();
        // `/retrieve_details` returns saved competitors under `user_entered_competitors`.
        const competitors = retrieval_response.user_entered_competitors || [];
        const ideas = retrieval_response.ideas;
        const products = retrieval_response.products;

        // Fetch the latest saved recommendations for the current user.
        const retrieval = await fetch("/retrieve-recommendations", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        const backend_response = await retrieval.json();
        console.log("RAW OUTPUT FROM BACKEND:", backend_response.output);
        const recommendations = backend_response.output;

        const carousel_inner = document.querySelector(".carousel-inner");
        const indicators = document.querySelector(".carousel-indicators");

        indicators.innerHTML = "";
        carousel_inner.innerHTML = "";

        recommendations.forEach((recommendation, index) => {
            const list_item = document.createElement("li");
            list_item.setAttribute("data-bs-slide-to", index);
            list_item.setAttribute("data-bs-target", "#carousel");

            const carousel_item = document.createElement("div");
            carousel_item.className = "carousel-item";

            if (index === 0) {
                list_item.classList.add("active");
                carousel_item.classList.add("active");
            }

            indicators.appendChild(list_item);
            carousel_inner.appendChild(carousel_item);

            // Build the compact recommendation card shown inside the carousel.
            carousel_item.innerHTML = `<div class = "row justify-content-center">
            <div class = " recomm_card col-md-6 bg-success text-center rounded p-4">
                <p id="response" class = "text-white">${recommendation.recomm_text}</p>
                <br><br>
                <button class = "bg-warning text-black p-1 rounded mb-2 view_full_recomm" id = "view_full_recomm">View Full Recommendation</button>
            </div>
    </div>`;

            const container = carousel_item.querySelector(".col-md-6");
            const response = container.querySelector("#response");
            response.innerHTML = recommendation.recomm_text;
            response.dataset.id = recommendation.id;
            response.dataset.summary = recommendation.recomm_text;

            const button = container.querySelector(".view_full_recomm");
            button.addEventListener("click", () => {
                expand(container, response, button);
            });
        });

        handleFilterInput();

        // Expand a recommendation card and fetch the full summary the first time it is opened.
        async function expand(container, response, button) {
            // Save the compact card size so the collapse action can restore it exactly.
            const container_height = container.offsetHeight;
            const container_width = container.offsetWidth;
            const original_button_text = button.textContent;

            button.setAttribute("aria-expanded", "true");
            button.disabled = true;
            button.textContent = "Loading...";
            button.style.display = "none";

            // Resize the compact card into a larger scrollable detail panel.
            container.style.width = container_width * 2.7 + "px";
            container.style.height = container_height * 2.7 + "px";
            container.style.overflowY = "auto";
            container.style.position = "relative";
            container.style.outline = "4px solid black";
            container.style.boxShadow = "0 0 10px black";
            container.setAttribute("aria-live", "polite");

            const x_button = document.createElement("button");
            x_button.textContent = "X";
            x_button.setAttribute("aria-label", "Collapse the recommendation");
            x_button.style.top = 0;
            x_button.style.right = 0;
            x_button.style.position = "absolute";

            if (carousel.contains(left_arrow)) {
                left_arrow.style.display = "none";
            }
            if (carousel.contains(right_arrow)) {
                right_arrow.style.display = "none";
            }

            // If the full summary was already loaded before, reuse the cached HTML immediately.
            if (container.dataset.fullSummaryLoaded === "true") {
                container.innerHTML = container.cachedFullSummaryHTML;
                container.appendChild(x_button);
                if (container.rate_recommendations_button) {
                    container.appendChild(container.rate_recommendations_button);
                }
                return;
            }

            const spinner = createSpinner();
            const spinner_span = spinner.querySelector(".visually-hidden");
            spinner_span.textContent = "retrieving detailed summary...";
            container.appendChild(spinner);
            const spinner_icon = spinner.querySelector(".spinner-border");
            spinner_icon.classList.remove("text-success");
            spinner_icon.classList.add("text-warning");

            await new Promise(requestAnimationFrame);
            let progress_div = null;
            let interval = null;

            // Clear the simulated loading bar once the request has finished or failed.
            const remove_progress_bar = () => {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }
                if (progress_div instanceof Node && progress_div.parentNode === container) {
                    container.removeChild(progress_div);
                }
            };

            try {
                if (container.dataset.fullSummaryLoaded === "true") {
                    container.innerHTML = container.cachedFullSummaryHTML;
                    container.appendChild(x_button);
                    container.appendChild(container.rate_recommendations_button);
                    return;
                }

                container.dataset.fullSummaryLoaded = "true";
                const [progress, div] = createProgressBar();
                progress_div = div;
                container.appendChild(progress_div);

                let percentage_value = 0;
                interval = setInterval(() => {
                    if (percentage_value < 95) {
                        percentage_value += Math.random() * 10;
                        progress.style.width = percentage_value + "%";
                    }
                }, 200);

                const detailed_summary = await fetch("/retrieve_full_summary", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        id: Number(response.dataset.id),
                        summary: response.dataset.summary
                    })
                });

                clearInterval(interval);
                progress.style.width = "100%";

                const resp = await detailed_summary.json();
                spinner.remove();

                if (!resp.output || typeof resp.output !== "string") {
                    console.warn("Output empty: ", resp);
                    container.innerHTML = "<p>Summary retrieval failure</p>";
                    return;
                }

                // Pull each named section out of the generated long-form summary.
                const {
                    marketConditions,
                    marketSize,
                    potentialCost,
                    uniqueness,
                    clickableSources,
                    riskLevel
                } = parseDetailedSummary(resp.output);

                container.innerHTML = `<h3>Summary</h3>
            <br><br>
            <p>${response.dataset.summary}</p>
            <br><br>
            <h4>Detailed Summary</h4>
            <br><br>
            <label>Market Conditions: </label>
            <p>${marketConditions}</p>
            <br><br>
            <label>Market Size</label>
            <p>${marketSize}</p>
            <br><br>
            <label>Potential Cost</label>
            <p>${potentialCost}</p>
            <br><br>
            <label> Uniqueness of Product Idea</label>
            <p>${uniqueness}</p>
            <br><br>
            <label>Sources:</label>
            <p>${clickableSources}</p>
            <label> Risk Grading </label>
            <p id = "risk_level"></p>`;

                container.cachedFullSummaryHTML = container.innerHTML;

                const recommendation_id = Number(response.dataset.id);
                if (!container.rate_recommendations_button) {
                    container.rate_recommendations_button = createRatingsButton();
                    handleRatingsButton(recommendation_id, container.rate_recommendations_button, container, {
                        submitted,
                        rightArrow: right_arrow,
                        leftArrow: left_arrow
                    });
                }

                container.appendChild(x_button);
                container.appendChild(container.rate_recommendations_button);

                x_button.addEventListener("click", () => {
                    collapse(container, response, container_height, container_width, button);
                });

                document.getElementById("risk_level").textContent = riskLevel;
                const risk_grading = document.getElementById("risk_level");
                applyRiskLevelColor(riskLevel, risk_grading);

                console.log(resp);
                remove_progress_bar();
            } catch (err) {
                console.error("Failed to send summary to the backend, error: ", err);
                window.showActionStatus("Failed to retrieve the detailed summary.", "error");
                spinner.remove();
                remove_progress_bar();
                button.style.display = "block";
                button.disabled = false;
                button.textContent = original_button_text;
                carousel.cycle();
            }

            // Restore the card to its original compact state inside the carousel.
            function collapse(container, response, container_height, container_width, button) {
                container.style.width = container_width + "px";
                container.style.height = container_height + "px";
                container.style.boxShadow = "";
                container.style.outline = "";

                container.innerHTML = "";
                container.appendChild(response);
                container.appendChild(button);
                button.style.display = "block";
                button.setAttribute("aria-expanded", "false");
                right_arrow.style.display = "block";
                left_arrow.style.display = "block";
                button.style.position = "absolute";
                button.style.bottom = "1px";
                button.style.left = "50%";
                container.style.overflowY = "hidden";
                button.style.transform = "translateX(-50%)";

                const numbers = document.querySelector(".carousel-indicators");
                numbers.style.bottom = "-14px";

                if (!carousel.contains(left_arrow)) {
                    carousel.insertBefore(left_arrow, carousel.firstChild);
                }
                if (!carousel.contains(right_arrow)) {
                    carousel.insertBefore(right_arrow, carousel.firstChild);
                }

                container.dataset.fullSummaryLoaded = "false";
                button.style.display = "block";
                button.disabled = false;
                button.textContent = "View Full Recommendation";
                button.setAttribute("aria-expanded", "false");

                x_button.remove();
                if (container.rate_recommendations_button) {
                    container.rate_recommendations_button.remove();
                }
            }

            container.arguments = { container, response, container_height, container_width, button };
            container._collapseFn = collapse;
        }

        // Add the competitor and regenerate buttons once the recommendations are on screen.
        const comp_button = createCompetitorButton();
        carousel.after(comp_button);
        comp_button.addEventListener("click", handleClick(products, ideas, competitors, insights_cache));

        const regen_button = createRegenerateButton();
        comp_button.after(regen_button);
        regen_button.addEventListener("click", handleRegenerateClick);
    } catch (err) {
        console.log("Error", err);
    }
});
