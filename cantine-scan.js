(function () {
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";
  const COMPANY_ID = "ewk-cantine";

  const video = document.getElementById("scan-video");
  const canvas = document.getElementById("scan-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const statusEl = document.getElementById("scan-status");

  let scanning = true;
  const accounts = {};

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "scan-status" + (kind ? ` scan-status--${kind}` : "");
  }

  async function loadAccounts() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=id,holder_name&archived=eq.false`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    rows.forEach((r) => (accounts[r.id] = r.holder_name));
  }

  async function chargeAccount(accountId) {
    let prixCentimes = 350;
    let raison = "Cantine";
    try {
      const cfg = await fetch(`data/cantine.json?_=${Date.now()}`).then((r) => r.json());
      if (cfg.prixCentimes) prixCentimes = cfg.prixCentimes;
      if (cfg.raison) raison = cfg.raison;
    } catch (e) {
      /* prix par défaut si le fichier est indisponible */
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/charges`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        company_id: COMPANY_ID,
        payer_id: accountId,
        amount: prixCentimes,
        reason: raison,
        status: "pending",
        requested_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur (HTTP ${res.status})`);
    }
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
      await chargeAccount(accountId);
      setStatus(`Repas enregistré pour ${accounts[accountId]} — à valider dans Crédit Domestique.`, "ok");
    } catch (err) {
      setStatus(`Échec : ${err.message}`, "error");
    }
    setTimeout(() => {
      scanning = true;
      setStatus("Prêt à scanner la prochaine carte.");
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
