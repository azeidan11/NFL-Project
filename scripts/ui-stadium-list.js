import { getStadiumTeamPairs } from "./store.js";

function formatLocation(stadium) {
  const city = stadium?.location?.city ?? "";
  const state = stadium?.location?.state ?? "";
  return [city, state].filter(Boolean).join(", ");
}

function formatTeams(teams) {
  if (!teams?.length) return "N/A";
  return teams.map(team => team.name).join(", ");
}

export function renderStadiumList(query = "") {
  const tbody = document.querySelector("#stadium-table tbody");
  if (!tbody) return;

  const entries = getStadiumTeamPairs();
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No stadium data available.</td></tr>`;
    return;
  }

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? entries.filter(({ stadium }) => stadium.name.toLowerCase().includes(normalized))
    : entries;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No stadiums match "${query}".</td></tr>`;
    return;
  }

  const rows = filtered.map(({ stadium, teams }) => `
    <tr>
      <td>${stadium.name}</td>
      <td>${formatTeams(teams)}</td>
      <td>${formatLocation(stadium)}</td>
    </tr>
  `);

  tbody.innerHTML = rows.join("");
}
