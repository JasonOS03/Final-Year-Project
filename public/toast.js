function showToast(message)
{

    let toast_container = document.querySelector(".toast-container");
    if(!toast_container){
    toast_container = document.createElement("div");    
    toast_container.classList.add("toast-container","position-fixed","end-0","top-0","p-3");
    toast_container.setAttribute("aria-live","polite");
    toast_container.setAttribute("aria-atomic","true");
    document.body.appendChild(toast_container);
    }
    const t_div = document.createElement("div");
    t_div.classList.add("toast","fade","show","text-bg-success");
    t_div.role = "alert";
    t_div.setAttribute("aria-live","assertive");
    t_div.setAttribute("aria-atomic","true");

    const toast_header = document.createElement("div");
    toast_header.classList.add("toast-header","fw-semibold");

    toast_text = document.createElement("strong");
    toast_text.classList.add("me-auto");
    toast_text.textContent = "Registration successful! Please log in to view your recommendations";

    const close_toast = document.createElement("button");
    close_toast.classList.add("btn-close","btn-close-white");
    close_toast.setAttribute("data-bs-dismiss","toast");
    close_toast.setAttribute("aria-label","Close");
    toast_header.appendChild(toast_text);
    toast_header.appendChild(close_toast);

    const toast_body = document.createElement("div");
    toast_body.classList.add("toast-body","fw-semibold");
    toast_body.textContent = message;
    t_div.appendChild(toast_header);
    t_div.appendChild(toast_body);

    toast_container.appendChild(t_div);
}
