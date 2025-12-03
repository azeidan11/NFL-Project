import { CustomMap } from "./customMap.js";
import { loadData } from "./data.js";
import { parseCsv } from "./csv-utils.js";

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

export function getSouvenirNames() {
  const names = new Set();
  souvenirsByTeamName.forEach(list => {
    list.forEach(item => names.add(item.name));
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function applyToAllSouvenirs(fn) {
  souvenirsByTeamName.forEach((list, team) => {
    const updated = fn(list.slice());
    souvenirsByTeamName.set(team, updated);
  });
}

export function updateSouvenirPriceAll(name, newPrice) {
  if (!name || typeof newPrice !== "number" || Number.isNaN(newPrice)) return false;
  let updatedAny = false;
  applyToAllSouvenirs(list => {
    const match = list.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (match) {
      match.price = newPrice;
      updatedAny = true;
    }
    return list;
  });
  return updatedAny;
}

export function addSouvenirAll(name, price) {
  if (!name || typeof price !== "number" || Number.isNaN(price)) return false;
  applyToAllSouvenirs(list => {
    if (!list.find(item => item.name.toLowerCase() === name.toLowerCase())) {
      list.push({ name, price });
    }
    return list;
  });
  return true;
}

export function deleteSouvenirAll(name) {
  if (!name) return false;
  let removedAny = false;
  applyToAllSouvenirs(list => {
    const filtered = list.filter(item => item.name.toLowerCase() !== name.toLowerCase());
    if (filtered.length !== list.length) removedAny = true;
    return filtered;
  });
  return removedAny;
}

export function addSouvenirForTeam(teamName, name, price) {
  if (!teamName || !name || typeof price !== "number" || Number.isNaN(price)) return false;
  if (!souvenirsByTeamName.has(teamName)) return false;
  const list = souvenirsByTeamName.get(teamName);
  if (list.find(item => item.name.toLowerCase() === name.toLowerCase())) return false;
  list.push({ name, price });
  souvenirsByTeamName.set(teamName, list);
  return true;
}

export function deleteSouvenirForTeam(teamName, name) {
  if (!teamName || !name) return false;
  if (!souvenirsByTeamName.has(teamName)) return false;
  const list = souvenirsByTeamName.get(teamName);
  const filtered = list.filter(item => item.name.toLowerCase() !== name.toLowerCase());
  const removed = filtered.length !== list.length;
  souvenirsByTeamName.set(teamName, filtered);
  return removed;
}

export function updateSouvenirForTeam(teamName, name, newPrice) {
  if (!teamName || !name || typeof newPrice !== "number" || Number.isNaN(newPrice)) return false;
  if (!souvenirsByTeamName.has(teamName)) return false;
  const list = souvenirsByTeamName.get(teamName);
  const match = list.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (!match) return false;
  match.price = newPrice;
  souvenirsByTeamName.set(teamName, list);
  return true;
}

export function updateTeamStadium(teamName, stadiumInfo) {
  const team = getTeamByName(teamName);
  if (!team || !stadiumInfo?.name) return { updated: false };

  const existingStadium = getStadiumById(team.stadiumId);
  const stadiumName = stadiumInfo.name;

  const stadium = {
    id: stadiumName,
    name: stadiumName,
    capacity: typeof stadiumInfo.capacity === "number" ? stadiumInfo.capacity : existingStadium?.capacity,
    roof: stadiumInfo.roof ?? existingStadium?.roof ?? "",
    surface: stadiumInfo.surface ?? existingStadium?.surface ?? "",
    opened: typeof stadiumInfo.opened === "number" ? stadiumInfo.opened : existingStadium?.opened,
    location: {
      city: stadiumInfo.city ?? existingStadium?.location?.city ?? "",
      state: stadiumInfo.state ?? existingStadium?.location?.state ?? ""
    }
  };

  stadiumById.set(stadiumName, stadium);
  team.stadiumId = stadiumName;
  mapByTeamName.insert(team.name, team);

  return { updated: true, stadium };
}

export function addTeamsFromCsvText(text) {
  if (!text) return { addedTeams: 0, addedStadiums: 0 };
  const rows = parseCsv(text);
  if (!rows.length) return { addedTeams: 0, addedStadiums: 0 };
  const [headerRow, ...dataRows] = rows;
  const column = createHeaderLookup(headerRow);
  const idxTeam = column("Team(s)");
  const idxStadium = column("Name");
  const idxCapacity = column("Capacity");
  const idxLocation = column("Location");
  const idxRoof = column("Roof Type");
  const idxSurface = column("Surface");
  const idxOpened = column("Opened");
  const idxConference = column("Conference");
  const idxDivision = column("Division");

  let addedTeams = 0;
  let addedStadiums = 0;

  dataRows.forEach((row, rowIndex) => {
    const teamName = (row[idxTeam] || "").trim();
    const stadiumName = (row[idxStadium] || "").trim();
    if (!teamName || !stadiumName) return;

    let stadium = stadiumById.get(stadiumName);
    if (!stadium) {
      stadium = {
        id: stadiumName,
        name: stadiumName,
        capacity: parseNumber(row[idxCapacity]),
        roof: (row[idxRoof] || "").trim(),
        surface: (row[idxSurface] || "").trim(),
        opened: parseYear(row[idxOpened]),
        location: parseLocation(row[idxLocation])
      };
      stadiumById.set(stadiumName, stadium);
      addedStadiums += 1;
    }

    if (!mapByTeamName.find(teamName)) {
      const team = {
        id: mapByTeamName.size() + rowIndex + 1,
        name: teamName,
        conference: parseConference(row[idxConference]),
        division: parseDivision(row[idxDivision]),
        stadiumId: stadium.id
      };
      mapByTeamName.insert(team.name, team);
      if (!souvenirsByTeamName.has(team.name)) {
        souvenirsByTeamName.set(team.name, DEFAULT_SOUVENIRS.map(item => ({ ...item })));
      }
      addedTeams += 1;
    }
  });

  return { addedTeams, addedStadiums };
}

// Parsing helpers (mirrors data.js)
function createHeaderLookup(headers) {
  const table = new Map(headers.map((header, idx) => [normalizeKey(header), idx]));
  return label => {
    const key = normalizeKey(label);
    if (!table.has(key)) {
      throw new Error(`Column "${label}" not found in CSV.`);
    }
    return table.get(key);
  };
}

function normalizeKey(value = "") {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function parseLocation(value = "") {
  const [city, state] = value.split(",").map(part => part.trim());
  return { city: city || "", state: state || "" };
}

function parseNumber(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).replace(/,/g, "").trim();
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? Math.round(num) : undefined;
}

function parseYear(value) {
  const num = parseNumber(value);
  return typeof num === "number" ? num : undefined;
}

function parseConference(value = "") {
  const upper = value.toUpperCase();
  if (upper.includes("AMERICAN")) return "AFC";
  if (upper.includes("NATIONAL")) return "NFC";
  const trimmed = value.trim();
  if (trimmed.length === 3) return trimmed.toUpperCase();
  return trimmed || "ALL";
}

function parseDivision(value = "") {
  const sanitized = value.replace(/[^a-z0-9\s]/gi, " ").trim();
  if (!sanitized) return "";
  const parts = sanitized.split(/\s+/);
  return parts[parts.length - 1];
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
