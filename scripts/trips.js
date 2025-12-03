import {
  stadiumGraph,
  getStadiumNameForTeam
} from "./store.js";

/**
 * Internal helper: Dijkstra shortest path between two stadiums (by stadium name).
 * Returns { path: [stadiumName], legs: [{from,to,distance}], distance: number }.
 */
function dijkstraStadiumToStadium(startStadium, targetStadium) {
  if (!startStadium || !targetStadium) {
    return { path: [], legs: [], distance: Infinity };
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const queue = [];

  // Initialize distances
  stadiumGraph.forEach((_, node) => {
    dist.set(node, Infinity);
  });
  dist.set(startStadium, 0);
  queue.push({ node: startStadium, dist: 0 });

  while (queue.length > 0) {
    // Simple priority queue using sort (OK for small graph)
    queue.sort((a, b) => a.dist - b.dist);
    const { node } = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    if (node === targetStadium) break;

    const neighbors = stadiumGraph.get(node) ?? [];
    neighbors.forEach(({ to, distance }) => {
      const alt = dist.get(node) + distance;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, node);
        queue.push({ node: to, dist: alt });
      }
    });
  }

  const finalDist = dist.get(targetStadium);
  if (!Number.isFinite(finalDist)) {
    return { path: [], legs: [], distance: Infinity };
  }

  const path = [];
  let curr = targetStadium;
  while (curr != null) {
    path.push(curr);
    curr = prev.get(curr) ?? null;
  }
  path.reverse();

  const legs = [];
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const neighbors = stadiumGraph.get(from) ?? [];
    const match = neighbors.find(n => n.to === to);
    const legDistance = match?.distance ?? (dist.get(to) - dist.get(from));
    legs.push({ from, to, distance: legDistance });
  }

  return { path, legs, distance: finalDist };
}

/**
 * Requirement: Starting at Green Bay Packers, visit any other team
 * traveling the shortest distance (Dijkstra).
 *
 * Returns { stadiumPath, distance }.
 */
export function shortestTripFromPackersTo(targetTeamName) {
  const startTeam = "Green Bay Packers";
  const startStadium = getStadiumNameForTeam(startTeam);
  const targetStadium = getStadiumNameForTeam(targetTeamName);
  return dijkstraStadiumToStadium(startStadium, targetStadium);
}

/**
 * Requirement: User chooses starting team and other teams in a specific order.
 * We follow that exact order and compute the total distance, using Dijkstra
 * between each pair.
 *
 * teamNames is an array like:
 * ["Green Bay Packers", "Chicago Bears", "Minnesota Vikings"]
 *
 * Returns { legs: [{ fromTeam, toTeam, path, distance }], totalDistance }.
 */
export function totalDistanceForOrderedTeams(teamNames) {
  if (!teamNames || teamNames.length < 2) {
    return { legs: [], totalDistance: 0 };
  }

  const legs = [];
  let total = 0;

  for (let i = 0; i < teamNames.length - 1; i++) {
    const fromTeam = teamNames[i];
    const toTeam = teamNames[i + 1];
    const fromStadium = getStadiumNameForTeam(fromTeam);
    const toStadium = getStadiumNameForTeam(toTeam);
    const { path, distance } = dijkstraStadiumToStadium(fromStadium, toStadium);
    if (!Number.isFinite(distance)) {
      legs.push({ fromTeam, toTeam, path: [], distance: Infinity });
      continue;
    }
    legs.push({ fromTeam, toTeam, path, distance });
    total += distance;
  }

  return { legs, totalDistance: total };
}

/**
 * Internal helper: Greedy trip over a set of stadiums.
 * At each step, choose the globally closest unvisited stadium
 * using Dijkstra distances from current.
 *
 * startStadium: stadium name string
 * targetStadiums: Set<string> of stadium names to visit (excluding start)
 *
 * Returns { stadiumOrder, legs, totalDistance }.
 */
function greedyTripOverStadiums(startStadium, targetStadiums) {
  const visited = new Set();
  const order = [startStadium];
  const legs = [];
  let total = 0;
  let current = startStadium;

  while (targetStadiums.size > 0) {
    let bestTarget = null;
    let bestResult = null;

    // Find closest unvisited stadium using Dijkstra
    for (const candidate of targetStadiums) {
      const result = dijkstraStadiumToStadium(current, candidate);
      if (!Number.isFinite(result.distance)) continue;
      if (!bestResult || result.distance < bestResult.distance) {
        bestResult = result;
        bestTarget = candidate;
      }
    }

    if (!bestTarget || !bestResult) {
      // Unreachable leftover nodes
      break;
    }

    // Move to that stadium
    legs.push({
      from: current,
      to: bestTarget,
      path: bestResult.path,
      distance: bestResult.distance
    });
    total += bestResult.distance;
    current = bestTarget;
    order.push(bestTarget);
    targetStadiums.delete(bestTarget);
    visited.add(bestTarget);
  }

  return { stadiumOrder: order, legs, totalDistance: total };
}

/**
 * Requirement: Visit all teams starting at New England Patriots
 * traveling the shortest distance each step, choosing the closest team.
 *
 * Here we treat each stadium as a node and visit all stadiums.
 *
 * Returns { stadiumOrder, legs, totalDistance }.
 */
export function greedyVisitAllFromPatriots() {
  const startTeam = "New England Patriots";
  const startStadium = getStadiumNameForTeam(startTeam);

  // Build set of all stadium nodes
  const allStadiums = new Set(stadiumGraph.keys());
  allStadiums.delete(startStadium);

  return greedyTripOverStadiums(startStadium, allStadiums);
}

/**
 * Requirement: Given a chosen starting team and a subset of teams to visit,
 * choose the next closest team each step (greedy) and compute total distance.
 *
 * startTeamName: string
 * targetTeamNames: string[]
 *
 * Returns { teamOrder, stadiumOrder, legs, totalDistance }.
 */
export function greedyTripForTeamSubset(startTeamName, targetTeamNames) {
  const startStadium = getStadiumNameForTeam(startTeamName);
  const targetStadiums = new Set();
  const teamByStadium = new Map();

  for (const team of targetTeamNames) {
    const stadium = getStadiumNameForTeam(team);
    if (!stadium || stadium === startStadium) continue;
    targetStadiums.add(stadium);
    teamByStadium.set(stadium, team);
  }

  const { stadiumOrder, legs, totalDistance } = greedyTripOverStadiums(
    startStadium,
    targetStadiums
  );

  // Map stadium order back to teams where possible
  const teamOrder = stadiumOrder.map(st => teamByStadium.get(st) ?? null);

  return { teamOrder, stadiumOrder, legs, totalDistance };
}

/**
 * Requirement: Determine the minimum spanning tree (MST) connecting all NFL stadiums
 * using Prim or Kruskal. Here we use Prim.
 *
 * Returns { edges: [{ from, to, distance }], totalDistance }.
 */
export function computeStadiumMst() {
  const nodes = Array.from(stadiumGraph.keys());
  if (nodes.length === 0) {
    return { edges: [], totalDistance: 0 };
  }

  const visited = new Set();
  const edges = [];
  let total = 0;

  // Start at first stadium
  const start = nodes[0];
  visited.add(start);

  // Helper to get all candidate edges from visited set
  function getCandidateEdges() {
    const candidates = [];
    visited.forEach(node => {
      const neighbors = stadiumGraph.get(node) ?? [];
      neighbors.forEach(({ to, distance }) => {
        if (visited.has(to)) return;
        candidates.push({ from: node, to, distance });
      });
    });
    return candidates;
  }

  while (visited.size < nodes.length) {
    const candidates = getCandidateEdges();
    if (!candidates.length) break;

    // Pick smallest distance edge
    candidates.sort((a, b) => {
      if (a.distance === b.distance) {
        const an = `${a.from}-${a.to}`;
        const bn = `${b.from}-${b.to}`;
        return an.localeCompare(bn);
      }
      return a.distance - b.distance;
    });

    const best = candidates[0];
    if (!visited.has(best.to)) {
      visited.add(best.to);
      edges.push(best);
      total += best.distance;
    } else {
      break;
    }
  }

  return { edges, totalDistance: total };
}

/**
 * Requirement: DFS starting at the Minnesota Vikings.
 * If there is a choice, always choose the shortest distance.
 *
 * Returns { stadiumOrder, edges, totalDistance }.
 */
export function dfsFromVikings() {
  const startTeam = "Minnesota Vikings";
  const startStadium = getStadiumNameForTeam(startTeam);
  const visited = new Set();
  const order = [];
  const edges = [];
  let total = 0;

  function dfs(node) {
    visited.add(node);
    order.push(node);

    const neighbors = (stadiumGraph.get(node) ?? []).slice();
    // Sort by distance asc, then name for stable behavior
    neighbors.sort((a, b) => {
      if (a.distance === b.distance) {
        return a.to.localeCompare(b.to);
      }
      return a.distance - b.distance;
    });

    for (const { to, distance } of neighbors) {
      if (visited.has(to)) continue;
      edges.push({ from: node, to, distance });
      total += distance;
      dfs(to);
    }
  }

  if (startStadium) {
    dfs(startStadium);
  }

  return { stadiumOrder: order, edges, totalDistance: total };
}

/**
 * Requirement: BFS starting at Los Angeles Rams.
 * If there is a choice, always choose the shortest distance.
 *
 * Returns { stadiumOrder, edges, totalDistance }.
 */
export function bfsFromRams() {
  const startTeam = "Los Angeles Rams";
  const startStadium = getStadiumNameForTeam(startTeam);
  const visited = new Set();
  const order = [];
  const edges = [];
  let total = 0;

  if (!startStadium) {
    return { stadiumOrder: [], edges: [], totalDistance: 0 };
  }

  const queue = [startStadium];
  visited.add(startStadium);

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);

    const neighbors = (stadiumGraph.get(node) ?? []).slice();
    // Sort by distance asc, then name
    neighbors.sort((a, b) => {
      if (a.distance === b.distance) {
        return a.to.localeCompare(b.to);
      }
      return a.distance - b.distance;
    });

    for (const { to, distance } of neighbors) {
      if (visited.has(to)) continue;
      visited.add(to);
      queue.push(to);
      edges.push({ from: node, to, distance });
      total += distance;
    }
  }

  return { stadiumOrder: order, edges, totalDistance: total };
}
