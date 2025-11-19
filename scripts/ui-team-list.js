import { getTeamsFiltered, getStadiumById } from "./store.js";

function formatLocation(stadium) {
  const city = stadium?.location?.city ?? "";
  const state = stadium?.location?.state ?? "";
  if (!city && !state) return "N/A";
  return [city, state].filter(Boolean).join(", ");
}

export function renderTeamList(options = {}) {
  const { filter = null, sortKey = "name" } = options ?? {};
  const tbody = document.querySelector("#team-table tbody");
  if (!tbody) return;

  const appliedFilter = filter ?? {};
  const teams = Object.keys(appliedFilter).length ? getTeamsFiltered(appliedFilter) : getTeamsFiltered();

  if (!teams.length) {
    const label = appliedFilter?.division ? `${appliedFilter.conference} ${appliedFilter.division}` : "teams";
    tbody.innerHTML = `<tr><td colspan="5" class="muted">No ${label} found.</td></tr>`;
    return;
  }

  const sorted = teams.slice().sort((a, b) => {
    if (sortKey === "conference") {
      const confCmp = a.conference.localeCompare(b.conference);
      if (confCmp !== 0) return confCmp;
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  const rows = sorted.map(team => {
    const stadium = getStadiumById(team.stadiumId);
    const stadiumName = stadium?.name ?? "N/A";
    const location = formatLocation(stadium);
    return `
      <tr data-team="${team.name}">
        <td>${team.name}</td>
        <td>${stadiumName}</td>
        <td>${team.conference}</td>
        <td>${team.division}</td>
        <td>${location}</td>
      </tr>
    `;
  });

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
