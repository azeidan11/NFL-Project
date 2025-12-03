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

import { mapByTeamName, getSouvenirsForTeam, getTeamsByStadiumName } from "./store.js";

const resultBox = () =>
  document.querySelector("#tripResults .content") || document.getElementById("tripResults");
const souvenirState = new Map(); // stadiumName -> [{ name, price, qty }]
const customTeamSelection = new Set();
const orderedSequence = [];
let wired = false;

function formatMiles(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value.toLocaleString()} miles`;
}

function uniqueStadiumOrder(list = []) {
  const seen = new Set();
  const ordered = [];
  list.forEach(item => {
    if (!item || seen.has(item)) return;
    seen.add(item);
    ordered.push(item);
  });
  return ordered;
}

function buildStadiumOrderFromLegs(legs = []) {
  const ordered = [];
  legs.forEach(leg => {
    const path = Array.isArray(leg.path) ? leg.path : [];
    path.forEach((stadium, idx) => {
      if (idx === 0 && ordered[ordered.length - 1] === stadium) return;
      if (!stadium) return;
      if (ordered.includes(stadium)) return;
      ordered.push(stadium);
    });
  });
  return ordered;
}

function renderResult(title, steps, total, note, stadiumOrder = []) {
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

  renderSouvenirTracker(uniqueStadiumOrder(stadiumOrder));
}

function renderSouvenirTracker(stadiumOrder = []) {
  const panel = document.getElementById("souvenirTracker");
  if (!panel) return;

  souvenirState.clear();

  if (!stadiumOrder.length) {
    panel.innerHTML = `
      <h3>Souvenir Tracker</h3>
      <p class="muted">Run a trip to load stadium stops and track purchases.</p>
    `;
    return;
  }

  const cards = stadiumOrder
    .map(stadium => {
      const teams = getTeamsByStadiumName(stadium);
      const teamForSouvenirs = teams?.[0];
      const souvenirs = teamForSouvenirs ? getSouvenirsForTeam(teamForSouvenirs.name) : [];
      const options = souvenirs
        .map(item => `<option value="${item.name}" data-price="${item.price}">${item.name} - $${item.price.toFixed(2)}</option>`)
        .join("");
      if (souvenirs.length) {
        souvenirState.set(stadium, []);
      }
      return `
        <div class="souvenir-card" data-stadium="${stadium}">
          <div class="souvenir-card__header">
            <div>
              <h4>${stadium}</h4>
              <p class="muted">${teams?.length ? `Teams: ${teams.map(t => t.name).join(", ")}` : "No team mapping found"}</p>
            </div>
            <div class="pill pill--accent" data-total-label="${stadium}">$0.00</div>
          </div>
          ${
            souvenirs.length
              ? `
            <div class="souvenir-form" data-form="${stadium}">
              <label class="control-label" for="souvenir-${stadium}">Select souvenir</label>
              <select id="souvenir-${stadium}">
                ${options}
              </select>
              <label class="control-label" for="souvenir-qty-${stadium}">Quantity</label>
              <input id="souvenir-qty-${stadium}" type="number" min="1" value="1" />
              <button type="button" data-add="${stadium}">Add to cart</button>
            </div>
            <ul class="souvenir-list" data-list="${stadium}"></ul>
          `
              : `<p class="muted">No souvenirs available for this stop.</p>`
          }
        </div>
      `;
    })
    .join("");

  panel.innerHTML = `
    <h3>Souvenir Tracker</h3>
    <p class="muted">Add purchases for each stop; we will total them up automatically.</p>
    <div class="souvenir-grid">
      ${cards}
    </div>
    <div class="souvenir-grand">
      <span>Grand Total</span>
      <strong id="souvenirGrandTotal">$0.00</strong>
    </div>
  `;

  panel.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const stadium = btn.getAttribute("data-add");
      const select = panel.querySelector(`#souvenir-${CSS.escape(stadium)}`);
      const qtyInput = panel.querySelector(`#souvenir-qty-${CSS.escape(stadium)}`);
      if (!select || !qtyInput) return;
      const name = select.value;
      const price = Number(select.options[select.selectedIndex]?.dataset?.price ?? 0);
      const qty = Math.max(1, Number(qtyInput.value) || 1);
      addSouvenir(stadium, name, price, qty);
    });
  });

  updateSouvenirTotals();
}

function addSouvenir(stadium, name, price, qty) {
  if (!stadium || !name || !Number.isFinite(price) || qty <= 0) return;
  const current = souvenirState.get(stadium) ?? [];
  const existing = current.find(item => item.name === name);
  if (existing) {
    existing.qty += qty;
  } else {
    current.push({ name, price, qty });
  }
  souvenirState.set(stadium, current);
  updateSouvenirTotals();
}

function updateSouvenirTotals() {
  const panel = document.getElementById("souvenirTracker");
  if (!panel) return;

  let grand = 0;
  souvenirState.forEach((items, stadium) => {
    const listEl = panel.querySelector(`[data-list="${CSS.escape(stadium)}"]`);
    const totalLabel = panel.querySelector(`[data-total-label="${CSS.escape(stadium)}"]`);
    let subtotal = 0;
    if (items && listEl) {
      listEl.innerHTML = items
        .map(item => {
          const line = item.price * item.qty;
          subtotal += line;
          return `<li><strong>${item.qty}x</strong> ${item.name} <span class="muted">$${line.toFixed(2)}</span></li>`;
        })
        .join("");
    }
    if (totalLabel) {
      totalLabel.textContent = `$${subtotal.toFixed(2)}`;
    }
    grand += subtotal;
  });

  const grandEl = panel.querySelector("#souvenirGrandTotal");
  if (grandEl) {
    grandEl.textContent = `$${grand.toFixed(2)}`;
  }
}

// Populate team dropdowns
export function initTripUI() {
  const teamNames = mapByTeamName.sortedKeys();

  const orderedSelect = document.getElementById("orderedTripSelect");
  const orderedPicker = document.getElementById("orderedTripPicker");
  const customStart = document.getElementById("customStartSelect");
  const customChoices = document.getElementById("customTeamChoices");
  const customClear = document.getElementById("customTeamClear");

  if (orderedSelect) {
    orderedSelect.innerHTML = teamNames.map(t => `<option>${t}</option>`).join("");
  }
  if (orderedPicker) {
    orderedPicker.innerHTML = teamNames.map(t => `<option>${t}</option>`).join("");
  }
  if (customStart) {
    customStart.innerHTML = teamNames.map(t => `<option>${t}</option>`).join("");
  }
  if (customChoices) {
    customChoices.innerHTML = teamNames
      .map(
        name => `<button type="button" class="chip-choice" data-team="${name}">${name}</button>`
      )
      .join("");
    customChoices.querySelectorAll(".chip-choice").forEach(btn => {
      btn.addEventListener("click", () => {
        const team = btn.getAttribute("data-team");
        if (!team) return;
        if (customTeamSelection.has(team)) {
          customTeamSelection.delete(team);
          btn.classList.remove("selected");
        } else {
          customTeamSelection.add(team);
          btn.classList.add("selected");
        }
      });
    });
  }
  if (customClear) {
    customClear.addEventListener("click", () => {
      customTeamSelection.clear();
      customChoices?.querySelectorAll(".chip-choice").forEach(btn => btn.classList.remove("selected"));
    });
  }

  renderOrderedSequence();
  wireButtons();
}

function renderOrderedSequence() {
  const list = document.getElementById("orderedTripList");
  if (!list) return;
  if (!orderedSequence.length) {
    list.innerHTML = `<li class="muted">No teams added yet.</li>`;
    return;
  }
  list.innerHTML = orderedSequence
    .map((name, idx) => `<li>${idx + 1}. ${name} <button type="button" data-remove-ordered="${idx}">Remove</button></li>`)
    .join("");
  list.querySelectorAll("[data-remove-ordered]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-remove-ordered"));
      if (!Number.isInteger(idx)) return;
      orderedSequence.splice(idx, 1);
      renderOrderedSequence();
    });
  });
}

function wireButtons() {
  if (wired) return;
  wired = true;
  const teamNames = mapByTeamName.sortedKeys();
  const nameLookup = new Map(teamNames.map(n => [n.toLowerCase(), n]));

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
      res.legs.map(leg => ({
        from: leg.from,
        to: leg.to,
        distance: leg.distance
      })),
      res.distance,
      `Destination: ${dest}`,
      res.path
    );
  });

  // Ordered trip (user-defined sequence)
  document.getElementById("orderedTripAddBtn")?.addEventListener("click", () => {
    const picker = document.getElementById("orderedTripPicker");
    const val = picker?.value;
    if (!val) return;
    orderedSequence.push(val);
    renderOrderedSequence();
  });

  document.getElementById("orderedTripClearBtn")?.addEventListener("click", () => {
    orderedSequence.splice(0, orderedSequence.length);
    renderOrderedSequence();
  });

  document.getElementById("btnCustomOrder")?.addEventListener("click", () => {
    const rawList = orderedSequence.slice();
    if (rawList.length < 2) {
      renderResult("User Ordered Trip", [], 0, "Add at least two teams to the ordered list.");
      return;
    }

    const resolved = [];
    const missing = [];
    rawList.forEach(name => {
      const found = nameLookup.get(name.toLowerCase());
      if (found) {
        resolved.push(found);
      } else {
        missing.push(name);
      }
    });

    if (missing.length) {
      renderResult(
        "User Ordered Trip",
        [],
        0,
        `Not found: ${missing.join(", ")}. Please use team names from the list.`
      );
      return;
    }

    const res = totalDistanceForOrderedTeams(resolved);
    if (!res.legs.length) {
      renderResult("User Ordered Trip", [], 0, "Unable to compute route; check team names.");
      return;
    }
    renderResult(
      "User Ordered Trip",
      res.legs.map(l => ({
        from: l.fromTeam,
        to: l.toTeam,
        distance: l.distance
      })),
      res.totalDistance,
      `Order: ${resolved.join(" -> ")}`,
      buildStadiumOrderFromLegs(res.legs)
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
      "Starts at New England Patriots",
      res.stadiumOrder
    );
  });

  // Custom greedy trip
  document.getElementById("btnCustomGreedy")?.addEventListener("click", () => {
    const start = document.getElementById("customStartSelect").value;
    const list = Array.from(customTeamSelection);
    if (!start) {
      renderResult("Custom Greedy Trip", [], 0, "Select a starting team.");
      return;
    }
    if (list.length === 0) {
      renderResult("Custom Greedy Trip", [], 0, "Select at least one team to visit.");
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
      `Start: ${start}`,
      res.stadiumOrder
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
      "Minimum spanning tree across all stadiums",
      uniqueStadiumOrder(
        res.edges.reduce((acc, e) => {
          acc.push(e.from, e.to);
          return acc;
        }, [])
      )
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
      "Depth-first traversal starting at Minnesota Vikings",
      res.stadiumOrder
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
      "Breadth-first traversal starting at Los Angeles Rams (shortest edges first)",
      res.stadiumOrder
    );
  });
}
