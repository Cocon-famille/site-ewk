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
      const fiches = await Promise.all([loadFiches(), loadPrep(), loadBulletins()]).then((r) => r[0]);
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

  async function loadBulletins() {
    const bulletins = await ghGet("bulletins.json");
    const list = document.getElementById("bulletin-list");
    list.innerHTML = "";
    [...bulletins].reverse().forEach((b) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const pdfLink = b.attachment ? ` &middot; <a href="${b.attachment}" target="_blank" rel="noopener">PDF</a>` : "";
      row.innerHTML = `<span>${b.periode} &mdash; ${(b.matieres || []).join(", ")}${pdfLink}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-row-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", async () => {
        const next = bulletins.filter((x) => x.id !== b.id);
        await ghPut("bulletins.json", next, `Supprime le bulletin ${b.periode}`);
        loadBulletins();
      });
      row.appendChild(del);
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

      const [bulletins, fiches] = await Promise.all([ghGet("bulletins.json"), ghGet("fiches.json")]);
      const badgeSet = new Set(fiches.map((f) => f.badge).filter(Boolean));
      bulletins.push({
        id: String(Date.now()),
        periode: fd.get("periode"),
        matieres: (fd.get("matieres") || "").split(",").map((s) => s.trim()).filter(Boolean),
        points_forts: fd.get("points_forts"),
        mot: fd.get("mot"),
        badges: [...badgeSet],
        attachment,
      });
      await ghPut("bulletins.json", bulletins, `Ajoute le bulletin ${fd.get("periode")}`);
      form.reset();
      showStatus(status, "Bulletin créé. Visible sur l'espace élève dans une minute environ.");
      loadBulletins();
    } catch (err) {
      showStatus(status, err.message, true);
    }
  });

  // --- affiches ---

  function populatePosterFicheSelect(fiches) {
    const select = document.getElementById("poster-fiche-select");
    select.innerHTML = "";
    [...fiches].reverse().forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.date} — ${f.matiere}${f.badge ? ` (${f.badge})` : ""}`;
      select.appendChild(opt);
    });
  }

  document.getElementById("poster-badge-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("poster-fiche-select").value;
    if (!id) return;
    window.open(`affiche.html?type=badge&fiche=${encodeURIComponent(id)}`, "_blank");
  });

  document.getElementById("poster-diplome-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const params = new URLSearchParams({ type: "diplome", titre: fd.get("titre"), message: fd.get("message") });
    window.open(`affiche.html?${params.toString()}`, "_blank");
  });

  boot();
})();
