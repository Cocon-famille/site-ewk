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

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

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

    // Débite directement le payeur et crédite la cantine (paiement validé
    // automatiquement, sans passer par l'écran d'acceptation de Crédit
    // Domestique), en reproduisant l'écriture double que fait acceptCharge().
    const balRes = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?id=in.(${accountId},${COMPANY_ID})&select=id,balance`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!balRes.ok) throw new Error(`Erreur (HTTP ${balRes.status})`);
    const balances = await balRes.json();
    const payer = balances.find((r) => r.id === accountId);
    const company = balances.find((r) => r.id === COMPANY_ID);
    if (!payer || !company) throw new Error("Compte introuvable.");

    const payerBalanceAfter = payer.balance - prixCentimes;
    const companyBalanceAfter = company.balance + prixCentimes;
    const now = new Date().toISOString();
    const transactionId = crypto.randomUUID();

    const entriesRes = await fetch(`${SUPABASE_URL}/rest/v1/entries`, {
      method: "POST",
      headers,
      body: JSON.stringify([
        {
          id: crypto.randomUUID(),
          account_id: accountId,
          date: now,
          label: raison,
          kind: "payment",
          debit: prixCentimes,
          credit: null,
          balance_after: payerBalanceAfter,
          counterparty_id: COMPANY_ID,
          by_admin: false,
          transaction_id: transactionId,
        },
        {
          id: crypto.randomUUID(),
          account_id: COMPANY_ID,
          date: now,
          label: raison,
          kind: "payment",
          debit: null,
          credit: prixCentimes,
          balance_after: companyBalanceAfter,
          counterparty_id: accountId,
          by_admin: false,
          transaction_id: transactionId,
        },
      ]),
    });
    if (!entriesRes.ok) {
      const err = await entriesRes.json().catch(() => ({}));
      throw new Error(err.message || `Erreur écritures (HTTP ${entriesRes.status})`);
    }

    const [payerPatch, companyPatch] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ balance: payerBalanceAfter }),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${COMPANY_ID}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ balance: companyBalanceAfter }),
      }),
    ]);
    if (!payerPatch.ok || !companyPatch.ok) {
      throw new Error("Erreur lors de la mise à jour des soldes.");
    }

    const chargeRes = await fetch(`${SUPABASE_URL}/rest/v1/charges`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: crypto.randomUUID(),
        company_id: COMPANY_ID,
        payer_id: accountId,
        amount: prixCentimes,
        reason: raison,
        status: "accepted",
        requested_at: now,
        responded_at: now,
      }),
    });
    if (!chargeRes.ok) {
      const err = await chargeRes.json().catch(() => ({}));
      throw new Error(err.message || `Erreur charge (HTTP ${chargeRes.status})`);
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
      setStatus(`Repas payé pour ${accounts[accountId]} — paiement validé automatiquement.`, "ok");
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
