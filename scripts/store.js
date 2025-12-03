import { CustomMap } from "./customMap.js";
import { loadData } from "./data.js";

// Default souvenir catalog per team
const DEFAULT_SOUVENIRS = [
  { name: "Signed helmet", price: 74.99 },
  { name: "Autographed football", price: 79.89 },
  { name: "Team pennant", price: 17.99 },
  { name: "Team picture", price: 29.99 },
  { name: "Team jersey", price: 199.99 }
];

// Map team name -> souvenir list
const souvenirsByTeamName = new Map();

// Graph of stadiums: stadium name -> list of { to, distance }
export const stadiumGraph = new Map();

// Map teamName -> Team
export const mapByTeamName = new CustomMap();
// Map stadiumId -> Stadium (use native Map, different from assignment's C++ rule)
export const stadiumById = new Map();
export const NFC_NORTH_FILTER = { conference: "NFC", division: "North" };

let loadPromise;

async function hydrateStore() {
  const { teams: teamList, stadiums: stadiumList, distanceMiles } = await loadData();

  stadiumList.forEach(st => stadiumById.set(st.id, st));

  teamList.forEach(team => {
    mapByTeamName.insert(team.name, team);
    if (!souvenirsByTeamName.has(team.name)) {
      // Each team gets its own copy so admin can edit later
      souvenirsByTeamName.set(
        team.name,
        DEFAULT_SOUVENIRS.map(item => ({ ...item }))
      );
    }
  });

  buildStadiumGraph(distanceMiles);

  return { teamCount: teamList.length, stadiumCount: stadiumList.length };
}

export function ensureStoreLoaded() {
  if (!loadPromise) {
    loadPromise = hydrateStore();
  }
  return loadPromise;
}

function addEdge(from, to, distance) {
  if (!from || !to || !Number.isFinite(distance)) return;
  if (!stadiumGraph.has(from)) {
    stadiumGraph.set(from, []);
  }
  stadiumGraph.get(from).push({ to, distance });
}

function buildStadiumGraph(distanceMiles) {
  stadiumGraph.clear();
  if (!distanceMiles) return;

  // distanceMiles is keyed by team name; each entry is an array of
  // { from: beginning stadium, to: ending stadium, distance }
  Object.values(distanceMiles).forEach(edgeList => {
    edgeList.forEach(edge => {
      const from = edge.from;
      const to = edge.to;
      const d = edge.distance;
      if (!from || !to || !Number.isFinite(d)) return;
      // Treat edges as undirected for travel planning
      addEdge(from, to, d);
      addEdge(to, from, d);
    });
  });
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

export function getTeamsFiltered(options = {}) {
  const opts = options ?? {};
  const { conference = "ALL", division } = opts;
  const teams = getTeamsSorted(conference);
  if (!division) return teams;
  return teams.filter(team => team.division === division);
}

export function getTeamByName(name) {
  return mapByTeamName.find(name);
}

export function getStadiumById(id) {
  return stadiumById.get(id);
}

export function getTeamsByStadiumName(stadiumName) {
  if (!stadiumName) return [];
  const matches = [];
  mapByTeamName.sortedKeys().forEach(name => {
    const team = mapByTeamName.find(name);
    if (!team) return;
    const st = getStadiumById(team.stadiumId);
    if (st?.name === stadiumName) {
      matches.push(team);
    }
  });
  return matches;
}

export function getSouvenirsForTeam(teamName) {
  return souvenirsByTeamName.get(teamName) ?? [];
}

export function getStadiumNameForTeam(teamName) {
  const team = getTeamByName(teamName);
  if (!team) return null;
  const st = getStadiumById(team.stadiumId);
  return st?.name ?? null;
}

export function getStadiumTeamPairs(options = {}) {
  const opts = options ?? {};
  const { roofType } = opts;

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

  let stadiums = Array.from(stadiumById.values());
  if (roofType) {
    const normalizedRoof = roofType.toLowerCase();
    stadiums = stadiums.filter(stadium => (stadium.roof ?? "").toLowerCase() === normalizedRoof);
  }

  return stadiums
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(stadium => ({
      stadium,
      teams: teamsByStadium.get(stadium.id) ?? []
    }));
}

export function countStadiumsByRoof(roofType) {
  if (!roofType) return stadiumById.size;
  const normalizedRoof = roofType.toLowerCase();
  return Array.from(stadiumById.values()).filter(stadium => (stadium.roof ?? "").toLowerCase() === normalizedRoof).length;
}

export function getTotalStadiumCapacity() {
  let total = 0;
  stadiumById.forEach(stadium => {
    if (typeof stadium.capacity === "number" && Number.isFinite(stadium.capacity)) {
      total += stadium.capacity;
    }
  });
  return total;
}
