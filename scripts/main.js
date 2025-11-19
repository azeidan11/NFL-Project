import { renderTeamList } from "./ui-team-list.js";
import { renderTeamDetail } from "./ui-team-detail.js";
import { mapByTeamName, ensureStoreLoaded } from "./store.js"; // add mapByTeamName

let currentFilter = "ALL";

function wireControls() {
  const search = document.getElementById("searchInput");
  const btnAll = document.getElementById("filterAll");
  const btnA = document.getElementById("filterAFC");
  const btnN = document.getElementById("filterNFC");

  btnAll.addEventListener("click", () => { currentFilter = "ALL"; renderTeamList(currentFilter); });
  btnA.addEventListener("click", () => { currentFilter = "AFC"; renderTeamList(currentFilter); });
  btnN.addEventListener("click", () => { currentFilter = "NFC"; renderTeamList(currentFilter); });

  // case insensitive partial search on Enter
  search.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = search.value.trim().toLowerCase();
      if (!q) return;

      // get all team names from our CustomMap
      const keys = mapByTeamName.sortedKeys ? mapByTeamName.sortedKeys() : [];

      // find first partial match
      const found = keys.find(name => name.toLowerCase().includes(q));

      const detailEl = document.querySelector("#team-detail .content");
      if (found) {
        renderTeamDetail(found);
      } else {
        detailEl.innerHTML = `<p class="muted">No match found for "${q}". Try another name.</p>`;
      }
    }
  });

  window.addEventListener("team:selected", e => {
    renderTeamDetail(e.detail.name);
  });
}

async function init() {
  try {
    await ensureStoreLoaded();
  } catch (err) {
    console.error("Failed to load team data:", err);
    const detailEl = document.querySelector("#team-detail .content");
    if (detailEl) {
      detailEl.innerHTML = `<p class="muted">Unable to load NFL data. Please refresh and try again.</p>`;
    }
    return;
  }

  wireControls();
  renderTeamList(currentFilter);
  // renderTeamDetail("Green Bay Packers"); // optional default
}

window.addEventListener("DOMContentLoaded", () => {
  init();
});
