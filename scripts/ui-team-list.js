import { getTeamsSorted } from "./store.js";

export function renderTeamList(conference = "ALL") {
  const tbody = document.querySelector("#team-table tbody");
  const teams = getTeamsSorted(conference);
  const rows = teams.map(t =>
    `<tr data-team="${t.name}">
      <td>${t.name}</td>
      <td>${t.conference}</td>
      <td>${t.division}</td>
    </tr>`
  );
  tbody.innerHTML = rows.join("");

  // row click to open detail
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const name = tr.getAttribute("data-team");
      const ev = new CustomEvent("team:selected", { detail: { name } });
      window.dispatchEvent(ev);
    });
  });
}