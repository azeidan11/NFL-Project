// ui-trips.js
// Handles rendering trip results and wiring buttons to trips.js functions

import {
  shortestTripFromPackersTo,
  totalDistanceForOrderedTeams,
  greedyVisitAllFromPatriots,
  greedyTripForTeamSubset,
  computeStadiumMst,
  dfsFromVikings
} from "./trips.js";

import { mapByTeamName } from "./store.js";

const resultBox = () => document.querySelector("#tripResults .content");

function renderResult(title, steps, total) {
  const root = resultBox();
  if (!root) return;

  let listItems = "";

  if (Array.isArray(steps)) {
    listItems = steps
      .map(s => {
        if (typeof s === "string") {
          return `<li>${s}</li>`;
        }
        const from = s.from ?? s.fromTeam ?? "";
        const to = s.to ?? s.toTeam ?? "";
        const distance = s.distance ?? s.totalDistance ?? s.dist ?? "";
        return `<li>${from} → ${to} (${distance} miles)</li>`;
      })
      .join("");
  }

  root.innerHTML = `
    <h3>${title}</h3>
    <ul>${listItems}</ul>
    <p><strong>Total Distance:</strong> ${total} miles</p>
  `;
}

// Populate team dropdowns
export function initTripUI() {
  const teamNames = mapByTeamName.sortedKeys();

  const orderedSelect = document.getElementById("orderedTripSelect");
  const customStart = document.getElementById("customStartSelect");
  const customSelect = null; // removed, HTML uses customTeamList instead

  if (orderedSelect) {
    orderedSelect.innerHTML = teamNames.map(t => `<option>${t}</option>`).join("");
  }
  if (customStart) {
    customStart.innerHTML = teamNames.map(t => `<option>${t}</option>`).join("");
  }

  wireButtons();
}

function wireButtons() {
  // Dijkstra from Packers
  document.getElementById("btnDijkstra")?.addEventListener("click", () => {
    const dest = document.getElementById("orderedTripSelect").value;
    const res = shortestTripFromPackersTo(dest);
    renderResult(
      "Shortest Path from Green Bay Packers",
      res.path.map((stadium, i) => {
        if (i === 0) return null;
        return {
          from: res.path[i - 1],
          to: stadium,
          distance: res.distance
        };
      }).filter(x => x),
      res.distance
    );
  });

  // Ordered trip (user-defined sequence)
  document.getElementById("btnCustomOrder")?.addEventListener("click", () => {
    const input = document.getElementById("orderedTripSequence").value;
    const list = input.split(",").map(s => s.trim()).filter(s => s.length);
    const res = totalDistanceForOrderedTeams(list);
    renderResult(
      "User Ordered Trip",
      res.legs.map(l => ({
        from: l.fromTeam,
        to: l.toTeam,
        distance: l.distance
      })),
      res.totalDistance
    );
  });

  // Patriots greedy trip
  document.getElementById("btnPatriotsGreedy")?.addEventListener("click", () => {
    const res = greedyVisitAllFromPatriots();
    renderResult(
      "Patriots Greedy Trip",
      res.legs.map(l => ({
        from: l.from,
        to: l.to,
        distance: l.distance
      })),
      res.totalDistance
    );
  });

  // Custom greedy trip
  document.getElementById("btnCustomGreedy")?.addEventListener("click", () => {
    const start = document.getElementById("customStartSelect").value;
    const input = document.getElementById("customTeamList").value;
    const list = input.split(",").map(s => s.trim()).filter(s => s.length);
    const res = greedyTripForTeamSubset(start, list);
    renderResult(
      "Custom Greedy Trip",
      res.legs.map(l => ({
        from: l.from,
        to: l.to,
        distance: l.distance
      })),
      res.totalDistance
    );
  });

  // MST
  document.getElementById("btnMST")?.addEventListener("click", () => {
    const res = computeStadiumMst();
    renderResult(
      "Minimum Spanning Tree (Prim's)",
      res.edges.map(e => ({
        from: e.from,
        to: e.to,
        distance: e.distance
      })),
      res.totalDistance
    );
  });

  // DFS from Vikings
  document.getElementById("btnDFS")?.addEventListener("click", () => {
    const res = dfsFromVikings();
    renderResult(
      "DFS from Minnesota Vikings",
      res.edges.map(e => ({
        from: e.from,
        to: e.to,
        distance: e.distance
      })),
      res.totalDistance
    );
  });
}