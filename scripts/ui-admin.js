import {
  addTeamsFromCsvText,
  updateSouvenirPriceAll,
  addSouvenirAll,
  deleteSouvenirAll,
  getSouvenirNames
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
}
