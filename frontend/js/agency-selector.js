const token = localStorage.getItem("transalink_token");
const user = JSON.parse(localStorage.getItem("transalink_user"));

if (!token || !user) {
  window.location.replace("../index.html");
}

if (user.role !== "terrain") {
  window.location.replace("dashboard.html");
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

async function loadAgencies() {
  const grid = document.getElementById("agencyGrid");

  try {
    const res = await fetch(`${API_URL}/agencies`, { headers });
    const data = await res.json();

    if (!data.success) {
      grid.innerHTML = `<p class="error">Impossible de charger les agences.</p>`;
      return;
    }

    const agencies = data.agencies || [];

    grid.innerHTML = agencies.map(agency => `
      <button class="agency-card" onclick="selectAgency(${agency.id}, '${agency.name}')">
        <div class="agency-icon">📍</div>
        <h2>${agency.name}</h2>
        <p>Agent : <strong>${agency.agent || "Non défini"}</strong></p>
        <span>Entrer</span>
      </button>
    `).join("");

  } catch (error) {
    grid.innerHTML = `<p class="error">Serveur indisponible.</p>`;
  }
}

function selectAgency(id, name) {
  localStorage.setItem("selected_agency_id", id);
  localStorage.setItem("selected_agency_name", name);

  window.location.replace("dashboard.html");
}

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace("../index.html");
}

loadAgencies();