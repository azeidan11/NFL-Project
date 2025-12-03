import { getStadiumTeamPairs, countStadiumsByRoof, getTotalStadiumCapacity } from "./store.js";

function formatLocation(stadium) {
  const city = stadium?.location?.city ?? "";
  const state = stadium?.location?.state ?? "";
  return [city, state].filter(Boolean).join(", ");
}

function formatTeams(teams) {
  if (!teams?.length) return "N/A";
  return teams.map(team => team.name).join(", ");
}

function formatCapacity(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString();
}

export function renderStadiumList(options = {}) {
  const { query = "", roofType = null, sortKey = "name" } = options ?? {};
  const tbody = document.querySelector("#stadium-table tbody");
  const countDisplay = document.getElementById("stadiumCount");
  const totalCapacityDisplay = document.getElementById("totalCapacity");
  if (!tbody) return;

  const baseEntries = getStadiumTeamPairs(roofType ? { roofType } : undefined);
  const openRoofCount = Math.min(20, countStadiumsByRoof("open"));
  if (countDisplay) {
    const plural = openRoofCount === 1 ? "" : "s";
    countDisplay.textContent = `${openRoofCount} open-roof stadium${plural}`;
  }

  const aggregateCapacity = getTotalStadiumCapacity();
  if (totalCapacityDisplay) {
    const formatted = typeof aggregateCapacity === "number" ? aggregateCapacity.toLocaleString() : "N/A";
    totalCapacityDisplay.textContent = `Total NFL seating capacity: ${formatted}`;
  }

  if (!baseEntries.length) {
    const label = roofType === "open" ? "open-roof stadium data" : "stadium data";
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No ${label} available.</td></tr>`;
    return;
  }

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? baseEntries.filter(({ stadium }) => stadium.name.toLowerCase().includes(normalized))
    : baseEntries;

  if (!filtered.length) {
    const label = roofType === "open" ? "open-roof stadiums" : "stadiums";
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No ${label} match "${query}".</td></tr>`;
    return;
  }

  const sorted = filtered.slice().sort((a, b) => {
    if (sortKey === "opened") {
      const aYear = typeof a.stadium.opened === "number" ? a.stadium.opened : Infinity;
      const bYear = typeof b.stadium.opened === "number" ? b.stadium.opened : Infinity;
      if (aYear === bYear) return a.stadium.name.localeCompare(b.stadium.name);
      return aYear - bYear;
    }
    if (sortKey === "capacity") {
      const aCap = typeof a.stadium.capacity === "number" ? a.stadium.capacity : Infinity;
      const bCap = typeof b.stadium.capacity === "number" ? b.stadium.capacity : Infinity;
      if (aCap === bCap) return a.stadium.name.localeCompare(b.stadium.name);
      return aCap - bCap;
    }
    return a.stadium.name.localeCompare(b.stadium.name);
  });

  const rows = sorted.map(({ stadium, teams }) => `
    <tr>
      <td>${stadium.name}</td>
      <td>${formatCapacity(stadium.capacity)}</td>
      <td>${formatTeams(teams)}</td>
      <td>${formatLocation(stadium)}</td>
      <td>${stadium.surface ?? "N/A"}</td>
      <td>${stadium.roof ?? "N/A"}</td>
      <td>${typeof stadium.opened === "number" ? stadium.opened : "N/A"}</td>
    </tr>
  `);

  tbody.innerHTML = rows.join("");
}
