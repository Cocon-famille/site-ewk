(async function () {
  const params = new URLSearchParams(location.search);
  const type = params.get("type") || "reglement";
  const root = document.getElementById("poster");

  document.getElementById("print-btn").addEventListener("click", () => window.print());

  const BADGE_META = {
    JUSTE: { disc: "poster-badge-disc--juste", text: "JUSTE" },
    QUESTION: { disc: "poster-badge-disc--question", text: "?" },
  };

  function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  if (type === "reglement") {
    root.className = "poster poster--reglement";
    root.appendChild(
      el(`
      <div class="poster-inner">
        <span class="disc poster-logo" aria-hidden="true"></span>
        <h1 class="poster-title">Le règlement</h1>
        <ol class="poster-rules">
          <li><span class="poster-rule-num">1</span>C'est toi qui décides s'il y a cours.</li>
          <li><span class="poster-rule-num">2</span>10 à 20 minutes.</li>
          <li><span class="poster-rule-num">3</span>Aucune question n'est bête.</li>
          <li><span class="poster-rule-num">4</span>On note ce que tu as compris.</li>
          <li><span class="poster-rule-num">5</span>Jamais de devoirs.</li>
          <li><span class="poster-rule-num">6</span>Un cours finit toujours par un badge.</li>
        </ol>
      </div>
    `)
    );
  }

  if (type === "badge") {
    root.className = "poster poster--badge";
    let fiche = null;
    try {
      const fiches = await EWK.fetchJSON("fiches.json");
      const id = params.get("fiche");
      fiche = id ? fiches.find((f) => f.id === id) : fiches[fiches.length - 1];
    } catch (e) {
      /* pas grave, on affiche un badge générique */
    }
    const badgeKey = fiche && fiche.badge && BADGE_META[fiche.badge] ? fiche.badge : "JUSTE";
    const meta = BADGE_META[badgeKey];
    root.appendChild(
      el(`
      <div class="poster-inner">
        <span class="disc poster-logo poster-logo--dark" aria-hidden="true"></span>
        <div class="poster-badge-disc ${meta.disc}">${meta.text}</div>
        <h1 class="poster-title poster-title--light">Bravo Marin&nbsp;!</h1>
        ${fiche ? `<p class="poster-sub">${fiche.matiere} &middot; ${fiche.date}</p>` : ""}
      </div>
    `)
    );
  }

  if (type === "diplome") {
    root.className = "poster poster--diplome";
    const titre = params.get("titre") || "Diplôme";
    const message = params.get("message") || "Bravo, continue comme ça.";
    const date = params.get("date") || new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    root.appendChild(
      el(`
      <div class="poster-inner">
        <span class="disc poster-logo" aria-hidden="true"></span>
        <p class="poster-eyebrow">L'École du Weekend</p>
        <h1 class="poster-title">${titre}</h1>
        <p class="poster-decerne">décerné à Marin</p>
        <p class="poster-message">${message}</p>
        <p class="poster-footer">${date} &middot; Dir. Maël</p>
      </div>
    `)
    );
  }
})();
