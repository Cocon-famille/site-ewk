(async function () {
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";

  const grid = document.getElementById("cantine-grid");
  document.getElementById("print-btn").addEventListener("click", () => window.print());

  try {
    const [accountsRes, codes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/accounts?select=id,holder_name,role&archived=eq.false&role=in.(admin,parent,child)&order=holder_name`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      ),
      EWK.fetchJSON("scan-codes.json"),
    ]);
    if (!accountsRes.ok) throw new Error(`HTTP ${accountsRes.status}`);
    const accounts = await accountsRes.json();

    grid.innerHTML = "";
    if (!accounts.length) {
      grid.innerHTML = "<p>Aucun compte trouvé dans Crédit Domestique.</p>";
      return;
    }

    accounts.forEach((a) => {
      const code = codes[a.id];
      const card = document.createElement("div");
      card.className = "cantine-card";
      card.innerHTML = `
        <div class="cantine-card-photo" aria-hidden="true">PHOTO</div>
        <div class="cantine-card-info">
          <span class="disc disc--small" aria-hidden="true"></span>
          <div class="cantine-card-name">${a.holder_name}</div>
          <div class="cantine-card-label">Carte cantine &middot; L'École du Weekend</div>
          ${
            code
              ? `<svg class="cantine-card-barcode"></svg><div class="cantine-card-code">${code}</div>`
              : `<p class="cantine-card-code">Pas de code attribué</p>`
          }
        </div>
      `;
      grid.appendChild(card);
      if (code) {
        JsBarcode(card.querySelector(".cantine-card-barcode"), code, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: false,
          margin: 0,
        });
      }
    });
  } catch (e) {
    grid.innerHTML = "<p>Impossible de charger les comptes depuis Crédit Domestique.</p>";
  }
})();
