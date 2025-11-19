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

export function getStadiumTeamPairs() {
  const sortedTeams = mapByTeamName
    .sortedKeys()
    .map(name => mapByTeamName.find(name))
    .filter(Boolean);

  const teamsByStadium = new Map();
  sortedTeams.forEach(team => {
    const bucket = teamsByStadium.get(team.stadiumId);
    if (bucket) {
      bucket.push(team);
    } else {
      teamsByStadium.set(team.stadiumId, [team]);
    }
  });

  return Array.from(stadiumById.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(stadium => ({
      stadium,
      teams: teamsByStadium.get(stadium.id) ?? []
    }));
}
