(async function () {
  const statusEl = document.getElementById("semaine-status");
  const slot = document.getElementById("edt-slot");
  const current = EWK.currentSemaine();

  statusEl.dataset.open = "true";
  statusEl.textContent = `Cette semaine : Semaine ${current}`;

  try {
    const edt = await EWK.fetchJSON("edt.json");
    slot.innerHTML = "";
    slot.appendChild(edtTable(edt, current));
  } catch (e) {
    slot.innerHTML = '<p class="section-lede">Emploi du temps indisponible pour le moment.</p>';
  }

  function edtTable(edt, current) {
    const table = document.createElement("table");
    table.className = "edt-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Samedi</th>
          <th>Dimanche</th>
        </tr>
      </thead>
      <tbody>
        <tr class="${current === "A" ? "edt-row--current" : ""}">
          <th>Semaine A</th>
          <td>${edt.A?.samedi || "&mdash;"}</td>
          <td>${edt.A?.dimanche || "&mdash;"}</td>
        </tr>
        <tr class="${current === "B" ? "edt-row--current" : ""}">
          <th>Semaine B</th>
          <td>${edt.B?.samedi || "&mdash;"}</td>
          <td>${edt.B?.dimanche || "&mdash;"}</td>
        </tr>
      </tbody>
    `;
    return table;
  }
})();
