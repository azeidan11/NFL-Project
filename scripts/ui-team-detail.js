import { getTeamByName, getStadiumById, getSouvenirsForTeam } from "./store.js";

export function renderTeamDetail(teamName) {
  const root =
    document.querySelector("#team-detail .content") ||
    document.querySelector("#team-detail");
  const team = getTeamByName(teamName);

  if (!team) {
    root.innerHTML = `<p class="muted">Team not found.</p>`;
    return;
  }

  const st = getStadiumById(team.stadiumId);
  const souvenirs = getSouvenirsForTeam(team.name);

  const souvenirHtml = souvenirs.length
    ? `
      <h4>Souvenirs</h4>
      <ul>
        ${souvenirs
          .map(
            item =>
              `<li>${item.name} - $${item.price.toFixed(2)}</li>`
          )
          .join("")}
      </ul>
    `
    : `<p class="muted">No souvenirs defined for this team.</p>`;

  root.innerHTML = `
    <h3>${team.name}</h3>
    <ul>
      <li><strong>Stadium:</strong> ${st?.name ?? "N/A"}</li>
      <li><strong>Capacity:</strong> ${st?.capacity?.toLocaleString?.() ?? "N/A"}</li>
      <li><strong>Location:</strong> ${st?.location?.city ?? ""}${
        st?.location ? ", " + st.location.state : ""
      }</li>
      <li><strong>Conference:</strong> ${team.conference}</li>
      <li><strong>Division:</strong> ${team.division}</li>
      <li><strong>Surface:</strong> ${st?.surface ?? "N/A"}</li>
      <li><strong>Roof:</strong> ${st?.roof ?? "N/A"}</li>
    </ul>
    ${souvenirHtml}
  `;
}