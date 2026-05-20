const state = {
  campaigns: [],
  users: [],
  campaignId: null,
  userId: null,
  data: null,
  activeSection: "all",
};

const sections = {
  overview: { label: "Weltübersicht", scope: "wiki" },
  locations: { label: "Orte", scope: "wiki" },
  characters: { label: "NSCs & Figuren", scope: "wiki" },
  factions: { label: "Fraktionen", scope: "wiki" },
  creatures: { label: "Kreaturen", scope: "wiki" },
  items: { label: "Artefakte", scope: "wiki" },
  plots: { label: "Plots & Quests", scope: "wiki" },
  lore: { label: "Geschichte & Lore", scope: "wiki" },
  rules: { label: "Regeln", scope: "wiki" },
  player_dossiers: { label: "Spielerakten", scope: "dm" },
  dm_notes: { label: "DM Notizen", scope: "dm" },
};

const templates = {
  generic: {
    label: "Freier Wiki-Artikel",
    category: "overview",
    visibility: "players",
    title: "Neuer Artikel",
    fields: ["Kurzbeschreibung", "Details", "Verknüpfte Artikel", "Offene Fragen"],
  },
  location: {
    label: "Ort / Siedlung",
    category: "locations",
    visibility: "players",
    title: "Neuer Ort",
    fields: ["Kurzbeschreibung", "Atmosphäre", "Wichtige Orte", "Bewohner", "Geheimnisse", "Abenteueraufhänger"],
  },
  character: {
    label: "NSC / Charakter",
    category: "characters",
    visibility: "players",
    title: "Neue Figur",
    fields: ["Rolle in der Welt", "Aussehen und Auftreten", "Ziele", "Beziehungen", "Was die Spieler wissen", "DM Geheimnisse"],
  },
  faction: {
    label: "Fraktion / Organisation",
    category: "factions",
    visibility: "players",
    title: "Neue Fraktion",
    fields: ["Kurzprofil", "Agenda", "Ressourcen", "Verbündete", "Feinde", "Einflussgebiete", "Geheimnisse"],
  },
  creature: {
    label: "Kreatur / Monster",
    category: "creatures",
    visibility: "players",
    title: "Neue Kreatur",
    fields: ["Beschreibung", "Lebensraum", "Verhalten", "Fähigkeiten", "Schwächen", "Beute oder Spuren", "Statblock-Notizen"],
  },
  item: {
    label: "Artefakt / Gegenstand",
    category: "items",
    visibility: "players",
    title: "Neues Artefakt",
    fields: ["Erscheinung", "Geschichte", "Eigenschaften", "Kosten oder Risiko", "Aktueller Besitzer", "Geheimnis"],
  },
  plot: {
    label: "Plot / Quest",
    category: "plots",
    visibility: "players",
    title: "Neuer Plot",
    fields: ["Auslöser", "Ziel", "Beteiligte", "Hinweise", "Komplikationen", "Mögliche Ausgänge", "Status"],
  },
  lore: {
    label: "Geschichte / Mythos",
    category: "lore",
    visibility: "players",
    title: "Neuer Lore-Eintrag",
    fields: ["Kurzfassung", "Historischer Ablauf", "Beteiligte", "Bekannte Version", "Wahre Version", "Auswirkungen heute"],
  },
  rule: {
    label: "Hausregel",
    category: "rules",
    visibility: "players",
    title: "Neue Regel",
    fields: ["Regeltext", "Warum diese Regel existiert", "Beispiele", "Ausnahmen", "Betrifft"],
  },
  player_dossier: {
    label: "Spielerakte",
    category: "player_dossiers",
    visibility: "dm",
    title: "Neue Spielerakte",
    fields: ["Spieler", "Charakter", "Backstory-Hebel", "Persönliche Ziele", "Offene Geheimnisse", "Belohnungsideen"],
  },
  dm_secret: {
    label: "DM Geheimnis",
    category: "dm_notes",
    visibility: "dm",
    title: "Neue DM-Notiz",
    fields: ["Kernidee", "Wahrheit hinter der Fassade", "Betroffene Artikel", "Foreshadowing", "Wann enthüllen", "Fallback"],
  },
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Aktion fehlgeschlagen.");
  }
  return data;
}

async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.campaigns = data.campaigns;
  state.users = data.users;
  state.campaignId = state.campaigns[0]?.id;
  state.userId = state.users[0]?.id;
  renderStaticOptions();
  renderSelectors();
  await loadCampaign();
}

function renderStaticOptions() {
  $("categoryInput").innerHTML = Object.entries(sections)
    .map(([key, section]) => `<option value="${key}">${escapeHtml(section.label)}</option>`)
    .join("");
  $("templateInput").innerHTML = Object.entries(templates)
    .map(([key, template]) => `<option value="${key}">${escapeHtml(template.label)}</option>`)
    .join("");
}

function renderSelectors() {
  $("campaignSelect").innerHTML = state.campaigns
    .map((campaign) => `<option value="${campaign.id}">${escapeHtml(campaign.name)}</option>`)
    .join("");
  $("userSelect").innerHTML = state.users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.display_name)} (${user.role})</option>`)
    .join("");
  $("campaignSelect").value = state.campaignId;
  $("userSelect").value = state.userId;
}

async function loadCampaign() {
  if (!state.campaignId || !state.userId) return;
  state.data = await api(`/api/campaign?campaign_id=${state.campaignId}&user_id=${state.userId}`);
  if (state.data.membership.role !== "dm" && getSectionScope(state.activeSection) === "dm") {
    state.activeSection = "all";
  }
  renderCampaign();
}

function renderCampaign() {
  const { campaign, membership, members } = state.data;
  $("system").textContent = `${campaign.system} · ${membership.role === "dm" ? "DM Ansicht" : "Spieler Ansicht"}`;
  $("campaignName").textContent = campaign.name;
  $("campaignDescription").textContent = campaign.description;
  $("newPageButton").style.display = membership.role === "dm" ? "inline-flex" : "none";
  $("addMemberButton").style.display = membership.role === "dm" ? "inline-grid" : "none";
  $("dmTab").style.display = membership.role === "dm" ? "inline-flex" : "none";
  if (membership.role !== "dm" && $("dmView").classList.contains("active")) {
    activateTab("wiki");
  }

  $("members").innerHTML = members
    .map((member) => `<div class="member"><span>${escapeHtml(member.display_name)}</span><span class="role">${member.role}</span></div>`)
    .join("");

  renderSectionNav();
  renderPages();
  renderNotes();
}

function renderSectionNav() {
  const canSeeDm = state.data.membership.role === "dm";
  const visibleSections = Object.entries(sections).filter(([, section]) => canSeeDm || section.scope !== "dm");
  const allActive = state.activeSection === "all" ? "active" : "";
  $("sectionNav").innerHTML = `
    <button class="section-link ${allActive}" data-section="all">Alle Artikel</button>
    ${visibleSections
      .map(([key, section]) => `<button class="section-link ${state.activeSection === key ? "active" : ""}" data-section="${key}">${escapeHtml(section.label)}</button>`)
      .join("")}
  `;
  document.querySelectorAll(".section-link").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.section;
      renderSectionNav();
      renderPages();
    });
  });
}

function renderPages() {
  const wikiPages = filteredPages("wiki");
  const dmPages = filteredPages("dm");

  $("pages").innerHTML = wikiPages.length
    ? wikiPages.map(renderPageCard).join("")
    : `<div class="empty">Noch keine Wiki-Seiten in diesem Bereich.</div>`;

  $("dmPages").innerHTML = dmPages.length
    ? dmPages.map(renderPageCard).join("")
    : `<div class="empty">Noch keine DM-Einträge vorhanden.</div>`;
}

function filteredPages(scope) {
  return state.data.pages.filter((page) => {
    const section = sections[page.category] || sections.overview;
    const matchesScope = section.scope === scope;
    const matchesSection = state.activeSection === "all" || state.activeSection === page.category;
    return matchesScope && matchesSection;
  });
}

function renderNotes() {
  const { notes } = state.data;
  $("notes").innerHTML = notes.length
    ? notes.map(renderNoteCard).join("")
    : `<div class="empty">Noch keine Session-Notizen vorhanden.</div>`;
}

function renderPageCard(page) {
  const canEdit = state.data.membership.role === "dm";
  const template = templates[page.template_key] || templates.generic;
  return `
    <article class="card">
      <div class="meta">
        <span class="pill">${escapeHtml(sections[page.category]?.label || "Wiki")}</span>
        <span>${escapeHtml(template.label)}</span>
        <span>${page.visibility === "dm" ? "Nur DM" : "Spieler sichtbar"}</span>
      </div>
      <h3>${escapeHtml(page.title)}</h3>
      ${page.summary ? `<p class="summary">${escapeHtml(page.summary)}</p>` : ""}
      <div class="body">${escapeHtml(page.body)}</div>
      ${canEdit ? `<button onclick="openPageEditor(${page.id})">Bearbeiten</button>` : ""}
    </article>
  `;
}

function renderNoteCard(note) {
  const canEdit = state.data.membership.role === "dm" || note.user_id === state.userId;
  return `
    <article class="card">
      <div class="meta">
        <span class="pill">${escapeHtml(note.author)}</span>
        <span>${formatDate(note.updated_at)}</span>
      </div>
      <h3>${escapeHtml(note.title)}</h3>
      <div class="body">${escapeHtml(note.body)}</div>
      ${canEdit ? `<button onclick="openNoteEditor(${note.id})">Bearbeiten</button>` : ""}
    </article>
  `;
}

function openPageEditor(id = null, templateKey = "generic") {
  const page = state.data.pages.find((entry) => entry.id === id);
  const template = page ? templates[page.template_key] || templates.generic : templates[templateKey];
  $("editorType").value = "page";
  $("editorId").value = page?.id || "";
  $("editorTitle").textContent = page ? "Wiki-Seite bearbeiten" : "Neuer Wiki-Eintrag";
  $("titleInput").value = page?.title || template.title;
  $("summaryInput").value = page?.summary || "";
  $("templateInput").value = page?.template_key || templateKey;
  $("categoryInput").value = page?.category || template.category;
  $("visibilityInput").value = page?.visibility || template.visibility;
  $("bodyInput").value = page?.body || bodyFromTemplate(template);
  $("pageOptions").style.display = "grid";
  $("summaryLabel").style.display = "grid";
  $("templateInput").disabled = Boolean(page);
  $("editor").showModal();
}

function openTemplatePicker() {
  $("templateGrid").innerHTML = Object.entries(templates)
    .map(([key, template]) => {
      const section = sections[template.category];
      return `
        <button class="template-card" value="${key}">
          <strong>${escapeHtml(template.label)}</strong>
          <span>${escapeHtml(section.label)} · ${template.visibility === "dm" ? "Nur DM" : "Spieler sichtbar"}</span>
        </button>
      `;
    })
    .join("");
  $("templateDialog").showModal();
}

function openNoteEditor(id = null) {
  const note = state.data.notes.find((entry) => entry.id === id);
  $("editorType").value = "note";
  $("editorId").value = note?.id || "";
  $("editorTitle").textContent = note ? "Session-Notiz bearbeiten" : "Neue Session-Notiz";
  $("titleInput").value = note?.title || "";
  $("summaryInput").value = "";
  $("bodyInput").value = note?.body || "Zusammenfassung\n\nWichtige Ereignisse\n- \n\nOffene Fragen\n- \n\nLoot und Hinweise\n- ";
  $("pageOptions").style.display = "none";
  $("summaryLabel").style.display = "none";
  $("templateInput").disabled = false;
  $("editor").showModal();
}

function bodyFromTemplate(template) {
  return template.fields.map((field) => `${field}\n`).join("\n");
}

function applyTemplate(key) {
  const template = templates[key];
  $("templateInput").value = key;
  $("categoryInput").value = template.category;
  $("visibilityInput").value = template.visibility;
  if (!$("titleInput").value || $("titleInput").value === "Neuer Artikel") {
    $("titleInput").value = template.title;
  }
  $("bodyInput").value = bodyFromTemplate(template);
}

async function saveEditor(event) {
  event.preventDefault();
  const type = $("editorType").value;
  const id = $("editorId").value;
  const payload = {
    campaign_id: state.campaignId,
    user_id: state.userId,
    title: $("titleInput").value,
    summary: $("summaryInput").value,
    body: $("bodyInput").value,
  };

  if (type === "page") {
    payload.category = $("categoryInput").value;
    payload.template_key = $("templateInput").value;
    payload.visibility = $("visibilityInput").value;
    if (id) {
      await api(`/api/pages/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/api/pages", { method: "POST", body: JSON.stringify(payload) });
    }
  } else {
    if (id) {
      await api(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/api/notes", { method: "POST", body: JSON.stringify(payload) });
    }
  }

  $("editor").close();
  await loadCampaign();
}

async function createCampaign(event) {
  event.preventDefault();
  const result = await api("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: $("newCampaignName").value,
      system: $("newCampaignSystem").value,
      dm_name: $("newDmName").value,
      description: $("newCampaignDescription").value,
    }),
  });
  $("campaignDialog").close();
  const data = await api("/api/bootstrap");
  state.campaigns = data.campaigns;
  state.users = data.users;
  state.campaignId = result.id;
  state.userId = result.dm_user_id;
  renderSelectors();
  await loadCampaign();
}

async function addMember(event) {
  event.preventDefault();
  await api("/api/members", {
    method: "POST",
    body: JSON.stringify({
      campaign_id: state.campaignId,
      user_id: state.userId,
      display_name: $("memberNameInput").value,
      role: $("memberRoleInput").value,
    }),
  });
  $("memberDialog").close();
  $("memberNameInput").value = "";
  const data = await api("/api/bootstrap");
  state.users = data.users;
  renderSelectors();
  await loadCampaign();
}

function getSectionScope(sectionKey) {
  return sections[sectionKey]?.scope;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

$("campaignSelect").addEventListener("change", async (event) => {
  state.campaignId = Number(event.target.value);
  await loadCampaign();
});

$("userSelect").addEventListener("change", async (event) => {
  state.userId = Number(event.target.value);
  await loadCampaign();
});

$("newPageButton").addEventListener("click", openTemplatePicker);
$("newNoteButton").addEventListener("click", () => openNoteEditor());
$("saveButton").addEventListener("click", saveEditor);
$("newCampaignButton").addEventListener("click", () => $("campaignDialog").showModal());
$("createCampaignButton").addEventListener("click", createCampaign);
$("addMemberButton").addEventListener("click", () => $("memberDialog").showModal());
$("saveMemberButton").addEventListener("click", addMember);
$("templateInput").addEventListener("change", (event) => applyTemplate(event.target.value));
$("templateGrid").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  $("templateDialog").close();
  openPageEditor(null, button.value);
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
  });
});

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  $(`${tabName}View`).classList.add("active");
}

bootstrap().catch((error) => {
  document.body.innerHTML = `<main class="empty">${escapeHtml(error.message)}</main>`;
});
