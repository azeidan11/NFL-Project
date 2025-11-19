import { renderTeamList } from "./ui-team-list.js";
import { renderTeamDetail } from "./ui-team-detail.js";
import { renderStadiumList } from "./ui-stadium-list.js";
import { ensureStoreLoaded, getTeamsFiltered, NFC_NORTH_FILTER } from "./store.js";

const TEAM_FILTERS = {
  all: null,
  afc: { conference: "AFC" },
  nfc: { conference: "NFC" },
  nfcNorth: NFC_NORTH_FILTER
};
const STADIUM_FILTERS = {
  all: null,
  open: "open"
};
const STADIUM_SORTS = {
  name: "name",
  opened: "opened"
};

let currentTeamFilterKey = "all";
let currentTeamFilter = TEAM_FILTERS[currentTeamFilterKey];
let currentStadiumFilterKey = "all";
let currentStadiumFilter = STADIUM_FILTERS[currentStadiumFilterKey];
let currentStadiumSortKey = "name";
let currentStadiumSort = STADIUM_SORTS[currentStadiumSortKey];

function wireControls() {
  const search = document.getElementById("searchInput");
  const btnAllTeams = document.getElementById("filterAllTeams");
  const btnAfc = document.getElementById("filterAFC");
  const btnNfc = document.getElementById("filterNFC");
  const btnNfcNorth = document.getElementById("filterNfcNorth");

  // case insensitive partial search on Enter
  search.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = search.value.trim().toLowerCase();
      if (!q) return;

      const filter = currentTeamFilter ?? {};
      const hasFilter = filter && Object.keys(filter).length > 0;
      const allowedTeams = hasFilter ? getTeamsFiltered(filter) : getTeamsFiltered();
      const allowedNames = allowedTeams.map(team => team.name);
      const found = allowedNames.find(name => name.toLowerCase().includes(q));

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

  const filterButtons = {
    all: btnAllTeams,
    afc: btnAfc,
    nfc: btnNfc,
    nfcNorth: btnNfcNorth
  };

  const updateFilterButtons = key => {
    Object.entries(filterButtons).forEach(([name, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", name === key);
    });
  };

  const applyFilter = key => {
    currentTeamFilterKey = key;
    currentTeamFilter = TEAM_FILTERS[key] ?? null;
    updateFilterButtons(key);
    renderTeamList(currentTeamFilter);
  };

  btnAllTeams?.addEventListener("click", () => applyFilter("all"));
  btnAfc?.addEventListener("click", () => applyFilter("afc"));
  btnNfc?.addEventListener("click", () => applyFilter("nfc"));
  btnNfcNorth?.addEventListener("click", () => applyFilter("nfcNorth"));
  updateFilterButtons(currentTeamFilterKey);

  const tabButtons = document.querySelectorAll("[data-tab-target]");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const stadiumSearch = document.getElementById("stadiumSearchInput");
  const btnStadiumAll = document.getElementById("stadiumFilterAll");
  const btnStadiumOpen = document.getElementById("stadiumFilterOpen");
  const btnStadiumSortName = document.getElementById("stadiumSortName");
  const btnStadiumSortOpened = document.getElementById("stadiumSortOpened");

  const switchTab = target => {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tabTarget === target;
      btn.classList.toggle("active", isActive);
    });
    tabPanels.forEach(panel => {
      const isActive = panel.dataset.tab === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
    if (target === "stadiums" && stadiumSearch) {
      stadiumSearch.focus();
    }
  };

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tabTarget));
  });
  switchTab("teams");

  stadiumSearch?.addEventListener("input", () => {
    renderStadiumList({ query: stadiumSearch.value, roofType: currentStadiumFilter, sortKey: currentStadiumSort });
  });

  const stadiumFilterButtons = {
    all: btnStadiumAll,
    open: btnStadiumOpen
  };

  const updateStadiumFilterButtons = key => {
    Object.entries(stadiumFilterButtons).forEach(([name, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", name === key);
    });
  };

  const applyStadiumFilter = key => {
    currentStadiumFilterKey = key;
    currentStadiumFilter = STADIUM_FILTERS[key] ?? null;
    updateStadiumFilterButtons(key);
    const query = stadiumSearch?.value ?? "";
    renderStadiumList({ query, roofType: currentStadiumFilter, sortKey: currentStadiumSort });
  };

  btnStadiumAll?.addEventListener("click", () => applyStadiumFilter("all"));
  btnStadiumOpen?.addEventListener("click", () => applyStadiumFilter("open"));
  updateStadiumFilterButtons(currentStadiumFilterKey);

  const stadiumSortButtons = {
    name: btnStadiumSortName,
    opened: btnStadiumSortOpened
  };

  const updateStadiumSortButtons = key => {
    Object.entries(stadiumSortButtons).forEach(([name, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", name === key);
    });
  };

  const applyStadiumSort = key => {
    currentStadiumSortKey = key;
    currentStadiumSort = STADIUM_SORTS[key] ?? "name";
    updateStadiumSortButtons(key);
    const query = stadiumSearch?.value ?? "";
    renderStadiumList({ query, roofType: currentStadiumFilter, sortKey: currentStadiumSort });
  };

  btnStadiumSortName?.addEventListener("click", () => applyStadiumSort("name"));
  btnStadiumSortOpened?.addEventListener("click", () => applyStadiumSort("opened"));
  updateStadiumSortButtons(currentStadiumSortKey);
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
  renderTeamList(currentTeamFilter);
  renderStadiumList({ roofType: currentStadiumFilter, sortKey: currentStadiumSort });
  // renderTeamDetail("Green Bay Packers"); // optional default
}

window.addEventListener("DOMContentLoaded", () => {
  init();
});
