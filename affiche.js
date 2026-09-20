(async function () {
  const params = new URLSearchParams(location.search);
  const type = params.get("type") || "reglement";
  const root = document.getElementById("poster");

  document.getElementById("print-btn").addEventListener("click", () => window.print());

  if (type === "inscription" || /eleve\.html/.test(document.referrer)) {
    const back = document.getElementById("back-link");
    back.href = "eleve.html";
    back.textContent = "← Retour à l'espace élève";
  }

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

  if (type === "fiche") {
    root.className = "poster poster--fiche";
    let fiche = null;
    try {
      const fiches = await EWK.fetchJSON("fiches.json");
      const id = params.get("fiche");
      fiche = id ? fiches.find((f) => f.id === id) : fiches[fiches.length - 1];
    } catch (e) {
      /* rien à afficher */
    }
    if (!fiche) {
      root.appendChild(el(`<div class="poster-inner"><p class="poster-sub" style="color:var(--ink)">Aucune fiche à imprimer.</p></div>`));
    } else {
      root.appendChild(
        el(`
        <div class="poster-fiche">
          <div class="poster-fiche-head">
            <span class="disc disc--small" aria-hidden="true"></span>
            <span class="poster-fiche-title">L'École du Weekend</span>
            <span class="poster-fiche-ref">FICHE N&deg; ${String(fiche.id).slice(-3).padStart(3, "0")}</span>
          </div>
          <table class="poster-fiche-table">
            <tbody>
              <tr><th>Date</th><td>${fiche.date}</td></tr>
              <tr><th>Matière</th><td>${fiche.matiere}</td></tr>
              <tr><th>Durée</th><td>${fiche.duree}</td></tr>
              <tr><th>Compris aujourd'hui</th><td>${fiche.compris}</td></tr>
              <tr><th>Badge</th><td>${fiche.badge ? `<span class="poster-fiche-badge">${fiche.badge}</span>` : "&mdash;"}</td></tr>
            </tbody>
          </table>
          <p class="poster-fiche-foot">L'École du Weekend &mdash; direction&nbsp;: Maël</p>
        </div>
      `)
      );
    }
  }

  if (type === "couverture") {
    root.className = "poster poster--couverture";
    root.innerHTML = `
      <div class="poster-couverture-stripe"></div>
      <div class="poster-inner">
        <span class="disc poster-logo" aria-hidden="true"></span>
        <h1 class="poster-title">L'École<br>du Weekend</h1>
        <p class="poster-decerne">On apprend mieux<br>quand personne n'est obligé.</p>
        <p class="poster-eyebrow" style="margin-top:24px">Classeur de cours</p>
        <p class="poster-footer" style="margin-top:40px">Direction&nbsp;: Maël</p>
      </div>
      <div class="poster-couverture-stripe"></div>
    `;
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

  if (type === "edt") {
    root.className = "poster poster--edt";
    let edt = { A: {}, B: {} };
    try {
      edt = await EWK.fetchJSON("edt.json");
    } catch (e) {
      /* affiche vide si les données ne chargent pas */
    }
    const sorted = (courses) => [...(courses || [])].sort((a, b) => a.heure.localeCompare(b.heure));
    const chips = (courses) =>
      sorted(courses)
        .map((c) => {
          const col = EWK.COLORS[c.couleur] || EWK.COLORS.orange;
          return `<span class="poster-edt-chip" style="background:${col.bg};color:${col.text}"><b>${c.heure}</b> ${c.matiere}</span>`;
        })
        .join("") || '<span class="poster-edt-empty">&mdash;</span>';
    root.appendChild(
      el(`
      <div class="poster-inner poster-inner--edt">
        <span class="disc poster-logo" aria-hidden="true" style="--size:80px"></span>
        <h1 class="poster-title" style="font-size:44px">Emploi du temps</h1>
        <div class="poster-edt-grid">
          <div class="poster-edt-semaine">
            <div class="poster-edt-semaine-label">Semaine A</div>
            <div class="poster-edt-day"><span class="poster-edt-day-label">Samedi</span>${chips(edt.A?.samedi)}</div>
            <div class="poster-edt-day"><span class="poster-edt-day-label">Dimanche</span>${chips(edt.A?.dimanche)}</div>
          </div>
          <div class="poster-edt-semaine">
            <div class="poster-edt-semaine-label">Semaine B</div>
            <div class="poster-edt-day"><span class="poster-edt-day-label">Samedi</span>${chips(edt.B?.samedi)}</div>
            <div class="poster-edt-day"><span class="poster-edt-day-label">Dimanche</span>${chips(edt.B?.dimanche)}</div>
          </div>
        </div>
      </div>
    `)
    );
  }

  if (type === "fournitures") {
    root.className = "poster poster--reglement";
    root.appendChild(
      el(`
      <div class="poster-inner">
        <span class="disc poster-logo" aria-hidden="true"></span>
        <p class="poster-eyebrow">Rentrée 2026-2027</p>
        <h1 class="poster-title">Liste de<br>fournitures</h1>
        <ol class="poster-rules">
          <li><span class="poster-rule-num">1</span>Un cahier à plusieurs compartiments (le petit plus que le directeur adore).</li>
          <li><span class="poster-rule-num">2</span>Un crayon, une gomme, et une trousse pour les ranger.</li>
          <li><span class="poster-rule-num">3</span>Un classeur, pour garder les fiches.</li>
          <li><span class="poster-rule-num">4</span>Un goûter, pour la pause entre deux exercices.</li>
          <li><span class="poster-rule-num">5</span>Une bonne humeur. Celle-là, elle est obligatoire.</li>
        </ol>
      </div>
    `)
    );
  }

  if (type === "inscription") {
    root.className = "poster poster--inscription";
    root.appendChild(
      el(`
      <div class="poster-inscription">
        <div class="poster-inscription-head">
          <span class="disc disc--small" aria-hidden="true"></span>
          <div>
            <div class="poster-inscription-title">L'École du Weekend</div>
            <div class="poster-inscription-sub">Fiche d'inscription &mdash; Rentrée 2026-2027</div>
            <div class="poster-inscription-sub">À remplir par le responsable légal</div>
          </div>
        </div>

        <div class="poster-inscription-field">
          <label for="insc-nom">Nom de famille de l'élève</label>
          <input id="insc-nom" class="poster-inscription-input" type="text">
        </div>

        <div class="poster-inscription-field">
          <label for="insc-prenom">Prénom de l'élève</label>
          <input id="insc-prenom" class="poster-inscription-input" type="text">
        </div>

        <div class="poster-inscription-field">
          <label for="insc-naissance">Date de naissance</label>
          <input id="insc-naissance" class="poster-inscription-input poster-inscription-input--short" type="date">
        </div>

        <div class="poster-inscription-field">
          <label for="insc-niveau">Niveau</label>
          <select id="insc-niveau" class="poster-inscription-input poster-inscription-input--short">
            <option value="">&mdash;</option>
            <option value="IE1">IE1 &middot; PS ou moins</option>
            <option value="IE2">IE2 &middot; MS</option>
            <option value="IE3">IE3 &middot; CP</option>
            <option value="IE4">IE4 &middot; CE1</option>
            <option value="IE5">IE5 &middot; CE2 et plus</option>
          </select>
        </div>

        <div class="poster-inscription-field">
          <label for="insc-responsable">Nom du responsable légal</label>
          <input id="insc-responsable" class="poster-inscription-input" type="text">
        </div>

        <div class="poster-inscription-field">
          <label for="insc-contact">Téléphone ou e-mail de contact</label>
          <input id="insc-contact" class="poster-inscription-input" type="text">
        </div>

        <div class="poster-inscription-field">
          <label for="insc-info">Informations utiles (allergies, points d'attention)</label>
          <textarea id="insc-info" class="poster-inscription-input poster-inscription-textarea" rows="2"></textarea>
        </div>

        <div class="poster-inscription-signatures">
          <div class="poster-inscription-signature">
            <input class="poster-inscription-input" type="text">
            <label>Signature du responsable légal</label>
          </div>
          <div class="poster-inscription-signature">
            <input class="poster-inscription-input" type="text">
            <label>Signature de la direction</label>
          </div>
        </div>

        <div class="poster-inscription-submit no-print">
          <button id="insc-send" type="button">Envoyer l'inscription</button>
          <p id="insc-status" class="poster-inscription-status" hidden></p>
        </div>
      </div>
    `)
    );

    document.getElementById("insc-send").addEventListener("click", async () => {
      const btn = document.getElementById("insc-send");
      const status = document.getElementById("insc-status");
      const payload = {
        nom: document.getElementById("insc-nom").value.trim(),
        prenom: document.getElementById("insc-prenom").value.trim(),
        naissance: document.getElementById("insc-naissance").value.trim(),
        niveau: document.getElementById("insc-niveau").value,
        responsable: document.getElementById("insc-responsable").value.trim(),
        contact: document.getElementById("insc-contact").value.trim(),
        info: document.getElementById("insc-info").value.trim(),
      };
      if (!payload.nom || !payload.prenom || !payload.naissance || !payload.niveau) {
        status.hidden = false;
        status.classList.add("poster-inscription-status--error");
        status.textContent = "Merci de remplir au moins le nom, le prénom, la date de naissance et le niveau.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Envoi…";
      status.hidden = true;
      status.classList.remove("poster-inscription-status--error");
      try {
        const res = await fetch("/api/classe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Erreur (HTTP ${res.status})`);
        status.hidden = false;
        status.textContent = "Inscription envoyée. Merci !";
        btn.textContent = "Envoyé ✓";
      } catch (err) {
        status.hidden = false;
        status.classList.add("poster-inscription-status--error");
        status.textContent = `Échec de l'envoi : ${err.message}`;
        btn.disabled = false;
        btn.textContent = "Envoyer l'inscription";
      }
    });
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
