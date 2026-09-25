(function () {
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";
  const COMPANY_ID = "ewk-cantine";

  const input = document.getElementById("scan-input");
  const statusEl = document.getElementById("scan-status");

  let busy = false;
  const accounts = {};
  const codeToAccount = {};

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "scan-status" + (kind ? ` scan-status--${kind}` : "");
  }

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
      await chargeAccount(accountId);
      setStatus(`Repas enregistré pour ${accounts[accountId]} — à valider dans Crédit Domestique.`, "ok");
    } catch (err) {
      setStatus(`Échec : ${err.message}`, "error");
    }
    setTimeout(() => {
      busy = false;
      setStatus("Prêt à scanner la prochaine carte.");
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

  (async function start() {
    try {
      await loadAccounts();
      setStatus("Prêt à scanner.");
      input.focus();
    } catch (err) {
      setStatus(`Impossible de charger les comptes : ${err.message}`, "error");
    }
  })();
})();
