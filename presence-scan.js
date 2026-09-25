(async function () {
  const STORAGE_KEY = "ewk_admin_token";
  const REPO = "Cocon-famille/site-ewk";
  const API = `https://api.github.com/repos/${REPO}/contents/data`;
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";

  const token = localStorage.getItem(STORAGE_KEY);
  const guard = document.getElementById("presence-guard");
  const scanArea = document.getElementById("presence-scan-area");
  const input = document.getElementById("scan-input");
  const statusEl = document.getElementById("scan-status");

  if (!token) {
    guard.hidden = false;
    guard.className = "scan-status scan-status--error";
    guard.innerHTML = 'Connecte-toi depuis <a href="admin.html">l\'admin</a> d\'abord (jeton requis pour enregistrer l\'appel).';
    scanArea.hidden = true;
    return;
  }

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

  const sha = {};
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
    const res = await fetch(`${API}/${file}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: b64EncodeUnicode(JSON.stringify(data, null, 2) + "\n"),
        sha: sha[file],
        branch: "main",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Écriture de ${file} : HTTP ${res.status}`);
    }
    const json = await res.json();
    sha[file] = json.content.sha;
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "scan-status" + (kind ? ` scan-status--${kind}` : "");
  }

  function todaysCours(edt) {
    const semaine = EWK.currentSemaine();
    const jourNum = new Date().getDay();
    const jour = jourNum === 6 ? "samedi" : jourNum === 0 ? "dimanche" : null;
    if (!jour) return { semaine, jour: null, matieres: [] };
    return { semaine, jour, matieres: (edt[semaine]?.[jour] || []).map((c) => c.matiere) };
  }

  let busy = false;
  const accounts = {};
  const codeToAccount = {};

  async function loadAccounts() {
    const [accountsRes, codes, prenoms] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/accounts?select=id,holder_name&archived=eq.false`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }),
      EWK.fetchJSON("scan-codes.json"),
      EWK.fetchJSON("prenoms.json"),
    ]);
    if (!accountsRes.ok) throw new Error(`HTTP ${accountsRes.status}`);
    const rows = await accountsRes.json();
    rows.forEach((r) => (accounts[r.id] = prenoms[r.id] || r.holder_name));
    Object.entries(codes).forEach(([accountId, code]) => (codeToAccount[code] = accountId));
  }

  async function recordPresence(accountId) {
    const edt = await EWK.fetchJSON("edt.json");
    const { semaine, jour, matieres } = todaysCours(edt);
    const presences = await ghGet("presences.json");
    const entry = {
      id: String(Date.now()),
      date: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      accountId,
      nom: accounts[accountId],
      semaine,
      jour,
      matieres,
    };
    presences.push(entry);
    await ghPut("presences.json", presences, `Appel : ${entry.nom} présent (${entry.date})`);
    return entry;
  }

  async function handleCode(code) {
    if (busy) return;
    const accountId = codeToAccount[code];
    if (!accountId) {
      setStatus("Code inconnu.", "error");
      return;
    }

    busy = true;
    setStatus("Enregistrement…");
    try {
      const entry = await recordPresence(accountId);
      const matiere = entry.matieres.length ? ` — ${entry.matieres.join(", ")}` : "";
      setStatus(`Présence enregistrée : ${entry.nom}${matiere}`, "ok");
    } catch (err) {
      setStatus(`Échec : ${err.message}`, "error");
    }
    setTimeout(() => {
      busy = false;
      setStatus("Prêt à scanner la carte suivante.");
    }, 2000);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = input.value.trim();
    input.value = "";
    if (!/^\d{8}$/.test(code)) {
      setStatus("Code invalide (8 chiffres attendus).", "error");
      return;
    }
    handleCode(code);
  });

  document.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") input.focus();
  });

  try {
    await loadAccounts();
    setStatus("Prêt à scanner.");
    input.focus();
  } catch (err) {
    setStatus(`Impossible de charger les comptes : ${err.message}`, "error");
  }
})();
