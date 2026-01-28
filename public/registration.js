
const password = document.getElementById("register_password").value;
const email = document.getElementById("register_email").value;
const error_section  = document.getElementById("error_text")

function validate_username()
{
    const u_name = document.getElementById("register_uname").value;
    if (u_name.length < 8)
    {
        error_section.innerHTML = `Invalid username length, username must be at least 8 letters`;
        return false;
    }
    return true;
}