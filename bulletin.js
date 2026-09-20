(async function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("bulletin");
  const doc = document.getElementById("fp-doc");

  document.getElementById("print-btn").addEventListener("click", () => window.print());
  document.getElementById("pdf-btn").addEventListener("click", () => {
    const filename = `bulletin-${(bulletin?.periode || "ewk").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    html2pdf()
      .set({ filename, margin: 10, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } })
      .from(document.getElementById("fp-doc"))
      .save();
  });

  if (/eleve\.html/.test(document.referrer)) {
    const back = document.getElementById("back-link");
    back.href = "eleve.html";
    back.textContent = "← Retour à l'espace élève";
  }

  const NIVEAU_SYMBOL = { 1: "①", 2: "②", 3: "③", 4: "④" };

  let bulletin, eleve;
  try {
    const [bulletins, classe] = await Promise.all([EWK.fetchJSON("bulletins.json"), EWK.fetchJSON("classe.json")]);
    bulletin = id ? bulletins.find((b) => b.id === id) : bulletins[bulletins.length - 1];
    if (!bulletin) throw new Error("introuvable");
    eleve = classe[0];
  } catch (e) {
    doc.innerHTML = "<p>Ce bulletin est introuvable.</p>";
    return;
  }

  document.title = `Bulletin — ${bulletin.periode}`;

  function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  function section(html) {
    doc.appendChild(el(`<section class="fp-section">${html}</section>`));
  }

  const nomComplet = eleve ? `${eleve.prenom} ${eleve.nom}`.trim() : "Marin";

  section(`
    <div class="fp-head">
      <span class="disc disc--small" aria-hidden="true"></span>
      <div>
        <div class="fp-head-title">Bulletin &mdash; ${bulletin.periode}</div>
        <div class="fp-head-matiere">${nomComplet} &middot; L'École du Weekend</div>
      </div>
    </div>
  `);

  const matieres = bulletin.matieres || [];
  if (matieres.length) {
    section(`
      <h2>Matières notées</h2>
      <table class="fp-bulletin-table">
        <tbody>
          ${matieres
            .map(
              (m) => `
            <tr>
              <th>${m.nom}</th>
              <td class="fp-bulletin-niveau">${NIVEAU_SYMBOL[m.niveau] || ""}</td>
              <td>${m.appreciation || ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      <p class="fp-legend">&#9312; Non atteint &middot; &#9313; Partiellement atteint &middot; &#9314; Atteint &middot; &#9315; Excellente maîtrise</p>
    `);
  }

  if (bulletin.badges && bulletin.badges.length) {
    section(`<h2>Badges obtenus</h2><p>${bulletin.badges.join(", ")}</p>`);
  }

  if (bulletin.mot) {
    section(`<h2>Commentaire général</h2><p class="fp-mot">&laquo;&nbsp;${bulletin.mot}&nbsp;&raquo;</p>`);
  }

  section(`
    <div class="fp-signature">
      <div class="fp-signature-text">
        <p>Directeur de l'École du Weekend,</p>
        <p class="fp-signature-name">Maël DOMENECH</p>
      </div>
      <svg class="fp-signature-scribble" viewBox="0 0 200 90" aria-hidden="true">
        <path d="M8,58 Q45,32 70,52 Q85,64 78,42 Q70,14 100,10 Q135,6 128,35 Q122,58 100,50 Q80,44 78,60 Q76,80 70,58 M60,26 L92,32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `);
})();
