const token = localStorage.getItem("transalink_token");

const agencyId = localStorage.getItem("selected_agency_id");

const headers = {
  Authorization: `Bearer ${token}`,
};

let expenses = [];

let selectedDate = "";

function goBack() {
  history.back();
}

async function loadExpenses() {
  try {
    const res = await fetch(`${API_URL}/expenses?agency_id=${agencyId}`, {
      headers,
    });

    const data = await res.json();

    if (!data.success) return;

    expenses = data.expenses || data.data || [];

    renderList();
    await markExpenseNotificationsRead();
  } catch (err) {
    console.log(err);
  }
}
function renderList() {
  const search = document.getElementById("searchInput").value.toLowerCase();

  const container = document.getElementById("expenseList");

  let list = expenses.filter((e) => {
    const txt = (
      (e.reason || "") +
      " " +
      (e.created_by_name || "")
    ).toLowerCase();

    return txt.includes(search);
  });

  document.getElementById("summaryBox").innerHTML = `
<strong>

Dépenses enregistrées

</strong>

<br>

${list.length} dépense(s)

•
${list.reduce((s, e) => s + Number(e.amount), 0).toLocaleString("fr-FR")} FC
`;

  if (!list.length) {
    container.innerHTML = `
<p class="empty-text">

Aucune dépense trouvée.

</p>
`;

    return;
  }

  container.innerHTML = list
    .map(
      (e) => `

<div class="request-card">

<div class="request-info">

<h3>

📉 ${Number(e.amount).toLocaleString("fr-FR")} FC

</h3>

<p>

<strong>Motif :</strong>

${e.reason}

</p>

<p>

<strong>Ajoutée par :</strong>

${e.created_by_name}

</p>

<p>

<strong>Date :</strong>

${new Date(e.created_at).toLocaleString("fr-FR")}

</p>

</div>

</div>

`,
    )
    .join("");
}
function changePeriod() {
  // on ajoutera les filtres jour/semaine/mois juste après

  renderList();
}

function openDateModal() {
  alert("Le calendrier sera ajouté comme sur les entrées.");
}
async function markExpenseNotificationsRead() {
  if (!agencyId) return;

  try {
    await fetch(`${API_URL}/notifications/read-types`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agency_id: agencyId,
        types: ["expense", "expense_deleted"],
      }),
    });
  } catch (error) {
    console.error("Erreur lecture notifications Dépenses :", error);
  }
}
loadExpenses();
