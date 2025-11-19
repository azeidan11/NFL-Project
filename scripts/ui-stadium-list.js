import { getStadiumTeamPairs, countStadiumsByRoof } from "./store.js";

function formatLocation(stadium) {
  const city = stadium?.location?.city ?? "";
  const state = stadium?.location?.state ?? "";
  return [city, state].filter(Boolean).join(", ");
}

function formatTeams(teams) {
  if (!teams?.length) return "N/A";
  return teams.map(team => team.name).join(", ");
}

export function renderStadiumList(options = {}) {
  const { query = "", roofType = null } = options ?? {};
  const tbody = document.querySelector("#stadium-table tbody");
  const countDisplay = document.getElementById("stadiumCount");
  if (!tbody) return;

  const baseEntries = getStadiumTeamPairs(roofType ? { roofType } : undefined);
  const openRoofCount = countStadiumsByRoof("open");
  if (countDisplay) {
    const plural = openRoofCount === 1 ? "" : "s";
    countDisplay.textContent = `${openRoofCount} open-roof stadium${plural}`;
  }

  if (!baseEntries.length) {
    const label = roofType === "open" ? "open-roof stadium data" : "stadium data";
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No ${label} available.</td></tr>`;
    return;
  }

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? baseEntries.filter(({ stadium }) => stadium.name.toLowerCase().includes(normalized))
    : baseEntries;

  if (!filtered.length) {
    const label = roofType === "open" ? "open-roof stadiums" : "stadiums";
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No ${label} match "${query}".</td></tr>`;
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
