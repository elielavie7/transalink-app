(function () {
  const token = localStorage.getItem("transalink_token");
  const userText = localStorage.getItem("transalink_user");

  let user = null;

  try {
    user = userText ? JSON.parse(userText) : null;
  } catch {
    user = null;
  }

  const path = window.location.pathname;
  const page = path.split("/").pop() || "index.html";
  const isLoginPage = page === "index.html" || path === "/";

  const agentPages = [
    "dashboard.html",
    "agent-requests.html",
    "return-codes.html",
    "incomes.html",
    "expenses.html",
    "reports.html",
    "field-reports.html",
    "settings.html",
  ];

  const terrainPages = [
    "dashboard.html",
    "new-transaction.html",
    "my-requests.html",
    "terrain-return-codes.html",
    "terrain-finance.html",
    "terrain-stats.html",
    "settings.html",
    "terrain-incomes.html",
    "terrain-expenses.html",
   
  ];

  if (isLoginPage) {
    if (token && user) {
      window.location.replace("/pages/dashboard.html");
    }
    return;
  }

  if (!token || !user || !user.role) {
    window.location.replace("/");
    return;
  }

  const allowedPages = user.role === "agent" ? agentPages : terrainPages;

  if (!allowedPages.includes(page)) {
    window.location.replace("/pages/dashboard.html");
    return;
  }
})();
