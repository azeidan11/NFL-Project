import {
  addTeamsFromCsvText,
  updateSouvenirPriceAll,
  addSouvenirAll,
  deleteSouvenirAll,
  getSouvenirNames,
  getTeamsSorted,
  updateTeamStadium,
  addSouvenirForTeam,
  deleteSouvenirForTeam,
  getSouvenirsForTeam,
  updateSouvenirForTeam
} from "./store.js";
import { renderTeamList } from "./ui-team-list.js";
import { renderStadiumList } from "./ui-stadium-list.js";

const ADMIN_PASSWORD = "admin";
let unlocked = false;

function setAdminStatus(message, isError = false) {
  const status = document.getElementById("adminStatus");
  if (status) {
    status.textContent = message;
    status.style.color = isError ? "crimson" : "inherit";
  }
}

function toggleAdminContent(show) {
  const content = document.getElementById("adminContent");
  const guard = document.getElementById("adminGuard");
  if (content) content.hidden = !show;
  if (guard) guard.hidden = show;
}

function getSelectedSouvenirName() {
  const select = document.getElementById("souvenirNameSelect");
  return select?.value ?? "";
}

function refreshSouvenirNames() {
  const select = document.getElementById("souvenirNameSelect");
  if (!select) return;
  const names = getSouvenirNames();
  select.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join("");
}

function refreshTeamChoices() {
  const names = getTeamsSorted().map(t => t.name);
  const selects = [
    document.getElementById("stadiumTeamSelect"),
    document.getElementById("teamSouvenirTeamSelect")
  ];
  selects.forEach(select => {
    if (!select) return;
    select.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join("");
  });
  refreshTeamSouvenirNames();
}

function refreshTeamSouvenirNames() {
  const teamSelect = document.getElementById("teamSouvenirTeamSelect");
  const deleteSelect = document.getElementById("teamSouvenirDeleteSelect");
  const updateSelect = document.getElementById("teamSouvenirUpdateSelect");
  if (!teamSelect) return;
  const team = teamSelect.value;
  const names = getSouvenirsForTeam(team).map(s => s.name);
  if (deleteSelect) {
    deleteSelect.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join("");
  }
  if (updateSelect) {
    updateSelect.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join("");
  }
}

function handleAddTeamsFromFile() {
  const input = document.getElementById("adminTeamFile");
  if (!input?.files?.length) {
    setAdminStatus("Choose a team CSV file first.", true);
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const { addedTeams, addedStadiums } = addTeamsFromCsvText(text);
      renderTeamList();
      renderStadiumList();
      setAdminStatus(`Added ${addedTeams} team(s) and ${addedStadiums} stadium(s) from file.`);
    } catch (err) {
      console.error(err);
      setAdminStatus("Failed to import teams. Check file format.", true);
    }
  };
  reader.readAsText(file);
}

function handleUpdateSouvenirPrice() {
  const name = getSelectedSouvenirName();
  const priceInput = document.getElementById("souvenirPriceInput");
  const newPrice = Number(priceInput?.value);
  if (!name) {
    setAdminStatus("Select a souvenir to update.", true);
    return;
  }
  if (!Number.isFinite(newPrice)) {
    setAdminStatus("Enter a valid price.", true);
    return;
  }
  const updated = updateSouvenirPriceAll(name, newPrice);
  setAdminStatus(updated ? `Updated "${name}" price for all teams.` : "Souvenir not found.", !updated);
}

function handleAddSouvenir() {
  const nameInput = document.getElementById("newSouvenirName");
  const priceInput = document.getElementById("newSouvenirPrice");
  const name = nameInput?.value.trim();
  const price = Number(priceInput?.value);
  if (!name) {
    setAdminStatus("Enter a souvenir name.", true);
    return;
  }
  if (!Number.isFinite(price)) {
    setAdminStatus("Enter a valid price.", true);
    return;
  }
  addSouvenirAll(name, price);
  refreshSouvenirNames();
  setAdminStatus(`Added souvenir "${name}" to all teams.`);
}

function handleDeleteSouvenir() {
  const name = getSelectedSouvenirName();
  if (!name) {
    setAdminStatus("Select a souvenir to delete.", true);
    return;
  }
  const removed = deleteSouvenirAll(name);
  refreshSouvenirNames();
  setAdminStatus(removed ? `Deleted souvenir "${name}" from all teams.` : "Souvenir not found.", !removed);
}

export function initAdminUI() {
  const loginBtn = document.getElementById("adminLoginBtn");
  const pwdInput = document.getElementById("adminPasswordInput");
  const addTeamBtn = document.getElementById("adminAddTeamBtn");
  const updatePriceBtn = document.getElementById("souvenirUpdateBtn");
  const addSouvenirBtn = document.getElementById("souvenirAddBtn");
  const deleteSouvenirBtn = document.getElementById("souvenirDeleteBtn");

  loginBtn?.addEventListener("click", () => {
    const pwd = pwdInput?.value ?? "";
    if (pwd === ADMIN_PASSWORD) {
      unlocked = true;
      toggleAdminContent(true);
      refreshSouvenirNames();
      refreshTeamChoices();
      setAdminStatus("Unlocked.");
    } else {
      setAdminStatus("Invalid password.", true);
    }
  });

  addTeamBtn?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    handleAddTeamsFromFile();
  });

  updatePriceBtn?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    handleUpdateSouvenirPrice();
  });

  addSouvenirBtn?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    handleAddSouvenir();
  });

  deleteSouvenirBtn?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    handleDeleteSouvenir();
  });

  document.getElementById("stadiumUpdateBtn")?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    const team = document.getElementById("stadiumTeamSelect")?.value;
    const name = document.getElementById("stadiumNameInput")?.value?.trim();
    const capacity = Number(document.getElementById("stadiumCapacityInput")?.value);
    const roof = document.getElementById("stadiumRoofInput")?.value?.trim();
    const surface = document.getElementById("stadiumSurfaceInput")?.value?.trim();
    const opened = Number(document.getElementById("stadiumOpenedInput")?.value);
    const city = document.getElementById("stadiumCityInput")?.value?.trim();
    const state = document.getElementById("stadiumStateInput")?.value?.trim();

    if (!team || !name) {
      setAdminStatus("Select a team and enter a stadium name.", true);
      return;
    }

    const { updated } = updateTeamStadium(team, {
      name,
      capacity: Number.isFinite(capacity) ? capacity : undefined,
      roof: roof || undefined,
      surface: surface || undefined,
      opened: Number.isFinite(opened) ? opened : undefined,
      city: city || undefined,
      state: state || undefined
    });

    if (updated) {
      renderTeamList();
      renderStadiumList();
      setAdminStatus(`Updated stadium for ${team}.`);
    } else {
      setAdminStatus("Failed to update stadium. Check inputs.", true);
    }
  });

  document.getElementById("teamSouvenirTeamSelect")?.addEventListener("change", () => {
    if (!unlocked) return;
    refreshTeamSouvenirNames();
  });

  document.getElementById("teamSouvenirAddBtn")?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    const team = document.getElementById("teamSouvenirTeamSelect")?.value;
    const name = document.getElementById("teamSouvenirNameInput")?.value?.trim();
    const price = Number(document.getElementById("teamSouvenirPriceInput")?.value);
    if (!team || !name || !Number.isFinite(price)) {
      setAdminStatus("Select a team and enter a valid souvenir name/price.", true);
      return;
    }
    const added = addSouvenirForTeam(team, name, price);
    refreshTeamSouvenirNames();
    setAdminStatus(added ? `Added "${name}" for ${team}.` : "Souvenir already exists for that team.", !added);
  });

  document.getElementById("teamSouvenirDeleteBtn")?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    const team = document.getElementById("teamSouvenirTeamSelect")?.value;
    const name = document.getElementById("teamSouvenirDeleteSelect")?.value;
    if (!team || !name) {
      setAdminStatus("Select a team and souvenir to delete.", true);
      return;
    }
    const removed = deleteSouvenirForTeam(team, name);
    refreshTeamSouvenirNames();
    setAdminStatus(removed ? `Deleted "${name}" for ${team}.` : "Souvenir not found for that team.", !removed);
  });

  document.getElementById("teamSouvenirUpdateBtn")?.addEventListener("click", () => {
    if (!unlocked) return setAdminStatus("Unlock admin first.", true);
    const team = document.getElementById("teamSouvenirTeamSelect")?.value;
    const name = document.getElementById("teamSouvenirUpdateSelect")?.value;
    const price = Number(document.getElementById("teamSouvenirUpdatePriceInput")?.value);
    if (!team || !name || !Number.isFinite(price)) {
      setAdminStatus("Select a team, souvenir, and enter a valid price.", true);
      return;
    }
    const updated = updateSouvenirForTeam(team, name, price);
    setAdminStatus(updated ? `Updated "${name}" price for ${team}.` : "Souvenir not found for that team.", !updated);
  });
}
