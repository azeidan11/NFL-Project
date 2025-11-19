import { loadCsv } from "./csv-utils.js";

const INFO_PATH = "./NFL_Information.csv";
const DISTANCE_PATH = "./NFL_Distances.csv";

let dataPromise;

export function loadData() {
  if (!dataPromise) {
    dataPromise = fetchAllData();
  }
  return dataPromise;
}

async function fetchAllData() {
  const [infoCsv, distanceCsv] = await Promise.all([
    loadCsv(INFO_PATH),
    loadCsv(DISTANCE_PATH).catch(err => {
      console.warn("Unable to load distance data:", err);
      return { headers: [], rows: [] };
    })
  ]);

  const { teams, stadiums } = buildTeamsAndStadiums(infoCsv);
  const distanceMiles = buildDistanceMap(distanceCsv);

  return { teams, stadiums, distanceMiles };
}

function buildTeamsAndStadiums(dataset) {
  const headers = dataset.headers ?? [];
  const rows = dataset.rows ?? [];
  if (!headers.length) return { teams: [], stadiums: [] };

  const column = createHeaderLookup(headers);
  const idxTeam = column("Team(s)");
  const idxStadium = column("Name");
  const idxCapacity = column("Capacity");
  const idxLocation = column("Location");
  const idxRoof = column("Roof Type");
  const idxSurface = column("Surface");
  const idxOpened = column("Opened");
  const idxConference = column("Conference");
  const idxDivision = column("Division");

  const stadiumMap = new Map();
  const teams = [];

  rows.forEach((row, rowIndex) => {
    const teamName = (row[idxTeam] || "").trim();
    const stadiumName = (row[idxStadium] || "").trim();
    if (!teamName || !stadiumName) return;

    const stadium = ensureStadium(stadiumMap, stadiumName, {
      capacity: parseNumber(row[idxCapacity]),
      roof: (row[idxRoof] || "").trim(),
      surface: (row[idxSurface] || "").trim(),
      opened: parseYear(row[idxOpened]),
      location: parseLocation(row[idxLocation])
    });

    teams.push({
      id: rowIndex + 1,
      name: teamName,
      conference: parseConference(row[idxConference]),
      division: parseDivision(row[idxDivision]),
      stadiumId: stadium.id
    });
  });

  return { teams, stadiums: Array.from(stadiumMap.values()) };
}

function buildDistanceMap(dataset) {
  const headers = dataset.headers ?? [];
  const rows = dataset.rows ?? [];
  if (!headers.length) return {};

  const column = createHeaderLookup(headers);
  const idxTeam = column("Team Name");
  const idxBegin = column("Beginning Stadium");
  const idxEnd = column("Ending Stadium");
  const idxDistance = column("Distance");

  const map = {};

  rows.forEach(row => {
    const team = (row[idxTeam] || "").trim();
    const begin = (row[idxBegin] || "").trim();
    const end = (row[idxEnd] || "").trim();
    const distance = parseNumber(row[idxDistance]);
    if (!team || !begin || !end || typeof distance === "undefined") return;

    if (!map[team]) {
      map[team] = [];
    }
    map[team].push({ from: begin, to: end, distance });
  });

  return map;
}

function ensureStadium(stadiumMap, name, info) {
  if (stadiumMap.has(name)) {
    return stadiumMap.get(name);
  }
  const stadium = {
    id: name,
    name,
    capacity: info.capacity,
    roof: info.roof,
    surface: info.surface,
    opened: info.opened,
    location: info.location
  };
  stadiumMap.set(name, stadium);
  return stadium;
}

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
