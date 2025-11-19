import { getTeamsFiltered, NFC_NORTH_FILTER } from "./store.js";

export function renderTeamList() {
  const tbody = document.querySelector("#team-table tbody");
  const teams = getTeamsFiltered(NFC_NORTH_FILTER);
  if (!tbody) return;

  if (!teams.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No NFC North teams found.</td></tr>`;
    return;
  }

  const rows = teams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(t =>
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
