(async function () {
  const SUPABASE_URL = "https://zalvstnzvxdcibnbdbwm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DR7KL1dgiv-y1wTXnA1X8Q_aeLSQ50H";

  const grid = document.getElementById("cantine-grid");
  document.getElementById("print-btn").addEventListener("click", () => window.print());

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?select=id,holder_name,role&archived=eq.false&role=in.(admin,parent,child)&order=holder_name`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const accounts = await res.json();

    grid.innerHTML = "";
    if (!accounts.length) {
      grid.innerHTML = "<p>Aucun compte trouvé dans Crédit Domestique.</p>";
      return;
    }

    accounts.forEach((a) => {
      const card = document.createElement("div");
      card.className = "cantine-card";
      card.innerHTML = `
        <div class="cantine-card-photo" aria-hidden="true">PHOTO</div>
        <div class="cantine-card-info">
          <span class="disc disc--small" aria-hidden="true"></span>
          <div class="cantine-card-name">${a.holder_name}</div>
          <div class="cantine-card-label">Carte cantine &middot; L'École du Weekend</div>
          <div class="cantine-card-qr"></div>
        </div>
      `;
      grid.appendChild(card);
      new QRCode(card.querySelector(".cantine-card-qr"), {
        text: `EWK-CANTINE:${a.id}`,
        width: 84,
        height: 84,
        correctLevel: QRCode.CorrectLevel.M,
      });
    });
  } catch (e) {
    grid.innerHTML = "<p>Impossible de charger les comptes depuis Crédit Domestique.</p>";
  }
})();
