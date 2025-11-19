import { CustomMap } from "./customMap.js";
import { loadData } from "./data.js";

// Map teamName -> Team
export const mapByTeamName = new CustomMap();
// Map stadiumId -> Stadium (use native Map, different from assignment's C++ rule)
export const stadiumById = new Map();

let loadPromise;

async function hydrateStore() {
  const { teams: teamList, stadiums: stadiumList } = await loadData();
  stadiumList.forEach(st => stadiumById.set(st.id, st));
  teamList.forEach(team => mapByTeamName.insert(team.name, team));
  return { teamCount: teamList.length, stadiumCount: stadiumList.length };
}

export function ensureStoreLoaded() {
  if (!loadPromise) {
    loadPromise = hydrateStore();
  }
  return loadPromise;
}

// Helpers
export function getTeamsSorted(conference = "ALL") {
  const names = mapByTeamName.sortedKeys();
  const out = [];
  for (const n of names) {
    const t = mapByTeamName.find(n);
    if (!t) continue;
    if (conference !== "ALL" && t.conference !== conference) continue;
    out.push(t);
  }
  return out;
}

export function getTeamByName(name) {
  return mapByTeamName.find(name);
}

export function getStadiumById(id) {
  return stadiumById.get(id);
}
