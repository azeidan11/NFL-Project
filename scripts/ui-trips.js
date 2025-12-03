// ui-trips.js
// Handles rendering trip results and wiring buttons to trips.js functions

import {
  shortestTripFromPackersTo,
  totalDistanceForOrderedTeams,
  greedyVisitAllFromPatriots,
  greedyTripForTeamSubset,
  computeStadiumMst,
  dfsFromVikings,
  bfsFromRams
} from "./trips.js";

import { mapByTeamName } from "./store.js";

const resultBox = () =>
  document.querySelector("#tripResults .content") || document.getElementById("tripResults");

function formatMiles(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value.toLocaleString()} miles`;
}

function renderResult(title, steps, total, note) {
  const root = resultBox();
  if (!root) return;

  const hasSteps = Array.isArray(steps) && steps.length > 0;

  const listItems = hasSteps
    ? steps
        .map(s => {
          if (typeof s === "string") {
            return `<li class="result-step"><span>${s}</span></li>`;
          }
          const from = s.from ?? s.fromTeam ?? "";
          const to = s.to ?? s.toTeam ?? "";
          const distance = formatMiles(s.distance ?? s.totalDistance ?? s.dist);
          return `
            <li class="result-step">
              <span><strong>${from || "Start"}</strong> -> ${to || "Destination"}</span>
              <span class="muted">${distance}</span>
            </li>`;
        })
        .join("")
    : `<li class="muted">No route calculated yet.</li>`;

  root.innerHTML = `
    <div class="result-header">
      <div>
        <h3>${title}</h3>
        ${note ? `<p class="muted">${note}</p>` : ""}
      </div>
      <div class="pill pill--accent">${formatMiles(total)}</div>
    </div>
    <ul class="result-steps">${listItems}</ul>
  `;
}

// Populate team dropdowns
export function initTripUI() {
  const teamNames = mapByTeamName.sortedKeys();

  const orderedSelect = document.getElementById("orderedTripSelect");
  const customStart = document.getElementById("customStartSelect");

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
    if (!dest) {
      renderResult("Shortest Path from Green Bay Packers", [], 0, "Choose a destination team to start.");
      return;
    }
    const res = shortestTripFromPackersTo(dest);
    renderResult(
      "Shortest Path from Green Bay Packers",
      res.path
        .map((stadium, i) => {
          if (i === 0) return null;
          return {
            from: res.path[i - 1],
            to: stadium,
            distance: res.distance
          };
        })
        .filter(Boolean),
      res.distance,
      `Destination: ${dest}`
    );
  });

  // Ordered trip (user-defined sequence)
  document.getElementById("btnCustomOrder")?.addEventListener("click", () => {
    const input = document.getElementById("orderedTripSequence").value;
    const list = input.split(",").map(s => s.trim()).filter(s => s.length);
    if (list.length < 2) {
      renderResult("User Ordered Trip", [], 0, "Enter at least two teams separated by commas.");
      return;
    }
    const res = totalDistanceForOrderedTeams(list);
    renderResult(
      "User Ordered Trip",
      res.legs.map(l => ({
        from: l.fromTeam,
        to: l.toTeam,
        distance: l.distance
      })),
      res.totalDistance,
      `Order: ${list.join(" -> ")}`
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
      res.totalDistance,
      "Starts at New England Patriots"
    );
  });

  // Custom greedy trip
  document.getElementById("btnCustomGreedy")?.addEventListener("click", () => {
    const start = document.getElementById("customStartSelect").value;
    const input = document.getElementById("customTeamList").value;
    const list = input.split(",").map(s => s.trim()).filter(s => s.length);
    if (!start) {
      renderResult("Custom Greedy Trip", [], 0, "Select a starting team.");
      return;
    }
    if (list.length === 0) {
      renderResult("Custom Greedy Trip", [], 0, "Add at least one team to visit.");
      return;
    }
    const res = greedyTripForTeamSubset(start, list);
    renderResult(
      "Custom Greedy Trip",
      res.legs.map(l => ({
        from: l.from,
        to: l.to,
        distance: l.distance
      })),
      res.totalDistance,
      `Start: ${start}`
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
      res.totalDistance,
      "Minimum spanning tree across all stadiums"
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
      res.totalDistance,
      "Depth-first traversal starting at Minnesota Vikings"
    );
  });

  // BFS from Rams
  document.getElementById("btnBFS")?.addEventListener("click", () => {
    const res = bfsFromRams();
    renderResult(
      "BFS from Los Angeles Rams",
      res.edges.map(e => ({
        from: e.from,
        to: e.to,
        distance: e.distance
      })),
      res.totalDistance,
      "Breadth-first traversal starting at Los Angeles Rams (shortest edges first)"
    );
  });
}
