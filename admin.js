(function () {
  const REPO = "Cocon-famille/site-ewk";
  const API = `https://api.github.com/repos/${REPO}/contents/data`;
  const STORAGE_KEY = "ewk_admin_token";

  const loginPanel = document.getElementById("admin-login");
  const app = document.getElementById("admin-app");
  const whoami = document.getElementById("admin-whoami");
  const logoutLink = document.getElementById("admin-logout");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  let token = localStorage.getItem(STORAGE_KEY);
  const sha = {}; // file -> current sha, filled in as we read/write

  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode("0x" + p1)));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str.replace(/\s/g, ""))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }

  async function ghGet(file) {
    const res = await fetch(`${API}/${file}`, {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`Lecture de ${file} : HTTP ${res.status}`);
    const json = await res.json();
    sha[file] = json.sha;
    return JSON.parse(b64DecodeUnicode(json.content));
  }

  async function ghPut(file, data, message) {
    const body = {
      message,
      content: b64EncodeUnicode(JSON.stringify(data, null, 2) + "\n"),
      sha: sha[file],
      branch: "main",
    };
    const res = await fetch(`${API}/${file}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Écriture de ${file} : HTTP ${res.status}`);
    }
    const json = await res.json();
    sha[file] = json.content.sha;
  }

  async function ghCreateFile(path, base64Content, message) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content: base64Content, branch: "main" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Envoi du fichier : HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.content.path;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
      reader.readAsDataURL(file);
    });
  }

  function showStatus(el, text, isError) {
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle("admin-status--error", !!isError);
    if (!isError) setTimeout(() => (el.hidden = true), 4000);
  }

  // --- auth ---

  async function tryConnect(candidateToken) {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${candidateToken}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("Jeton invalide ou sans accès.");
    return res.json();
  }

  async function boot() {
    if (!token) {
      loginPanel.hidden = false;
      app.hidden = true;
      return;
    }
    try {
      const user = await tryConnect(token);
      whoami.textContent = `Connecté : ${user.login}`;
      logoutLink.hidden = false;
      loginPanel.hidden = true;
      app.hidden = false;
      const fiches = await Promise.all([
        loadFiches(),
        loadPrep(),
        loadBulletins(),
        loadEdt(),
        loadMessages(),
        loadClasse(),
      ]).then((r) => r[0]);
      populatePosterFicheSelect(fiches);
    } catch (e) {
      token = null;
      localStorage.removeItem(STORAGE_KEY);
      loginPanel.hidden = false;
      app.hidden = true;
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const candidate = document.getElementById("login-token").value.trim();
    loginError.hidden = true;
    try {
      await tryConnect(candidate);
      token = candidate;
      localStorage.setItem(STORAGE_KEY, token);
      await boot();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    token = null;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // --- tabs ---

  document.querySelectorAll(".admin-tab-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
      document.querySelectorAll(".admin-tab-link").forEach((l) => l.classList.toggle("is-active", l === link));
    });
  });
  document.querySelector(".admin-tab-link").classList.add("is-active");

  // --- fiches ---

  async function loadFiches() {
    const fiches = await ghGet("fiches.json");
    const list = document.getElementById("fiche-list");
    list.innerHTML = "";
    [...fiches].reverse().forEach((f) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `<span>${f.date} &mdash; ${f.matiere} ${f.badge ? `<span class="pill">${f.badge}</span>` : ""}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", async () => {
        const next = fiches.filter((x) => x.id !== f.id);
        await ghPut("fiches.json", next, `Supprime la fiche du ${f.date}`);
        loadFiches();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
    return fiches;
  }

  document.getElementById("fiche-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("fiche-status");
    try {
      const fiches = await ghGet("fiches.json");
      const fd = new FormData(form);
      fiches.push({
        id: String(Date.now()),
        date: fd.get("date"),
        matiere: fd.get("matiere"),
        duree: fd.get("duree"),
        compris: fd.get("compris"),
        badge: fd.get("badge") || null,
        coursId: fd.get("coursId") || null,
      });
      await ghPut("fiches.json", fiches, `Ajoute la fiche du ${fd.get("date")}`);
      form.reset();
      showStatus(status, "Fiche ajoutée. Visible sur le site dans une minute environ.");
      loadFiches();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- prep ---

  async function loadPrep() {
    const items = await ghGet("prep.json");
    const list = document.getElementById("prep-list");
    list.innerHTML = "";
    [...items].reverse().forEach((p) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `<span><strong>${p.matiere}</strong> &mdash; ${p.idee}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Fait / supprimer";
      del.addEventListener("click", async () => {
        const next = items.filter((x) => x.id !== p.id);
        await ghPut("prep.json", next, "Retire une idée de prépa");
        loadPrep();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
    return items;
  }

  document.getElementById("prep-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const items = await ghGet("prep.json");
      const fd = new FormData(form);
      items.push({ id: String(Date.now()), matiere: fd.get("matiere"), idee: fd.get("idee") });
      await ghPut("prep.json", items, `Ajoute une idée de prépa (${fd.get("matiere")})`);
      form.reset();
      loadPrep();
    } catch (err) {
      alert(err.message);
    }
  });

  // --- bulletins ---

  function matiereRow(nom = "", niveau = "3", appreciation = "") {
    const row = document.createElement("div");
    row.className = "bulletin-matiere-row";
    row.innerHTML = `
      <input type="text" class="bulletin-matiere-nom" list="matieres-datalist" placeholder="Matière" value="${nom}">
      <select class="bulletin-matiere-niveau">
        <option value="1">&#9312; Non atteint</option>
        <option value="2">&#9313; Partiellement atteint</option>
        <option value="3">&#9314; Atteint</option>
        <option value="4">&#9315; Excellente maîtrise</option>
      </select>
      <textarea class="bulletin-matiere-appreciation" rows="2" placeholder="Appréciation"></textarea>
      <button type="button" class="bulletin-matiere-remove" aria-label="Retirer cette matière">&times;</button>
    `;
    row.querySelector(".bulletin-matiere-niveau").value = niveau;
    row.querySelector(".bulletin-matiere-appreciation").value = appreciation;
    row.querySelector(".bulletin-matiere-remove").addEventListener("click", () => row.remove());
    return row;
  }

  function resetMatieresRows() {
    const rows = document.getElementById("bulletin-matieres-rows");
    rows.innerHTML = "";
    rows.appendChild(matiereRow());
  }

  document.getElementById("bulletin-add-matiere").addEventListener("click", () => {
    document.getElementById("bulletin-matieres-rows").appendChild(matiereRow());
  });
  resetMatieresRows();

  async function populateMatieresDatalist() {
    try {
      const [cours, edt] = await Promise.all([EWK.fetchJSON("cours.json"), EWK.fetchJSON("edt.json")]);
      const set = new Set();
      cours.forEach((c) => c.matiere && set.add(c.matiere));
      ["A", "B"].forEach((s) =>
        ["samedi", "dimanche"].forEach((j) => (edt[s]?.[j] || []).forEach((c) => c.matiere && set.add(c.matiere)))
      );
      document.getElementById("matieres-datalist").innerHTML = [...set].map((m) => `<option value="${m}">`).join("");
    } catch (e) {
      /* pas grave si indisponible */
    }
  }
  populateMatieresDatalist();

  async function loadBulletins() {
    const bulletins = await ghGet("bulletins.json");
    const list = document.getElementById("bulletin-list");
    list.innerHTML = "";
    [...bulletins].reverse().forEach((b) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const pdfLink = b.attachment ? ` &middot; <a href="${b.attachment}" target="_blank" rel="noopener">PDF</a>` : "";
      const matieresLabel = (b.matieres || []).map((m) => m.nom).join(", ");
      row.innerHTML = `<span>${b.periode} &mdash; ${matieresLabel}${pdfLink}</span>`;
      const printLink = document.createElement("a");
      printLink.className = "admin-row-delete";
      printLink.href = `bulletin.html?bulletin=${encodeURIComponent(b.id)}`;
      printLink.target = "_blank";
      printLink.rel = "noopener";
      printLink.textContent = "Imprimer";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", async () => {
        const next = bulletins.filter((x) => x.id !== b.id);
        await ghPut("bulletins.json", next, `Supprime le bulletin ${b.periode}`);
        loadBulletins();
      });
      const actions = document.createElement("div");
      actions.className = "admin-row-actions";
      actions.appendChild(printLink);
      actions.appendChild(del);
      row.appendChild(actions);
      list.appendChild(row);
    });
    return bulletins;
  }

  document.getElementById("bulletin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("bulletin-status");
    try {
      const fd = new FormData(form);
      const file = document.getElementById("bulletin-file").files[0];

      let attachment = null;
      if (file) {
        showStatus(status, "Envoi du PDF…");
        const base64 = await readFileAsBase64(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        attachment = await ghCreateFile(
          `bulletins-files/${Date.now()}-${safeName}`,
          base64,
          `Ajoute la pièce jointe du bulletin ${fd.get("periode")}`
        );
      }

      const matieres = [...document.querySelectorAll("#bulletin-matieres-rows .bulletin-matiere-row")]
        .map((row) => ({
          nom: row.querySelector(".bulletin-matiere-nom").value.trim(),
          niveau: Number(row.querySelector(".bulletin-matiere-niveau").value),
          appreciation: row.querySelector(".bulletin-matiere-appreciation").value.trim(),
        }))
        .filter((m) => m.nom);

      const [bulletins, fiches] = await Promise.all([ghGet("bulletins.json"), ghGet("fiches.json")]);
      const badgeSet = new Set(fiches.map((f) => f.badge).filter(Boolean));
      bulletins.push({
        id: String(Date.now()),
        periode: fd.get("periode"),
        matieres,
        mot: fd.get("mot"),
        badges: [...badgeSet],
        attachment,
      });
      await ghPut("bulletins.json", bulletins, `Ajoute le bulletin ${fd.get("periode")}`);
      form.reset();
      resetMatieresRows();
      showStatus(status, "Bulletin créé. Visible sur l'espace élève dans une minute environ.");
      loadBulletins();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- affiches ---

  function populatePosterFicheSelect(fiches) {
    document.querySelectorAll(".poster-fiche-select").forEach((select) => {
      select.innerHTML = "";
      [...fiches].reverse().forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = `${f.date} — ${f.matiere}${f.badge ? ` (${f.badge})` : ""}`;
        select.appendChild(opt);
      });
    });
  }

  document.getElementById("poster-badge-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("poster-fiche-select").value;
    if (!id) return;
    window.open(`affiche.html?type=badge&fiche=${encodeURIComponent(id)}`, "_blank");
  });

  document.getElementById("poster-fiche-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("poster-fiche-select-print").value;
    if (!id) return;
    window.open(`affiche.html?type=fiche&fiche=${encodeURIComponent(id)}`, "_blank");
  });

  document.getElementById("poster-diplome-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const params = new URLSearchParams({ type: "diplome", titre: fd.get("titre"), message: fd.get("message") });
    window.open(`affiche.html?${params.toString()}`, "_blank");
  });

  // --- emploi du temps ---

  const JOUR_LABEL = { samedi: "Samedi", dimanche: "Dimanche" };

  async function loadEdt() {
    const edt = await ghGet("edt.json");
    const list = document.getElementById("edt-list");
    list.innerHTML = "";
    ["A", "B"].forEach((semaine) => {
      ["samedi", "dimanche"].forEach((jour) => {
        (edt[semaine]?.[jour] || []).forEach((course, index) => {
          const row = document.createElement("div");
          row.className = "admin-row";
          row.innerHTML = `<span>Semaine ${semaine} &middot; ${JOUR_LABEL[jour]} &middot; ${course.heure} &mdash; ${course.matiere} <span class="pill" style="background:${(EWK.COLORS[course.couleur] || EWK.COLORS.orange).bg};color:${(EWK.COLORS[course.couleur] || EWK.COLORS.orange).text}">${course.couleur}</span></span>`;
          const del = document.createElement("button");
          del.type = "button";
          del.className = "admin-row-delete";
          del.textContent = "Supprimer";
          del.addEventListener("click", async () => {
            edt[semaine][jour].splice(index, 1);
            await ghPut("edt.json", edt, `Retire un cours (semaine ${semaine}, ${jour})`);
            loadEdt();
          });
          row.appendChild(del);
          list.appendChild(row);
        });
      });
    });
    return edt;
  }

  document.getElementById("edt-add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("edt-status");
    try {
      const edt = await ghGet("edt.json");
      const fd = new FormData(form);
      const semaine = fd.get("semaine");
      const jour = fd.get("jour");
      edt[semaine] = edt[semaine] || {};
      edt[semaine][jour] = edt[semaine][jour] || [];
      edt[semaine][jour].push({ heure: fd.get("heure"), matiere: fd.get("matiere"), couleur: fd.get("couleur") });
      await ghPut("edt.json", edt, `Ajoute un cours (semaine ${semaine}, ${jour})`);
      form.reset();
      showStatus(status, "Cours ajouté. Visible sur le site dans une minute environ.");
      loadEdt();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- messages ---

  async function loadMessages() {
    const messages = await ghGet("messages.json");
    const list = document.getElementById("message-list");
    list.innerHTML = "";
    [...messages].reverse().forEach((m) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `<span><strong>${m.date}</strong> &mdash; ${m.texte}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", async () => {
        const next = messages.filter((x) => x.id !== m.id);
        await ghPut("messages.json", next, "Retire un message");
        loadMessages();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
    return messages;
  }

  document.getElementById("message-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("message-status");
    try {
      const messages = await ghGet("messages.json");
      const fd = new FormData(form);
      messages.push({ id: String(Date.now()), date: fd.get("date"), texte: fd.get("texte") });
      await ghPut("messages.json", messages, `Publie un message (${fd.get("date")})`);
      form.reset();
      showStatus(status, "Message publié. Visible sur l'espace élève dans une minute environ.");
      loadMessages();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- classe ---

  const NIVEAU_LABEL = { IE1: "IE1 · PS ou moins", IE2: "IE2 · MS", IE3: "IE3 · CP", IE4: "IE4 · CE1", IE5: "IE5 · CE2 et plus" };

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadClasse() {
    const classe = await ghGet("classe.json");
    const list = document.getElementById("classe-list");
    list.innerHTML = "";
    [...classe].reverse().forEach((e) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const extra = [
        e.responsable ? `Responsable : ${escapeHtml(e.responsable)}` : "",
        e.contact ? `Contact : ${escapeHtml(e.contact)}` : "",
        e.info ? `Infos : ${escapeHtml(e.info)}` : "",
      ]
        .filter(Boolean)
        .join(" &middot; ");
      row.innerHTML = `<span>${escapeHtml(e.nom)} <strong>${escapeHtml(e.prenom)}</strong> &mdash; ${escapeHtml(e.naissance)} <span class="pill">${NIVEAU_LABEL[e.niveau] || escapeHtml(e.niveau)}</span>${extra ? `<br><small>${extra}</small>` : ""}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", async () => {
        const next = classe.filter((x) => x.id !== e.id);
        await ghPut("classe.json", next, `Retire ${e.prenom} ${e.nom} de la classe`);
        loadClasse();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
    return classe;
  }

  document.getElementById("classe-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("classe-status");
    try {
      const classe = await ghGet("classe.json");
      const fd = new FormData(form);
      classe.push({
        id: String(Date.now()),
        nom: fd.get("nom"),
        prenom: fd.get("prenom"),
        naissance: fd.get("naissance"),
        niveau: fd.get("niveau"),
      });
      await ghPut("classe.json", classe, `Ajoute ${fd.get("prenom")} ${fd.get("nom")} à la classe`);
      form.reset();
      showStatus(status, "Élève ajouté à la classe.");
      loadClasse();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  document.getElementById("classe-export").addEventListener("click", async () => {
    const status = document.getElementById("classe-status");
    try {
      const classe = await ghGet("classe.json");
      const rows = [
        ["Nom de famille, Prénom", "Date de naissance", "Niveau", "Responsable légal", "Contact", "Infos utiles"],
        ...classe.map((e) => [
          `${e.nom}, ${e.prenom}`,
          e.naissance,
          NIVEAU_LABEL[e.niveau] || e.niveau,
          e.responsable || "",
          e.contact || "",
          e.info || "",
        ]),
      ];
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Classe 2026-2027");
      XLSX.writeFile(wb, "classe-2026-2027.xlsx");
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- cours (diaporamas) ---

  async function loadCours() {
    const list = document.getElementById("cours-list");
    try {
      const cours = await EWK.fetchJSON("cours.json");

      const ficheSelect = document.getElementById("fiche-cours-select");
      ficheSelect.innerHTML = '<option value="">Aucun</option>';
      cours.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.titre;
        ficheSelect.appendChild(opt);
      });

      list.innerHTML = "";
      cours.forEach((c) => {
        const row = document.createElement("div");
        row.className = "admin-row";
        row.innerHTML = `<span><strong>${c.titre}</strong> &mdash; ${c.matiere}</span>`;
        const link = document.createElement("a");
        link.className = "admin-row-delete";
        link.href = `diaporama.html?cours=${encodeURIComponent(c.id)}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Présenter";
        const ficheProfLink = document.createElement("a");
        ficheProfLink.className = "admin-row-delete";
        ficheProfLink.href = `fiche-prof.html?cours=${encodeURIComponent(c.id)}`;
        ficheProfLink.target = "_blank";
        ficheProfLink.rel = "noopener";
        ficheProfLink.textContent = "Fiche prof";
        const actions = document.createElement("div");
        actions.className = "admin-row-actions";
        actions.appendChild(link);
        actions.appendChild(ficheProfLink);
        row.appendChild(actions);
        list.appendChild(row);
      });
    } catch (e) {
      list.innerHTML = '<p class="section-lede">Cours indisponibles pour le moment.</p>';
    }
  }
  loadCours();

  boot();
})();
