(function () {
  const token = localStorage.getItem("transalink_token");
  const user = JSON.parse(localStorage.getItem("transalink_user"));

  if (!token || !user) return;
  const heartbeatHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function sendHeartbeat() {
    try {
      await fetch(`${API_URL}/users/heartbeat`, {
        method: "PUT",
        headers: heartbeatHeaders,
      });
    } catch (error) {
      console.log("Heartbeat indisponible");
    }
  }

  sendHeartbeat();

  setInterval(sendHeartbeat, 25000);

  const role = user.role;
  const currentPage = window.location.pathname.split("/").pop();

  const links =
    role === "agent"
      ? [
          { icon: "◆", label: "Accueil", page: "dashboard.html" },
          { icon: "📄", label: "Demandes", page: "agent-requests.html" },
          { icon: "🔁", label: "Codes", page: "return-codes.html" },
          { icon: "📊", label: "Bilan", page: "reports.html" },
          { icon: "📉", label: "Dépenses", page: "expenses.html" },
        ]
      : [
          { icon: "◆", label: "Accueil", page: "dashboard.html" },
          { icon: "📄", label: "Demandes", page: "my-requests.html" },
          {
            icon: "🔁",
            label: "Codes",
            page: "terrain-return-codes.html",
          },
          { icon: "📊", label: "Bilan", page: "terrain-finance.html" },
          { icon: "📈", label: "Stats", page: "terrain-stats.html" },
        ];

  let nav = document.getElementById("bottomNav");

  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "bottomNav";
    nav.className = "bottom-nav";
    document.body.appendChild(nav);
  }

  nav.innerHTML = links
    .map(
      (item) => `
        <button
          class="${currentPage === item.page ? "active" : ""}"
          onclick="goMobilePage('${item.page}')"
        >
          ${item.icon}
          <span>${item.label}</span>
        </button>
      `,
    )
    .join("");

  window.goMobilePage = function (page) {
    if (!page || page === currentPage) return;

    document.body.classList.add("page-leaving");

    setTimeout(() => {
      window.location.href = page;
    }, 60);
  };
})();
