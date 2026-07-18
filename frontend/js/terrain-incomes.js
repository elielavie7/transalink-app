const token = localStorage.getItem("transalink_token");
const agencyId = localStorage.getItem("selected_agency_id");

const headers = {
  Authorization: `Bearer ${token}`,
};

let incomes = [];
let selectedDate = "";

function goBack() {
  window.location.href = "dashboard.html";
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("fr-FR") + " FC";
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnlyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameLocalDate(dateValue, selectedValue) {
  if (!dateValue || !selectedValue) return false;

  const target = new Date(dateValue);

  return formatDateOnlyLocal(target) === selectedValue;
}

function isInSelectedPeriod(dateValue) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const period = document.getElementById("periodFilter").value;
  const now = new Date();

  if (selectedDate) {
    return isSameLocalDate(dateValue, selectedDate);
  }

  if (period === "all") {
    return true;
  }

  if (period === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (period === "week") {
    const currentDay = now.getDay() || 7;

    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    weekStart.setDate(weekStart.getDate() - currentDay + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return date >= weekStart && date < weekEnd;
  }

  if (period === "month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return true;
}
async function markIncomeNotificationsRead() {
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
        types: ["income", "income_deleted"],
      }),
    });
  } catch (error) {
    console.error("Erreur lecture notifications Entrées :", error);
  }
}

async function loadIncomes() {
  const container = document.getElementById("incomeList");

  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  if (!agencyId) {
    container.innerHTML = `
      <p class="terrain-empty">
        Aucune agence sélectionnée.
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <p class="terrain-empty">
      Chargement des entrées...
    </p>
  `;

  try {
    const res = await fetch(
      `${API_URL}/incomes?agency_id=${encodeURIComponent(agencyId)}`,
      { headers },
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      container.innerHTML = `
        <p class="terrain-empty">
          ${data.message || "Impossible de charger les entrées."}
        </p>
      `;
      return;
    }

    incomes = data.data || data.incomes || [];

    renderList();

    await markIncomeNotificationsRead();
  } catch (error) {
    console.error("Erreur chargement entrées :", error);

    container.innerHTML = `
      <p class="terrain-empty">
        Serveur indisponible.
      </p>
    `;
  }
}

function renderList() {
  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  const container = document.getElementById("incomeList");
  const summaryBox = document.getElementById("summaryBox");

  const list = incomes.filter((income) => {
    const searchableText = [
      income.amount,
      income.source,
      income.note,
      income.created_by_name,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchableText.includes(search);

    const matchesPeriod = isInSelectedPeriod(income.created_at);

    return matchesSearch && matchesPeriod;
  });

  const total = list.reduce(
    (sum, income) => sum + Number(income.amount || 0),
    0,
  );

  summaryBox.innerHTML = `
    <strong>Entrées enregistrées</strong>
    <span>
      ${list.length} entrée(s) • ${formatMoney(total)}
    </span>
  `;

  if (list.length === 0) {
    container.innerHTML = `
      <p class="terrain-empty">
        Aucune entrée trouvée pour cette période.
      </p>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      (income) => `
        <article class="terrain-history-card">
          <h3 class="terrain-history-amount">
            💰 ${formatMoney(income.amount)}
          </h3>

          <div class="terrain-history-details">
            <p>
              <strong>Source :</strong>
              ${income.source || "-"}
            </p>

            ${
              income.note
                ? `
                  <p>
                    <strong>Note :</strong>
                    ${income.note}
                  </p>
                `
                : ""
            }

            <p>
              <strong>Ajoutée par :</strong>
              ${income.created_by_name || "-"}
            </p>

            <p>
              <strong>Date :</strong>
              ${formatDate(income.created_at)}
            </p>
          </div>
        </article>
      `,
    )
    .join("");
}

function changePeriod() {
  selectedDate = "";

  const dateLabel = document.getElementById("selectedDateLabel");
  const dateButton = dateLabel.closest("button");

  dateLabel.textContent = "Date";
  dateButton.classList.remove("terrain-date-active");

  renderList();
}

function openDateModal() {
  const oldModal = document.getElementById("incomeDateModal");

  if (oldModal) {
    oldModal.remove();
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="custom-modal"
        id="incomeDateModal"
        onclick="closeDateModal()"
      >
        <div
          class="modal-box"
          onclick="event.stopPropagation()"
        >
          <h2>📅 Filtrer les entrées</h2>
          <p>Choisis une date précise.</p>

          <label for="incomeDateInput">
            Date voulue
          </label>

          <input
            type="date"
            id="incomeDateInput"
            value="${selectedDate}"
          >

          <div class="modal-actions">
            <button
              class="small-btn danger-btn"
              onclick="clearDateFilter()"
            >
              Effacer
            </button>

            <button
              class="small-btn success-btn"
              onclick="applyDateFilter()"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    `,
  );
}

function closeDateModal() {
  const modal = document.getElementById("incomeDateModal");

  if (modal) {
    modal.remove();
  }
}

function applyDateFilter() {
  selectedDate = document.getElementById("incomeDateInput").value;

  const dateLabel = document.getElementById("selectedDateLabel");
  const dateButton = dateLabel.closest("button");

  if (selectedDate) {
    const [year, month, day] = selectedDate.split("-").map(Number);

    dateLabel.textContent = new Date(year, month - 1, day).toLocaleDateString(
      "fr-FR",
    );

    dateButton.classList.add("terrain-date-active");
  } else {
    dateLabel.textContent = "Date";
    dateButton.classList.remove("terrain-date-active");
  }

  closeDateModal();
  renderList();
}

function clearDateFilter() {
  selectedDate = "";

  const dateLabel = document.getElementById("selectedDateLabel");
  const dateButton = dateLabel.closest("button");

  dateLabel.textContent = "Date";
  dateButton.classList.remove("terrain-date-active");

  closeDateModal();
  renderList();
}

loadIncomes();
