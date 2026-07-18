const token = localStorage.getItem("transalink_token");
const user = JSON.parse(localStorage.getItem("transalink_user"));
const selectedAgencyId =
  user.role === "agent"
    ? user.agency_id
    : localStorage.getItem("selected_agency_id");
const selectedAgencyName =
  user.role === "agent" ? "" : localStorage.getItem("selected_agency_name");

if (user.role === "terrain" && !selectedAgencyId) {
  window.location.href = "agency-selector.html";
}

if (!token || !user) {
  window.location.href = "../index.html";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

document.getElementById("helloText").textContent = ` ${user.name}`;
if (user.role === "terrain") {
  document.getElementById("roleText").innerHTML = `📍 ${selectedAgencyName}`;
} else {
  document.getElementById("roleText").textContent = "Agent principal";
}
document.getElementById("menuUserName").textContent = user.name;
document.getElementById("menuUserRole").textContent =
  user.role === "agent" ? "Agent principal" : "Agent terrain";

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("fr-FR") + " FC";
}
function isInCurrentWeek(dateValue) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const now = new Date();

  const currentDay = now.getDay() || 7;

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - currentDay + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return date >= weekStart && date <= weekEnd;
}

function toggleMenu() {
  document.getElementById("sideMenu").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

function goTo(link) {
  if (!link || link === "#") return;
  window.location.href = link;
}

function askLogout() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="custom-modal" id="logoutModal" onclick="closeLogoutModal()">
      <div class="modal-box" onclick="event.stopPropagation()">
        <h2>Déconnexion</h2>
        <p>Voulez-vous vraiment vous déconnecter de TransaLink ?</p>
        <div class="modal-actions">
          <button class="small-btn primary-small-btn" onclick="closeLogoutModal()">Annuler</button>
          <button class="small-btn danger-btn" onclick="logout()">Se déconnecter</button>
        </div>
      </div>
    </div>
  `,
  );
}

function closeLogoutModal() {
  const modal = document.getElementById("logoutModal");
  if (modal) modal.remove();
}

function logout() {
  localStorage.removeItem("transalink_token");
  localStorage.removeItem("transalink_user");

  sessionStorage.clear();

  window.location.replace("/");
}

const routes = {
  agent: [
    { label: "Accueil", icon: "🏠", link: "dashboard.html" },
    { label: "Demandes reçues", icon: "📥", link: "agent-requests.html" },
    { label: "Codes retour", icon: "🔁", link: "return-codes.html" },
    { label: "Entrées", icon: "💰", link: "incomes.html" },
    { label: "Dépenses", icon: "📉", link: "expenses.html" },
    { label: "Bilan", icon: "📊", link: "reports.html" },
    { label: "Paramètres", icon: "⚙️", link: "settings.html" },
  ],
  terrain: [
    { label: "Accueil", icon: "🏠", link: "dashboard.html" },
    { label: "Nouvelle demande", icon: "➕", link: "new-transaction.html" },
    { label: "Mes demandes", icon: "📄", link: "my-requests.html" },
    { label: "Codes retour", icon: "🔁", link: "terrain-return-codes.html" },
    { label: "Mes statistiques", icon: "📊", link: "terrain-stats.html" },
    { label: "Rapport dimanche", icon: "🧾", link: "terrain-finance.html" },
    { label: "Paramètres", icon: "⚙️", link: "settings.html" },
  ],
};

const shortcuts = {
  agent: [
    {
      icon: "📥",
      title: "Demandes reçues",
      text: "Valider ou refuser",
      link: "agent-requests.html",
      badge: 0,
    },
    {
      icon: "🔁",
      title: "Codes retour",
      text: "Créer et suivre",
      link: "return-codes.html",
      badge: 0,
    },
    {
      icon: "💰",
      title: "Entrées",
      text: "Ajouter capital",
      link: "incomes.html",
      badge: 0,
    },
    {
      icon: "📉",
      title: "Dépenses",
      text: "Enregistrer frais",
      link: "expenses.html",
      badge: 0,
    },
    {
      icon: "📊",
      title: "Bilan",
      text: "Voir bilan",
      link: "reports.html",
      badge: 0,
    },
    {
      icon: "🧾",
      title: "Apreçu Rapport dimanche",
      text: "Comparer écarts",
      link: "field-reports.html",
      badge: 0,
    },
  ],
  terrain: [
    {
      icon: "➕",
      title: "Nouvelle demande",
      text: "Demander envoi",
      link: "new-transaction.html",
      badge: 0,
    },
    {
      icon: "📄",
      title: "Mes demandes",
      text: "Suivre statuts",
      link: "my-requests.html",
      badge: 0,
    },
    {
      icon: "🔁",
      title: "Codes à libérer",
      text: "Retour terrain",
      link: "terrain-return-codes.html",
      badge: 0,
    },

    {
      icon: "💰",
      title: "Entrées",
      text: "Historique capital",
      link: "terrain-incomes.html",
      badge: 0,
    },
    {
      icon: "📉",
      title: "Dépenses",
      text: "Historique frais",
      link: "terrain-expenses.html",
      badge: 0,
    },

    {
      icon: "📊",
      title: "Mes statistiques",
      text: "Voir performance",
      link: "terrain-stats.html",
      badge: 0,
    },
    {
      icon: "🧾",
      title: "Rapport dimanche",
      text: "Voir bilan",
      link: "terrain-finance.html",
      badge: 0,
    },
  ],
};

function renderDashboard(
  summary = { pending: 0, approved: 0, sent: 0, rejected: 0 },
) {
  const role = user.role;
  const roleRoutes = routes[role];
  const roleShortcuts = shortcuts[role];

  const stats = [
    {
      label: "En attente",
      value: summary.pending || 0,
      className: "status-pending",
    },
    {
      label: "Validées",
      value: summary.approved || 0,
      className: "status-approved",
    },
    { label: "Envoyées", value: summary.sent || 0, className: "status-sent" },
    {
      label: "Refusées",
      value: summary.rejected || 0,
      className: "status-rejected",
    },
  ];

  document.getElementById("summaryGrid").innerHTML = stats
    .map(
      (item) => `
    <div class="mini-card ${item.className}">
      <p>${item.label}</p>
      <strong>${item.value}</strong>
    </div>
  `,
    )
    .join("");

  document.getElementById("shortcutGrid").innerHTML = roleShortcuts
    .map(
      (item) => `
    <button class="shortcut-card" onclick="goTo('${item.link}')">
      ${item.badge > 0 ? `<span class="card-badge">${item.badge}</span>` : ""}
      <span>${item.icon}</span>
      <strong>${item.title}</strong>
      <small>${item.text}</small>
    </button>
  `,
    )
    .join("");

  document.getElementById("sideLinks").innerHTML = roleRoutes
    .map(
      (item, index) => `
    <button class="${index === 0 ? "active" : ""}" onclick="goTo('${item.link}')">
      <span>${item.icon}</span>
      ${item.label}
    </button>
  `,
    )
    .join("");

  const codesLink =
    role === "agent" ? "return-codes.html" : "terrain-return-codes.html";

  document.getElementById("bottomNav").innerHTML = `
  <button class="active" onclick="goTo('dashboard.html')">◆<span>Accueil</span></button>

  <button onclick="goTo('${role === "agent" ? "agent-requests.html" : "my-requests.html"}')">
    📄<span>Demandes</span>
  </button>

  <button onclick="goTo('${codesLink}')">
    🔁<span>Codes</span>
  </button>

  <button onclick="goTo('${role === "agent" ? "reports.html" : "terrain-finance.html"}')">
    📊<span>Rapport</span>
  </button>

  <button onclick="goTo('${role === "agent" ? "expenses.html" : "terrain-stats.html"}')">
    ${role === "agent" ? "📉" : "📈"}<span>${role === "agent" ? "Dépenses" : "Stats"}</span>
  </button>
`;

  const logoutBtn = document.querySelector(".side-logout");
  if (logoutBtn) logoutBtn.setAttribute("onclick", "askLogout()");
}

async function loadDashboardData() {
  try {
    const [transactionsRes, codesRes] = await Promise.all([
      fetch(`${API_URL}/transactions?agency_id=${selectedAgencyId}`, {
        headers,
      }),

      fetch(`${API_URL}/return-codes?agency_id=${selectedAgencyId}`, {
        headers,
      }),
    ]);
    const transactionsData = await transactionsRes.json();
    const codesData = await codesRes.json();

    let transactions = transactionsData.success
      ? transactionsData.transactions || []
      : [];
    let returnCodes = codesData.success ? codesData.data || [] : [];

    if (user.role === "terrain") {
      transactions = transactions.filter(
        (t) => Number(t.created_by) === Number(user.id),
      );
    }

    const weekTransactions = transactions.filter((t) =>
      isInCurrentWeek(t.created_at),
    );

    const pendingReturnCodes = returnCodes.filter(
      (c) => c.status === "pending",
    ).length;
    const releasedReturnCodes = returnCodes.filter(
      (c) => c.status === "released",
    );
    const releasedReturnIncome = releasedReturnCodes.reduce((sum, c) => {
      return sum + Number(c.income_amount || 0);
    }, 0);

    const summary = {
      pending: weekTransactions.filter((t) => t.status === "pending").length,
      approved: weekTransactions.filter((t) => t.status === "approved").length,
      sent: weekTransactions.filter((t) => t.status === "sent").length,
      rejected: weekTransactions.filter((t) => t.status === "rejected").length,
    };

    shortcuts.agent[1].badge = 0;
    shortcuts.terrain[2].badge = 0;

    if (user.role === "agent") {
      shortcuts.agent[1].badge = pendingReturnCodes;
    }

    if (user.role === "terrain") {
      shortcuts.terrain[2].badge = pendingReturnCodes;
    }

    renderDashboard(summary);

    await loadReport();
  } catch (error) {
    document.getElementById("statusBadge").textContent = "Hors ligne";
  }
}

async function loadReport() {
  try {
    const res = await fetch(
      `${API_URL}/report?mode=global&agency_id=${selectedAgencyId}`,
      { headers },
    );
    const data = await res.json();

    if (data.success) {
      const cashRemaining = Number(
        data.report.cash_remaining || data.report.balance || 0,
      );
      document.getElementById("balanceValue").textContent =
        formatMoney(cashRemaining);

      const statusBadge = document.getElementById("statusBadge");
      if (statusBadge) {
        statusBadge.textContent = cashRemaining < 0 ? "À vérifier" : "Sécurisé";
      }
    }
  } catch (error) {
    document.getElementById("statusBadge").textContent = "Hors ligne";
  }
}

/* NOTIFICATIONS */
let lastUnreadCount = 0;
let soundEnabled = false;

const notifSound = new Audio("../assets/notification.mp3");
notifSound.volume = 0.9;

document.addEventListener(
  "click",
  async () => {
    soundEnabled = true;

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  },
  { once: true },
);

function playNotificationSound() {
  if (!soundEnabled) return;

  notifSound.pause();
  notifSound.currentTime = 0;

  notifSound
    .play()
    .then(() => console.log("SON OK"))
    .catch((err) => console.log("SON ERROR", err.message));
}

function showSystemNotification(title, message) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body: message,
    icon: "../assets/transalink_logo.png",
  });
}

async function loadNotificationsCount() {
  try {
    const res = await fetch(
      `${API_URL}/notifications?agency_id=${selectedAgencyId}`,
      { headers },
    );
    const data = await res.json();

    if (!data.success) return;

    const notifications = data.notifications || [];
    const ignoredTypes = ["transaction_approved"];

    const unreadNotifications = notifications.filter(
      (n) => !n.is_read && !ignoredTypes.includes(n.type),
    );

    const count = unreadNotifications.length;
    const badge = document.getElementById("notifBadge");

    badge.textContent = count;
    badge.style.display = count > 0 ? "grid" : "none";

    // Reset badges
    shortcuts.agent.forEach((item) => (item.badge = 0));
    shortcuts.terrain.forEach((item) => (item.badge = 0));

    if (user.role === "agent") {
      shortcuts.agent[0].badge = unreadNotifications.filter((n) =>
        ["transaction_created", "new_transaction"].includes(n.type),
      ).length;

      shortcuts.agent[1].badge = unreadNotifications.filter((n) =>
        [
          "return_code_released",
        ].includes(n.type),
      ).length;

      shortcuts.agent[5].badge = unreadNotifications.filter(
        (n) => n.type === "field_report",
      ).length;
    }

    if (user.role === "terrain") {
  shortcuts.terrain[1].badge = unreadNotifications.filter((n) =>
    ["transaction_sent", "transaction_rejected"].includes(n.type),
  ).length;

  shortcuts.terrain[2].badge = unreadNotifications.filter((n) =>
    ["return_code_created", "return_code_cancelled"].includes(n.type),
  ).length;

  shortcuts.terrain[3].badge = unreadNotifications.filter((n) =>
    ["income", "income_deleted"].includes(n.type),
  ).length;

  shortcuts.terrain[4].badge = unreadNotifications.filter((n) =>
    ["expense", "expense_deleted"].includes(n.type),
  ).length;
}
    if (count > lastUnreadCount) {
      playNotificationSound();

      if (document.hidden) {
        showSystemNotification(
          "TransaLink",
          "Vous avez une nouvelle notification.",
        );
      }
    }

    lastUnreadCount = count;
    loadDashboardData();
  } catch (error) {
    console.log("Notifications indisponibles");
  }
}
async function openNotifications() {
  try {
    const res = await fetch(
      `${API_URL}/notifications?agency_id=${selectedAgencyId}`,
      { headers },
    );
    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Erreur notifications");
      return;
    }

    const hiddenTypes = ["transaction_approved"];

    const items = (data.notifications || []).filter(
      (n) => !hiddenTypes.includes(n.type),
    );

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div class="custom-modal" id="notificationsModal" onclick="closeNotifications()">
        <div class="modal-box notifications-box" onclick="event.stopPropagation()">
          <div class="notif-modal-head">
            <div>
              <h2>Notifications</h2>
              <p>${items.length} notification(s)</p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
  <button class="small-btn primary-small-btn" onclick="markAllNotificationsRead()">Tout lire</button>
  <button class="small-btn danger-btn" onclick="deleteAllNotifications()">Vider</button>
</div>
          </div>

          <div class="notifications-list">
            ${
              items.length === 0
                ? `<p class="empty-text">Aucune notification.</p>`
                : items
                    .map(
                      (n) => `
                <div class="notification-item ${n.is_read ? "" : "unread"}">
                  <strong>${n.title}</strong>
                  <p>${n.message}</p>
                  <small>${new Date(n.created_at).toLocaleString("fr-FR")}</small>
                </div>
              `,
                    )
                    .join("")
            }
          </div>

          <div class="modal-actions">
            <button class="small-btn danger-btn" onclick="closeNotifications()">Fermer</button>
          </div>
        </div>
      </div>
    `,
    );
  } catch (error) {
    alert("Serveur indisponible");
  }
}

function closeNotifications() {
  const modal = document.getElementById("notificationsModal");
  if (modal) modal.remove();
}

async function markAllNotificationsRead() {
  try {
    await fetch(`${API_URL}/notifications/read-all`, {
      method: "PUT",
      headers,
    });

    closeNotifications();
    lastUnreadCount = 0;

    loadNotificationsCount();
    loadDashboardData();
  } catch (error) {
    alert("Erreur lecture notifications");
  }
}
async function deleteAllNotifications() {
  try {
    await fetch(`${API_URL}/notifications`, {
      method: "DELETE",
      headers,
    });

    closeNotifications();
    lastUnreadCount = 0;

    loadNotificationsCount();
    loadDashboardData();
  } catch (error) {
    alert("Erreur suppression notifications");
  }
}
if (user.role === "terrain") {
  document.getElementById("agencyBanner").innerHTML = `
<div class="agency-banner">

<div>

<h3>🏢 ${selectedAgencyName}</h3>

<p>Agence actuellement sélectionnée</p>

</div>

<button
class="small-btn primary-small-btn"
onclick="changeAgency()">

Changer

</button>

</div>
`;
}
function changeAgency() {
  localStorage.removeItem("selected_agency_id");
  localStorage.removeItem("selected_agency_name");

  window.location.href = "agency-selector.html";
}

renderDashboard();
loadDashboardData();
loadNotificationsCount();

setInterval(loadNotificationsCount, 8000);
