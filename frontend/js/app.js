const loginForm = document.getElementById("loginForm");
const messageBox = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.textContent = isHidden ? "🙈" : "👁️";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value.trim();

  messageBox.textContent = "Connexion en cours...";
  messageBox.className = "";
  loginBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });

    const data = await response.json();

    if (!data.success) {
      messageBox.textContent = data.message || "Connexion impossible";
      messageBox.className = "error";
      loginBtn.disabled = false;
      return;
    }

    localStorage.setItem("transalink_token", data.token);
    localStorage.setItem("transalink_user", JSON.stringify(data.user));

    messageBox.textContent = "Connexion réussie";
    messageBox.className = "success";

   setTimeout(() => {
  if (data.user.role === "terrain") {
    window.location.href = "pages/agency-selector.html";
  } else {
    window.location.href = "pages/dashboard.html";
  }
}, 600);

  } catch (error) {
    messageBox.textContent = "Serveur TransaLink indisponible";
    messageBox.className = "error";
    loginBtn.disabled = false;
  }
});