(function () {
  const STORAGE_KEY = "transalink_agent_tour_completed_v1";

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("transalink_user"));
    } catch (_) {
      return null;
    }
  }

  function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);

      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);

        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Élément introuvable : ${selector}`));
      }, timeout);
    });
  }

  function getSettingsButton() {
    return Array.from(document.querySelectorAll("#sideLinks button")).find(
      (button) => button.getAttribute("onclick")?.includes("settings.html"),
    );
  }

  class AgentTour {
    constructor() {
      this.currentIndex = 0;
      this.currentTarget = null;

      this.steps = [
        {
          selector: ".balance-card",
          title: "Solde de l’agence",
          text:
            "Cette carte affiche le solde estimé de votre caisse. " +
            "Le statut indique rapidement si la situation est sécurisée ou doit être vérifiée.",
        },
        {
          selector: "#summaryGrid",
          title: "Résumé des demandes",
          text: "Retrouvez ici le nombre de demandes en attente, validées, envoyées et refusées pendant la semaine.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(1)",
          title: "Demandes reçues",
          text:
            "Consultez les demandes envoyées par le frère terrain. " +
            "Vous pouvez les valider, les refuser ou confirmer l’envoi de l’argent.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(2)",
          title: "Codes retour",
          text: "Créez les codes retour et suivez leur libération par le frère terrain.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(3)",
          title: "Entrées",
          text: "Ajoutez ici les nouvelles entrées de caisse et consultez leur historique.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(4)",
          title: "Dépenses",
          text: "Enregistrez les sorties d’argent et supprimez une dépense en cas d’erreur.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(5)",
          title: "Bilan",
          text: "Consultez les mouvements de caisse, les rapports et le solde restant.",
        },
        {
          selector: "#shortcutGrid .shortcut-card:nth-child(6)",
          title: "Rapport du dimanche",
          text: "Comparez le rapport déclaré par le frère terrain avec les calculs de TransaLink.",
        },
        {
          selector: ".notif-btn",
          title: "Notifications",
          text:
            "La cloche regroupe les opérations qui demandent votre attention. " +
            "Les notifications Android vous avertissent aussi lorsque l’application est fermée.",
        },
        {
          target: () => {
            const sideMenu = document.getElementById("sideMenu");

            if (
              sideMenu &&
              !sideMenu.classList.contains("open") &&
              typeof window.toggleMenu === "function"
            ) {
              window.toggleMenu();
            }

            return getSettingsButton();
          },
          title: "Paramètres",
          text:
            "Dans Paramètres, vous pouvez modifier votre nom, votre mot de passe, " +
            "votre code PIN de transaction et vos préférences d’affichage.",
        },
      ];

      this.repositionCurrentStep = this.repositionCurrentStep.bind(this);
    }

    async start(force = false) {
      const user = getUser();

      if (!user || user.role !== "agent") return;

      if (!force && localStorage.getItem(STORAGE_KEY) === "true") {
        return;
      }

      try {
        await waitForElement("#shortcutGrid .shortcut-card");
      } catch (_) {
        return;
      }

      this.createInterface();
      this.showStep(0);
    }

    createInterface() {
      document.getElementById("agentTourOverlay")?.remove();

      document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div class="agent-tour-overlay" id="agentTourOverlay">
          <div class="agent-tour-dim"></div>

          <section
            class="agent-tour-card"
            id="agentTourCard"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
          >
            <div class="agent-tour-progress">
              <span id="agentTourCounter"></span>

              <button
                type="button"
                class="agent-tour-skip"
                id="agentTourSkip"
              >
                Passer le guide
              </button>
            </div>

            <h2 id="agentTourTitle"></h2>
            <p id="agentTourText"></p>

            <div class="agent-tour-actions">
              <button
                type="button"
                class="agent-tour-back"
                id="agentTourBack"
              >
                Précédent
              </button>

              <button
                type="button"
                class="agent-tour-next"
                id="agentTourNext"
              >
                Suivant
              </button>
            </div>
          </section>
        </div>
        `,
      );

      document
        .getElementById("agentTourSkip")
        .addEventListener("click", () => this.finish());

      document.getElementById("agentTourBack").addEventListener("click", () => {
        this.showStep(this.currentIndex - 1);
      });

      document.getElementById("agentTourNext").addEventListener("click", () => {
        if (this.currentIndex >= this.steps.length - 1) {
          this.finish();
          return;
        }

        this.showStep(this.currentIndex + 1);
      });

      window.addEventListener("resize", this.repositionCurrentStep);

      window.addEventListener("scroll", this.repositionCurrentStep, true);
    }

    resolveTarget(step) {
      if (typeof step.target === "function") {
        return step.target();
      }

      return document.querySelector(step.selector);
    }

    showStep(index) {
      if (index < 0 || index >= this.steps.length) return;

      this.clearHighlight();
      this.currentIndex = index;

      const step = this.steps[index];
      const target = this.resolveTarget(step);

      if (!target) {
        if (index < this.steps.length - 1) {
          this.showStep(index + 1);
        } else {
          this.finish();
        }

        return;
      }

      this.currentTarget = target;
      target.classList.add("agent-tour-highlight");

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      document.getElementById("agentTourTitle").textContent = step.title;

      document.getElementById("agentTourText").textContent = step.text;

      document.getElementById("agentTourCounter").textContent =
        `${index + 1} sur ${this.steps.length}`;

      document.getElementById("agentTourBack").style.visibility =
        index === 0 ? "hidden" : "visible";

      document.getElementById("agentTourNext").textContent =
        index === this.steps.length - 1 ? "Terminer" : "Suivant";

      setTimeout(() => {
        this.positionCard(target);
      }, 280);
    }

    positionCard(target) {
      const card = document.getElementById("agentTourCard");

      if (!card || !target) return;

      const targetRect = target.getBoundingClientRect();

      const cardRect = card.getBoundingClientRect();

      const margin = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = targetRect.bottom + margin;

      if (top + cardRect.height > viewportHeight - margin) {
        top = targetRect.top - cardRect.height - margin;
      }

      if (top < margin) {
        top = Math.max(margin, viewportHeight - cardRect.height - margin);
      }

      let left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;

      left = Math.max(
        margin,
        Math.min(left, viewportWidth - cardRect.width - margin),
      );

      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
    }

    repositionCurrentStep() {
      if (this.currentTarget) {
        this.positionCard(this.currentTarget);
      }
    }

    clearHighlight() {
      document.querySelectorAll(".agent-tour-highlight").forEach((element) => {
        element.classList.remove("agent-tour-highlight");
      });
    }

    closeSideMenu() {
      document.getElementById("sideMenu")?.classList.remove("open");

      document.getElementById("overlay")?.classList.remove("show");
    }

    finish() {
      localStorage.setItem(STORAGE_KEY, "true");

      this.clearHighlight();
      this.closeSideMenu();

      window.removeEventListener("resize", this.repositionCurrentStep);

      window.removeEventListener("scroll", this.repositionCurrentStep, true);

      document.getElementById("agentTourOverlay")?.remove();
    }
  }

  const tour = new AgentTour();

  window.restartAgentTour = function () {
    localStorage.removeItem(STORAGE_KEY);
    tour.start(true);
  };

  window.addEventListener("load", () => {
    setTimeout(() => {
      tour.start();
    }, 700);
  });
})();
