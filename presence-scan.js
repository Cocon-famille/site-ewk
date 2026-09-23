(async function () {
  const STORAGE_KEY = "ewk_admin_token";
  const REPO = "Cocon-famille/site-ewk";
  const API = `https://api.github.com/repos/${REPO}/contents/data`;
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";

  const token = localStorage.getItem(STORAGE_KEY);
  const guard = document.getElementById("presence-guard");
  const video = document.getElementById("scan-video");
  const canvas = document.getElementById("scan-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const statusEl = document.getElementById("scan-status");

  if (!token) {
    guard.hidden = false;
    guard.className = "scan-status scan-status--error";
    guard.innerHTML = 'Connecte-toi depuis <a href="admin.html">l\'admin</a> d\'abord (jeton requis pour enregistrer l\'appel).';
    statusEl.hidden = true;
    video.hidden = true;
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

  let scanning = true;
  const accounts = {};

  async function loadAccounts() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=id,holder_name&archived=eq.false`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    rows.forEach((r) => (accounts[r.id] = r.holder_name));
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

  async function onDecoded(text) {
    if (!scanning) return;
    const m = /^EWK-CANTINE:(.+)$/.exec(text.trim());
    if (!m) return;
    const accountId = m[1];
    if (!accounts[accountId]) {
      setStatus("Carte non reconnue.", "error");
      return;
    }

    scanning = false;
    setStatus("Enregistrement…");
    try {
      const entry = await recordPresence(accountId);
      const matiere = entry.matieres.length ? ` — ${entry.matieres.join(", ")}` : "";
      setStatus(`Présence enregistrée : ${entry.nom}${matiere}`, "ok");
    } catch (err) {
      setStatus(`Échec : ${err.message}`, "error");
    }
    setTimeout(() => {
      scanning = true;
      setStatus("Prêt à scanner la carte suivante.");
    }, 3000);
  }

  function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) onDecoded(code.data);
    }
    requestAnimationFrame(tick);
  }

  async function start() {
    try {
      await loadAccounts();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      await video.play();
      setStatus("Prêt à scanner.");
      requestAnimationFrame(tick);
    } catch (err) {
      setStatus(`Impossible d'accéder à la caméra : ${err.message}`, "error");
    }
  }

  start();
})();
