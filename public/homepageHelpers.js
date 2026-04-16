(function attachHomepageHelpers() {
    // Cache competitor data in memory so the modal can reopen without repeating the same request.
    let cachedCompetitorResponse = null;

    function createModal() {
        // Remove any old modal first so Bootstrap always works with a fresh modal element.
        const triggerElement = document.activeElement;
        const existingModal = document.getElementById("competitor_modal");

        if (existingModal) {
            existingModal.remove();
        }

        const modalDiv = document.createElement("div");
        modalDiv.classList.add("modal", "fade");
        modalDiv.tabIndex = -1;
        modalDiv.id = "competitor_modal";
        modalDiv.setAttribute("aria-hidden", "true");
        modalDiv.setAttribute("aria-modal", "true");
        modalDiv.setAttribute("role", "dialog");

        const documentDiv = document.createElement("div");
        documentDiv.classList.add("modal-dialog", "modal-dialog-centered");
        documentDiv.setAttribute("role", "document");
        documentDiv.classList.add("competitor-modal-dialog");
        modalDiv.appendChild(documentDiv);

        const contentDiv = document.createElement("div");
        contentDiv.classList.add("modal-content");
        documentDiv.appendChild(contentDiv);

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("modal-header");
        contentDiv.appendChild(headerDiv);

        const title = document.createElement("h4");
        title.classList.add("modal-title");
        title.id = "modal_title";
        title.textContent = "Competitor Data";
        headerDiv.appendChild(title);

        const closeModalButton = document.createElement("button");
        closeModalButton.classList.add("btn-close");
        closeModalButton.setAttribute("data-bs-dismiss", "modal");
        closeModalButton.type = "button";
        closeModalButton.ariaLabel = "Close modal";
        headerDiv.appendChild(closeModalButton);

        const modalBody = document.createElement("div");
        modalBody.classList.add("modal-body");
        contentDiv.appendChild(modalBody);

        document.body.appendChild(modalDiv);
        window.enhanceModalAccessibility(modalDiv, triggerElement);

        return { modal_body: modalBody, modal: modalDiv, title };
    }

    function createModalTable() {
        // Build separate tables for competitor-level and product-level data inside the modal.
        const table = document.createElement("table");
        table.classList.add("table", "w-100", "mb-4", "competitor-modal-table");

        const productTable = document.createElement("table");
        productTable.classList.add("table", "w-100", "mb-4", "competitor-modal-table");

        const tableRow = document.createElement("tr");
        const productTableRow = document.createElement("tr");

        const companyName = document.createElement("th");
        companyName.textContent = "Company Name";

        const marketPosition = document.createElement("th");
        marketPosition.textContent = "Market Position";

        const competitorProductOwner = document.createElement("th");
        competitorProductOwner.textContent = "Competitor";

        const productName = document.createElement("th");
        productName.textContent = "Product Name";

        const productPrice = document.createElement("th");
        productPrice.textContent = "Product Price";

        const marketShare = document.createElement("th");
        marketShare.textContent = "Product Market Share";

        const itemsSold = document.createElement("th");
        itemsSold.textContent = "Users/Items Sold (Estimated)";

        const categories = document.createElement("th");
        categories.textContent = "Categories";

        table.appendChild(tableRow);
        productTable.appendChild(productTableRow);
        tableRow.appendChild(companyName);
        tableRow.appendChild(marketPosition);
        productTableRow.appendChild(competitorProductOwner);
        productTableRow.appendChild(productName);
        productTableRow.appendChild(productPrice);
        productTableRow.appendChild(marketShare);
        productTableRow.appendChild(itemsSold);
        productTableRow.appendChild(categories);

        return { table, product_table: productTable };
    }

    function createModalAccordion() {
        // Create the accordion container used for product insight sections.
        const accordionDiv = document.createElement("div");
        accordionDiv.classList.add("accordion", "bg-warning");
        accordionDiv.id = "comp-accordion";

        const innerAccordion = document.createElement("div");
        innerAccordion.id = "inner";
        innerAccordion.classList.add("accordion");
        accordionDiv.appendChild(innerAccordion);

        return accordionDiv;
    }

    async function populateModalAccordion(competitorDataRetrieval, retrieveAccordionData) {
        // Build one accordion section per unique competitor product.
        const inner = document.getElementById("inner");
        const header = document.createElement("h3");
        header.textContent = "Product Insights";
        header.classList.add("text-black", "text-center", "mb-4", "mt-4");
        header.id = "accordion_insights_header";
        inner.appendChild(header);

        let sectionIndex = 1;
        const productList = Array.isArray(competitorDataRetrieval.competitor_data)
            ? competitorDataRetrieval.competitor_data
                .map(competitor => competitor?.product?.product_name || "")
                .filter(productName => productName.trim().length > 0)
            : [];

        // Remove duplicate product names so each insight section only appears once.
        const uniqueProducts = Array.from(new Set(productList));
        const results = await Promise.all(uniqueProducts.map(product => retrieveAccordionData(product)));

        for (let index = 0; index < uniqueProducts.length; index++) {
            const productInsights = results[index];
            if (typeof productInsights !== "string") {
                continue;
            }

            const accordionItem = document.createElement("div");
            accordionItem.classList.add("accordion-item");

            const accordionHeader = document.createElement("h2");
            accordionHeader.classList.add("accordion-header");
            accordionItem.appendChild(accordionHeader);

            const itemButton = document.createElement("button");
            itemButton.type = "button";
            itemButton.setAttribute("data-bs-toggle", "collapse");
            itemButton.setAttribute("data-bs-target", `#collapse_accord_${sectionIndex}`);
            itemButton.classList.add("accordion-button", "collapsed");
            itemButton.textContent = uniqueProducts[index];
            accordionHeader.appendChild(itemButton);

            const collapseAccordion = document.createElement("div");
            collapseAccordion.classList.add("accordion-collapse", "collapse");
            collapseAccordion.id = `collapse_accord_${sectionIndex}`;
            collapseAccordion.setAttribute("data-bs-parent", "#inner");

            const accordionBody = document.createElement("div");
            accordionBody.classList.add("accordion-body");
            collapseAccordion.appendChild(accordionBody);
            accordionItem.appendChild(collapseAccordion);
            inner.appendChild(accordionItem);

            // Extract the strengths from the data returned by the backend
            // Search for the strenghts text followed by a dash or colon
            // everything up to a newline is captured
            // undefined is returned if there is no match
            const strengths = productInsights.match(/Strengths[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            // extract the weaknesses
            const weaknesses = productInsights.match(/Weaknesses[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
            // extract the source links provided, with everything including newlines captured
            const sources = productInsights.match(/Sources[:\-–]\s*([\s\S]*?)(?=\n[A-Z][a-z]+[:\-–]|$)/i)?.[1]?.trim() ||
                productInsights.match(/Sources[:\-–]\s*(.+)/i)?.[1] ||
                "";
            // extract the URL's and match the data with the http:// or https:// substring   
            const urls = sources.match(/https?:\/\/\S+/g) || [];
            // create clickable links for the urls
            const clickableSources = urls.length > 0 
                // create a new array of href links from the urls
                ? urls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join("<br>")
                : sources && sources.length > 0
                    ? sources
                    : "No sources provided"; // fallback message if no sources were provided

            accordionBody.innerHTML = `
                    <label>Strengths: </label>
                    <p3>${strengths}</p3>
                    <br><br>
                    <label>Weaknesses: </label>
                    <p3>${weaknesses}</p3>
                    <br><br>
                    <label>Sources:</label>
                    <p3>${clickableSources}</p3>
                    `;

            sectionIndex++;
        }
    }

    async function retrieveAccordionData(competitorProduct, insightsCache) {
        // Return cached accordion insight data when it already exists for this product.
        if (insightsCache.has(competitorProduct)) {
            return insightsCache.get(competitorProduct);
        }

        try {
            const insights = await fetch("/retrieve_accordion_data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    competitor_product: competitorProduct
                })
            });

            const insightsResponse = await insights.json();
            console.log("Insights response", insightsResponse);
            insightsCache.set(competitorProduct, insightsResponse.insights_data);
            return insightsResponse.insights_data;
        } catch (err) {
            console.error("failed to retrieve competitor product insights", err);
            return null;
        }
    }

    async function getCompetitorData(products, ideas, competitors) {
        // Reuse the existing competitor modal data after the first successful fetch.
        if (cachedCompetitorResponse) {
            return cachedCompetitorResponse;
        }

        try {
            // Convert saved competitor objects into the plain competitor-name array the backend expects.
            const normalizedCompetitors = Array.isArray(competitors)
                ? competitors
                    .map(competitor => {
                        if (typeof competitor === "string") {
                            return competitor;
                        }
                        if (competitor && typeof competitor === "object") {
                            return competitor.competitor || competitor.name || "";
                        }
                        return "";
                    })
                    .filter(name => typeof name === "string" && name.trim().length > 0)
                : [];

            const competitor = await fetch("/get_competitor_data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    products,
                    ideas,
                    competitors: normalizedCompetitors
                })
            });

            const response = await competitor.json();
            console.log("Response received: ", response);

            if (!competitor.ok || !Array.isArray(response.competitor_data)) {
                console.error("Invalid competitor response", response);
                return undefined;
            }

            cachedCompetitorResponse = response;
            return response;
        } catch {
            console.log("failed to retrieve competitor data");
            return undefined;
        }
    }

    function createCompetitorButton() {
        // Create the action button that opens the competitor modal.
        const viewCompetitorButton = document.createElement("button");
        viewCompetitorButton.classList.add("bg-warning", "text-black", "p-1", "rounded", "mb-2", "view-competitor", "mx-auto", "d-block", "mt-4");
        viewCompetitorButton.textContent = "View Competitors";
        return viewCompetitorButton;
    }

    function createRegenerateButton() {
        // Create the action button that requests a fresh recommendation set.
        const regenerateButton = document.createElement("button");
        regenerateButton.classList.add("bg-info", "text-dark", "p-1", "rounded", "mb-2", "regenerate-recommendations", "mx-auto", "d-block");
        regenerateButton.textContent = "Regenerate Recommendations";
        return regenerateButton;
    }

    async function handleRegenerateClick() {
        // Disable the button while the backend creates a new recommendation set.
        const regenerateButton = this;
        const originalButtonText = regenerateButton.textContent;
        regenerateButton.disabled = true;
        regenerateButton.textContent = "Regenerating...";

        const spinner = createSpinner();
        const span = spinner.querySelector(".visually-hidden");
        span.textContent = "Regenerating the Recommendations";
        document.body.appendChild(spinner);

        try {
            const response = await fetch("/regenerate-recommendations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });

            const result = await response.json();

            if (!response.ok) {
                window.showActionStatus("Failed to regenerate recommendations.", "error");
                const errorModal = createModal();
                errorModal.title.textContent = "Regeneration Failed";
                errorModal.modal_body.innerHTML = "Failed to regenerate recommendations.";
                const theModal = new bootstrap.Modal(errorModal.modal);
                theModal.show();
                spinner.remove();
                regenerateButton.disabled = false;
                regenerateButton.textContent = originalButtonText;
                return;
            }

            console.log("Recommendations regenerated successfully:", result);
            window.showActionStatus("Recommendations regenerated successfully.", "success");

            setTimeout(() => {
                location.reload();
            }, 2000);

            spinner.remove();
        } catch (err) {
            console.error("Error regenerating recommendations:", err);
            window.showActionStatus("An error occurred while regenerating recommendations.", "error");
            spinner.remove();
            const errorModal = createModal();
            errorModal.title.textContent = "Error";
            errorModal.modal_body.innerHTML = "<p>An error occurred while regenerating recommendations. Please try again.</p>";
            const theModal = new bootstrap.Modal(errorModal.modal);
            theModal.show();
            regenerateButton.disabled = false;
            regenerateButton.textContent = originalButtonText;
        }
    }

    function handleClick(products, ideas, competitors, insightsCache) {
        return async function competitorButtonHandler() {
            // Load competitor data, build the modal content, and then show the modal.
            const competitorButton = this;
            const originalButtonText = competitorButton.textContent;
            competitorButton.disabled = true;
            competitorButton.textContent = "Loading...";

            try {
                createModal();
                const { table, product_table } = createModalTable();
                const competitorDataRetrieval = await getCompetitorData(products, ideas, competitors);

                if (!competitorDataRetrieval) {
                    console.error("competitor data could not be found", competitorDataRetrieval);
                    window.showActionStatus("Unable to load competitor data.", "error");
                    return;
                }

                console.log("COMPETITOR DATA RAW:", competitorDataRetrieval);
                if (!Array.isArray(competitorDataRetrieval.competitor_data)) {
                    window.showActionStatus("Unable to load competitor data.", "error");
                    return;
                }
                competitorDataRetrieval.competitor_data.forEach(competitor => {
                    const competitorName = competitor.competitor_name || "undefined";
                    const marketPosition = competitor.market_position || "undefined";

                    const tableRow = document.createElement("tr");
                    tableRow.innerHTML = `
            <td>${competitorName}</td>
            <td>${marketPosition}</td>
            `;
                    table.appendChild(tableRow);

                    const product = competitor.product || {};
                    const productTableRow = document.createElement("tr");
                    productTableRow.innerHTML = `
                 <td>${competitorName}</td>
                 <td>${product.product_name || "undefined"}</td>
                 <td>${product.product_price || "undefined"}</td>
                 <td>${product.market_share || "undefined"}</td>
                 <td>${product.items_sold || "undefined"}</td>
                 <td>${Array.isArray(product.categories) ? product.categories.join(", ") : "undefined"}</td>
                `;
                    product_table.appendChild(productTableRow);
                });

                const modalBody = document.querySelector("#competitor_modal .modal-body");
                modalBody.innerHTML = "";

                const competitorHeader = document.createElement("h5");
                competitorHeader.textContent = "Competitor Overview";
                competitorHeader.classList.add("mb-3", "bg-primary", "text-white", "p-2", "rounded");

                const productHeader = document.createElement("h5");
                productHeader.textContent = "Competitor Products";
                productHeader.classList.add("mb-3", "mt-4", "bg-success", "text-white", "p-2", "rounded");

                modalBody.appendChild(competitorHeader);
                modalBody.appendChild(table);
                modalBody.appendChild(productHeader);
                modalBody.appendChild(product_table);

                const accordion = createModalAccordion();
                modalBody.appendChild(accordion);

                await populateModalAccordion(
                    competitorDataRetrieval,
                    product => retrieveAccordionData(product, insightsCache)
                );

                const modal = document.getElementById("competitor_modal");
                const theModal = new bootstrap.Modal(modal);
                theModal.show();
            } finally {
                competitorButton.disabled = false;
                competitorButton.textContent = originalButtonText;
            }
        };
    }

    function handleFilterInput() {
        // Filter the visible carousel items as the user types in the search box.
        const carouselItems = document.querySelectorAll(".carousel-item");
        const filterInput = document.getElementById("filter");
        const indicators = document.querySelectorAll(".carousel-indicators li");

        filterInput.addEventListener("input", () => {
            let firstVisibleItem = null;

            carouselItems.forEach((recommendationCard, index) => {
                const response = recommendationCard.querySelector("#response");
                const responseText = response.textContent.toLowerCase();
                const lowercaseInput = filterInput.value.toLowerCase();

                if (responseText.includes(lowercaseInput)) {
                    recommendationCard.style.display = "";
                    indicators[index].style.display = "";
                    if (!firstVisibleItem) {
                        firstVisibleItem = recommendationCard;
                    }
                } else {
                    recommendationCard.style.display = "none";
                    indicators[index].style.display = "none";
                }
            });

            const activeItem = document.querySelector(".carousel-item.active");
            if (activeItem && activeItem.style.display === "none") {
                activeItem.classList.remove("active");
            }

            if (firstVisibleItem) {
                if (activeItem) {
                    activeItem.classList.remove("active");
                }
                firstVisibleItem.classList.add("active");
            }
        });
    }

    function createRatingsButton() {
        // Create the button that opens the rating modal for a recommendation.
        const rateRecommendationsButton = document.createElement("button");
        rateRecommendationsButton.classList.add("bg-warning", "text-black", "p-1", "rounded", "mb-2", "Ratings", "mx-auto", "d-block");
        rateRecommendationsButton.textContent = "Rate Recommendations";
        return rateRecommendationsButton;
    }

    function handleRatingsButton(recId, ratingsButton, container, state) {
        ratingsButton.addEventListener("click", () => {
            // Prevent duplicate feedback submissions for the same recommendation.
            if (state.submitted[recId]) {
                const modal = createModal();
                modal.modal.id = "rating_modal_" + Math.random();
                modal.modal_body.innerHTML = "Rating already submitted for this recommendation";
                const theModal = new bootstrap.Modal(modal.modal);
                theModal.show();
                return;
            }

            const modal = createModal();
            modal.title.textContent = "Rate Recommendation";
            modal.modal.id = "rating_modal_" + Math.random();
            const modalBody = modal.modal_body;
            const ratingsDiv = document.createElement("div");
            modalBody.appendChild(ratingsDiv);

            const ratingsInput = createRatings();

            const ratingsLabel = document.createElement("label");
            ratingsLabel.classList.add("form-label");
            ratingsLabel.textContent = "Your Star Rating";
            ratingsDiv.appendChild(ratingsLabel);
            ratingsDiv.appendChild(ratingsInput);

            const feedbackLabel = document.createElement("label");
            feedbackLabel.classList.add("form-label");
            feedbackLabel.textContent = "Additional Feedback";
            ratingsDiv.appendChild(feedbackLabel);

            const feedbackBox = document.createElement("textarea");
            feedbackBox.classList.add("form-control");
            feedbackBox.setAttribute("aria-label", "Feedback input box");
            ratingsDiv.appendChild(feedbackBox);

            const theModal = new bootstrap.Modal(modal.modal);
            modal.modal.addEventListener("hidden.bs.modal", () => {
                state.rightArrow.style.display = "block";
                state.leftArrow.style.display = "block";
                ratingsButton.focus();

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

            theModal.show();

            $(modal.modal).on("shown.bs.modal", () => {
                $("#input-rating").rating({ theme: "krajee-fas", showCaption: "false", showClear: "false" });
            });

            const submitRatingsButton = document.createElement("button");
            submitRatingsButton.classList.add("bg-warning", "text-black", "p-1", "rounded", "mb-2", "submit-rating", "mx-auto", "d-block");
            submitRatingsButton.textContent = "Submit Rating";
            modalBody.appendChild(submitRatingsButton);

            submitRatingsButton.addEventListener("click", () => {
                // Require at least one piece of feedback before sending the request.
                const feedbackText = feedbackBox.value;
                const starRating = document.getElementById("input-rating").value;

                if (!starRating && !feedbackText) {
                    const errorSentence = document.createElement("p");
                    errorSentence.textContent = "Please enter a star rating or feedback";
                    modalBody.appendChild(errorSentence);
                    return;
                }

                submitRatings(recId, starRating, feedbackText, modalBody, state.submitted);
            });
        });
    }

    function createRatings() {
        // Create the star-rating input used by the Bootstrap rating plugin.
        const ratingsInput = document.createElement("input");
        ratingsInput.classList.add("rating");
        ratingsInput.id = "input-rating";
        ratingsInput.setAttribute("data-theme", "krajee-fas");
        ratingsInput.setAttribute("data-min", "0");
        ratingsInput.setAttribute("data-max", "5");
        ratingsInput.setAttribute("data-step", "1");
        ratingsInput.setAttribute("aria-label", "rating from 0-5 stars");
        return ratingsInput;
    }

    async function submitRatings(recommendationId, rating, feedbackText, modalBody, submitted) {
        // Send the chosen rating and optional text feedback to the backend.
        try {
            const feedback = await fetch("/post_feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    recommendation_id: recommendationId,
                    star_rating: rating,
                    feedback: feedbackText
                })
            });

            const response = await feedback.json();
            console.log("Feedback data posted successfully: ", response);

            if (response.previously_submitted) {
                submitted[recommendationId] = true;
                modalBody.innerHTML = "Feedback already submitted for this recommendation";
                return;
            }

            modalBody.innerHTML = "Feedback successfully submitted";
            submitted[recommendationId] = true;
        } catch (err) {
            console.error("failed to send the ratings to the database", err);
        }
    }

    function createSpinner() {
        // Wrap the spinner in a flex container so it stays centered in whatever parent it is added to.
        const loadingSpinner = document.createElement("div");
        loadingSpinner.classList.add("d-flex", "justify-content-center", "align-items-center", "w-100");
        loadingSpinner.style.minHeight = "200px";
        loadingSpinner.role = "status";

        const spinnerIcon = document.createElement("div");
        spinnerIcon.classList.add("spinner-border", "text-success");

        const spinnerSpan = document.createElement("span");
        spinnerSpan.classList.add("visually-hidden");
        spinnerSpan.textContent = "Saving your details and generating your recommendations...";
        spinnerIcon.appendChild(spinnerSpan);
        loadingSpinner.appendChild(spinnerIcon);

        return loadingSpinner;
    }

    function createProgressBar() {
        // Create the animated progress bar shown while the full recommendation summary is loading.
        const progressDiv = document.createElement("div");
        progressDiv.classList.add("progress", "my-3");

        const progress = document.createElement("div");
        progress.classList.add("progress-bar", "progress-bar-striped", "progress-bar-animated");
        progress.setAttribute("role", "progressbar");
        progress.style.width = "0%";
        progressDiv.appendChild(progress);

        return [progress, progressDiv];
    }

    function parseDetailedSummary(output) {
        // Extract the named fields from the generated full summary text.
        const lowerOutput = output.toLowerCase();
        const marketConditions = lowerOutput.match(/market\s*conditions[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
        const marketSize = lowerOutput.match(/size\s*of\s*potential\s*market[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
        const potentialCost = lowerOutput.match(/potential\s*cost[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
        const uniqueness = lowerOutput.match(/uniqueness.*idea[:\-–]\s*([^\n]+)/i)?.[1] || "undefined";
        const sourcesRaw = lowerOutput.match(/sources[:\-–]\s*(.+)/i)?.[1] || "";
        const sourcesUrls = sourcesRaw.match(/https?:\/\/\S+/g) || [];
        const clickableSources = sourcesUrls.length > 0
            ? sourcesUrls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join("<br>")
            : sourcesRaw && sourcesRaw.length > 0
                ? sourcesRaw
                : "No sources available";
        const riskLevel = (
            lowerOutput.match(/overall\s*risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
            lowerOutput.match(/risk\s*grading[:\-–]\s*([^\n]+)/i)?.[1] ||
            lowerOutput.match(/overall\s*risk[:\-–]\s*([^\n]+)/i)?.[1] ||
            "undefined"
        ) + "";

        return {
            marketConditions,
            marketSize,
            potentialCost,
            uniqueness,
            clickableSources,
            riskLevel
        };
    }

    function applyRiskLevelColor(riskLevel, element) {
        // Use color to make the risk level easier to scan in the expanded summary.
        const stringRisk = String(riskLevel || "");

        if (stringRisk.includes("high") || stringRisk.includes("7") || stringRisk.includes("8") || stringRisk.includes("9")) {
            element.style.color = "red";
        } else if (stringRisk.includes("medium") || stringRisk.includes("4") || stringRisk.includes("5") || stringRisk.includes("6")) {
            element.style.color = "orange";
        } else if (stringRisk.includes("low") || stringRisk.includes("0") || stringRisk.includes("1") || stringRisk.includes("2") || stringRisk.includes("3")) {
            element.style.color = "aquamarine";
        }
    }

    window.HomepageHelpers = {
        createModal,
        createModalTable,
        createModalAccordion,
        populateModalAccordion,
        retrieveAccordionData,
        getCompetitorData,
        createCompetitorButton,
        createRegenerateButton,
        handleRegenerateClick,
        handleClick,
        handleFilterInput,
        createRatingsButton,
        handleRatingsButton,
        createRatings,
        submitRatings,
        createSpinner,
        createProgressBar,
        parseDetailedSummary,
        applyRiskLevelColor
    };
})();
