const state = {
  user: null,
  campaigns: [],
  campaignId: null,
  data: null,
  activeSection: "all",
  inviteToken: new URLSearchParams(location.search).get("invite"),
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
  generic: { label: "Freier Wiki-Artikel", category: "overview", visibility: "players", title: "Neuer Artikel", fields: ["Kurzbeschreibung", "Details", "Verknüpfte Artikel", "Offene Fragen"] },
  location: { label: "Ort / Siedlung", category: "locations", visibility: "players", title: "Neuer Ort", fields: ["Kurzbeschreibung", "Atmosphäre", "Wichtige Orte", "Bewohner", "Geheimnisse", "Abenteueraufhänger"] },
  character: { label: "NSC / Charakter", category: "characters", visibility: "players", title: "Neue Figur", fields: ["Rolle in der Welt", "Aussehen und Auftreten", "Ziele", "Beziehungen", "Was die Spieler wissen", "DM Geheimnisse"] },
  faction: { label: "Fraktion / Organisation", category: "factions", visibility: "players", title: "Neue Fraktion", fields: ["Kurzprofil", "Agenda", "Ressourcen", "Verbündete", "Feinde", "Einflussgebiete", "Geheimnisse"] },
  creature: { label: "Kreatur / Monster", category: "creatures", visibility: "players", title: "Neue Kreatur", fields: ["Beschreibung", "Lebensraum", "Verhalten", "Fähigkeiten", "Schwächen", "Beute oder Spuren", "Statblock-Notizen"] },
  item: { label: "Artefakt / Gegenstand", category: "items", visibility: "players", title: "Neues Artefakt", fields: ["Erscheinung", "Geschichte", "Eigenschaften", "Kosten oder Risiko", "Aktueller Besitzer", "Geheimnis"] },
  plot: { label: "Plot / Quest", category: "plots", visibility: "players", title: "Neuer Plot", fields: ["Auslöser", "Ziel", "Beteiligte", "Hinweise", "Komplikationen", "Mögliche Ausgänge", "Status"] },
  lore: { label: "Geschichte / Mythos", category: "lore", visibility: "players", title: "Neuer Lore-Eintrag", fields: ["Kurzfassung", "Historischer Ablauf", "Beteiligte", "Bekannte Version", "Wahre Version", "Auswirkungen heute"] },
  rule: { label: "Hausregel", category: "rules", visibility: "players", title: "Neue Regel", fields: ["Regeltext", "Warum diese Regel existiert", "Beispiele", "Ausnahmen", "Betrifft"] },
  player_dossier: { label: "Spielerakte", category: "player_dossiers", visibility: "dm", title: "Neue Spielerakte", fields: ["Spieler", "Charakter", "Backstory-Hebel", "Persönliche Ziele", "Offene Geheimnisse", "Belohnungsideen"] },
  dm_secret: { label: "DM Geheimnis", category: "dm_notes", visibility: "dm", title: "Neue DM-Notiz", fields: ["Kernidee", "Wahrheit hinter der Fassade", "Betroffene Artikel", "Foreshadowing", "Wann enthüllen", "Fallback"] },
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });
  const contentType = response.headers.get("Content-Type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data.error || "Aktion fehlgeschlagen.");
  return data;
}

async function init() {
  renderStaticOptions();
  const session = await api("/api/auth/session");
  renderAuthMode(session);
  if (!session.user) {
    showAuth();
    return;
  }
  state.user = session.user;
  await bootstrap();
}

async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.user = data.user;
  state.campaigns = data.campaigns;
  state.campaignId = state.campaignId || state.campaigns[0]?.id || null;
  showApp();
  renderSelectors();
  await loadCampaign();
  await loadInviteBanner();
}

function showAuth() {
  $("authView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

function renderAuthMode(session) {
  $("authView").classList.toggle("setup-mode", session.setup_required);
  $("authTitle").textContent = session.setup_required ? "CampaignCodex einrichten" : "CampaignCodex";
  $("authIntro").textContent = session.setup_required
    ? "Lege beim ersten Start den lokalen Admin-Account an. Danach kannst du Kampagnen, Benutzer und Einladungen verwalten."
    : "Melde dich lokal an oder nutze OAuth2/OIDC, wenn es auf dem Server eingerichtet ist.";
  $("oauthLogin").classList.toggle("hidden", !session.oauth_enabled || session.setup_required);
  $("loginForm").classList.toggle("hidden", session.setup_required);
  $("setupForm").classList.toggle("hidden", !session.setup_required);
}

function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("currentUser").textContent = `${state.user.display_name} · ${state.user.global_role}`;
}

function renderStaticOptions() {
  $("categoryInput").innerHTML = Object.entries(sections).map(([key, section]) => `<option value="${key}">${escapeHtml(section.label)}</option>`).join("");
  $("templateInput").innerHTML = Object.entries(templates).map(([key, template]) => `<option value="${key}">${escapeHtml(template.label)}</option>`).join("");
}

function renderSelectors() {
  $("campaignSelect").innerHTML = state.campaigns.map((campaign) => `<option value="${campaign.id}">${escapeHtml(campaign.name)}</option>`).join("");
  $("campaignSelect").value = state.campaignId || "";
}

async function loadCampaign() {
  if (!state.campaignId) {
    state.data = null;
    $("system").textContent = "";
    $("campaignName").textContent = "Keine Kampagne";
    $("campaignDescription").textContent = "Erstelle eine neue Kampagne, um dein Wiki zu starten.";
    $("newPageButton").style.display = "none";
    $("newNoteButton").style.display = "none";
    $("addMemberButton").style.display = "none";
    $("dmTab").style.display = "none";
    $("members").innerHTML = "";
    $("sectionNav").innerHTML = "";
    $("pages").innerHTML = `<div class="empty">Noch keine Kampagne vorhanden.</div>`;
    $("dmPages").innerHTML = "";
    $("notes").innerHTML = "";
    $("searchResults").innerHTML = "";
    document.querySelector('[data-tab="settings"]').style.display = "none";
    return;
  }
  state.data = await api(`/api/campaign?campaign_id=${state.campaignId}`);
  if (!canManage() && getSectionScope(state.activeSection) === "dm") state.activeSection = "all";
  renderCampaign();
}

function renderCampaign() {
  const { campaign, membership, members } = state.data;
  $("system").textContent = `${campaign.system} · ${membership?.role || state.user.global_role}`;
  $("campaignName").textContent = campaign.name;
  $("campaignDescription").textContent = campaign.description;
  $("newPageButton").style.display = membership ? "inline-flex" : "none";
  $("newNoteButton").style.display = membership ? "inline-flex" : "none";
  $("addMemberButton").style.display = canManage() ? "inline-grid" : "none";
  $("dmTab").style.display = canManage() ? "inline-flex" : "none";
  if (!canManage() && $("dmView").classList.contains("active")) activateTab("wiki");

  $("members").innerHTML = members.map((member) => `<div class="member"><span>${escapeHtml(member.display_name)}</span><span class="role">${member.role}</span></div>`).join("");
  renderSectionNav();
  renderPages();
  renderNotes();
  renderSettings();
}

function canManage() {
  return state.user?.global_role === "admin" || state.data?.membership?.role === "dm";
}

function renderSectionNav() {
  const visibleSections = Object.entries(sections).filter(([, section]) => canManage() || section.scope !== "dm");
  $("sectionNav").innerHTML = `
    <button class="section-link ${state.activeSection === "all" ? "active" : ""}" data-section="all">Alle Artikel</button>
    ${visibleSections.map(([key, section]) => `<button class="section-link ${state.activeSection === key ? "active" : ""}" data-section="${key}">${escapeHtml(section.label)}</button>`).join("")}
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
  $("pages").innerHTML = wikiPages.length ? wikiPages.map(renderPageCard).join("") : `<div class="empty">Noch keine Wiki-Seiten in diesem Bereich.</div>`;
  $("dmPages").innerHTML = dmPages.length ? dmPages.map(renderPageCard).join("") : `<div class="empty">Noch keine DM-Einträge vorhanden.</div>`;
}

function filteredPages(scope) {
  return state.data.pages.filter((page) => {
    const section = sections[page.category] || sections.overview;
    return section.scope === scope && (state.activeSection === "all" || state.activeSection === page.category);
  });
}

function renderPageCard(page) {
  const template = templates[page.template_key] || templates.generic;
  const attachments = attachmentsFor("page_id", page.id);
  return `
    <article class="card">
      <div class="meta">
        <span class="pill">${escapeHtml(sections[page.category]?.label || "Wiki")}</span>
        <span>${escapeHtml(template.label)}</span>
        <span>${visibilityLabel(page.visibility)}</span>
      </div>
      <h3>${escapeHtml(page.title)}</h3>
      ${page.summary ? `<p class="summary">${escapeHtml(page.summary)}</p>` : ""}
      <div class="markdown-body">${markdownToHtml(page.body)}</div>
      ${renderAttachments(attachments)}
      ${page.owner_id === state.user.id || canManage() ? `<button onclick="openPageEditor(${page.id})">Bearbeiten</button>` : ""}
    </article>
  `;
}

function renderNotes() {
  $("notes").innerHTML = state.data.notes.length ? state.data.notes.map(renderNoteCard).join("") : `<div class="empty">Noch keine Session-Notizen vorhanden.</div>`;
}

function renderNoteCard(note) {
  const attachments = attachmentsFor("note_id", note.id);
  return `
    <article class="card">
      <div class="meta"><span class="pill">${escapeHtml(note.author)}</span><span>${formatDate(note.updated_at)}</span></div>
      <h3>${escapeHtml(note.title)}</h3>
      <div class="markdown-body">${markdownToHtml(note.body)}</div>
      ${renderAttachments(attachments)}
      ${note.user_id === state.user.id || canManage() ? `<button onclick="openNoteEditor(${note.id})">Bearbeiten</button>` : ""}
    </article>
  `;
}

function attachmentsFor(field, id) {
  return state.data.attachments.filter((attachment) => attachment[field] === id);
}

function renderAttachments(attachments) {
  if (!attachments.length) return "";
  return `<div class="attachments">${attachments.map((attachment) => {
    const url = `/api/attachments/${attachment.id}/download`;
    const image = attachment.mime_type.startsWith("image/");
    return `<a href="${url}" target="_blank">${image ? `<img src="${url}" alt="">` : ""}<span>${escapeHtml(attachment.filename)}</span></a>`;
  }).join("")}</div>`;
}

function openTemplatePicker() {
  $("templateGrid").innerHTML = Object.entries(templates).map(([key, template]) => {
    const section = sections[template.category];
    if (section.scope === "dm" && !canManage()) return "";
    return `<button class="template-card" value="${key}"><strong>${escapeHtml(template.label)}</strong><span>${escapeHtml(section.label)} · ${visibilityLabel(template.visibility)}</span></button>`;
  }).join("");
  $("templateDialog").showModal();
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
  $("readerField").style.display = $("visibilityInput").value === "restricted" ? "block" : "none";
  $("attachmentInput").value = "";
  renderReaderList(page?.id);
  updatePreview();
  $("editor").showModal();
}

function openNoteEditor(id = null) {
  const note = state.data.notes.find((entry) => entry.id === id);
  $("editorType").value = "note";
  $("editorId").value = note?.id || "";
  $("editorTitle").textContent = note ? "Session-Notiz bearbeiten" : "Neue Session-Notiz";
  $("titleInput").value = note?.title || "";
  $("summaryInput").value = "";
  $("bodyInput").value = note?.body || "# Zusammenfassung\n\n## Wichtige Ereignisse\n- \n\n## Offene Fragen\n- \n\n## Loot und Hinweise\n- ";
  $("pageOptions").style.display = "none";
  $("summaryLabel").style.display = "none";
  $("readerField").style.display = "none";
  $("attachmentInput").value = "";
  updatePreview();
  $("editor").showModal();
}

function renderReaderList(pageId = null) {
  const selected = new Set((state.data.page_readers[String(pageId)] || []).map(String));
  $("readerList").innerHTML = state.data.members
    .filter((member) => member.role === "player")
    .map((member) => `<label class="check"><input type="checkbox" value="${member.id}" ${selected.has(String(member.id)) ? "checked" : ""}> ${escapeHtml(member.display_name)}</label>`)
    .join("");
}

function bodyFromTemplate(template) {
  return template.fields.map((field) => `## ${field}\n`).join("\n");
}

function applyTemplate(key) {
  const template = templates[key];
  $("categoryInput").value = template.category;
  $("visibilityInput").value = template.visibility;
  if (!$("titleInput").value || $("titleInput").value === "Neuer Artikel") $("titleInput").value = template.title;
  $("bodyInput").value = bodyFromTemplate(template);
  updatePreview();
}

async function saveEditor(event) {
  event.preventDefault();
  const type = $("editorType").value;
  const id = $("editorId").value;
  const payload = {
    campaign_id: state.campaignId,
    title: $("titleInput").value,
    summary: $("summaryInput").value,
    body: $("bodyInput").value,
  };
  let savedId = id;
  if (type === "page") {
    payload.category = $("categoryInput").value;
    payload.template_key = $("templateInput").value;
    payload.visibility = $("visibilityInput").value;
    payload.reader_ids = [...$("readerList").querySelectorAll("input:checked")].map((input) => Number(input.value));
    const result = id ? await api(`/api/pages/${id}`, { method: "PUT", body: JSON.stringify(payload) }) : await api("/api/pages", { method: "POST", body: JSON.stringify(payload) });
    savedId = id || result.id;
  } else {
    const result = id ? await api(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) }) : await api("/api/notes", { method: "POST", body: JSON.stringify(payload) });
    savedId = id || result.id;
  }
  await uploadAttachment(type, savedId);
  $("editor").close();
  await loadCampaign();
}

async function uploadAttachment(type, id) {
  const file = $("attachmentInput").files[0];
  if (!file || !id) return;
  const dataBase64 = await fileToBase64(file);
  await api("/api/attachments", {
    method: "POST",
    body: JSON.stringify({
      campaign_id: state.campaignId,
      page_id: type === "page" ? Number(id) : null,
      note_id: type === "note" ? Number(id) : null,
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      data_base64: dataBase64,
    }),
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function createCampaign(event) {
  event.preventDefault();
  const result = await api("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ name: $("newCampaignName").value, system: $("newCampaignSystem").value, description: $("newCampaignDescription").value }),
  });
  $("campaignDialog").close();
  state.campaignId = result.id;
  await bootstrap();
}

async function addMember(event) {
  event.preventDefault();
  await api("/api/members", {
    method: "POST",
    body: JSON.stringify({ campaign_id: state.campaignId, email: $("memberEmailInput").value, role: $("memberRoleInput").value }),
  });
  $("memberDialog").close();
  await loadCampaign();
}

async function login(event) {
  event.preventDefault();
  const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: $("loginEmail").value, password: $("loginPassword").value }) });
  state.user = result.user;
  await bootstrap();
}

async function setup(event) {
  event.preventDefault();
  const createSampleCampaign = document.querySelector('input[name="sampleCampaign"]:checked')?.value !== "no";
  const result = await api("/api/setup", {
    method: "POST",
    body: JSON.stringify({
      display_name: $("setupName").value,
      email: $("setupEmail").value,
      password: $("setupPassword").value,
      create_sample_campaign: createSampleCampaign,
    }),
  });
  state.user = result.user;
  await bootstrap();
}

async function logout() {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  location.reload();
}

async function loadInviteBanner() {
  if (!state.inviteToken) return;
  const data = await api(`/api/invite?token=${encodeURIComponent(state.inviteToken)}`);
  $("inviteText").textContent = `Einladung zu ${data.invite.campaign_name} als ${data.invite.role}`;
  $("inviteBanner").classList.remove("hidden");
}

async function acceptInvite() {
  await api("/api/invites/accept", { method: "POST", body: JSON.stringify({ token: state.inviteToken }) });
  state.inviteToken = null;
  history.replaceState({}, "", "/");
  $("inviteBanner").classList.add("hidden");
  await bootstrap();
}

function renderSettings() {
  document.querySelector('[data-tab="settings"]').style.display = canManage() ? "inline-flex" : "none";
  if (!canManage()) return;
  $("inviteList").innerHTML = state.data.invites.map((invite) => `<div class="member"><span>${escapeHtml(invite.invited_email || "Offener Link")}</span><span>${invite.accepted_at ? "angenommen" : invite.role}</span></div>`).join("");
  $("userList").innerHTML = state.data.users.map((user) => `<div class="member"><span>${escapeHtml(user.display_name)}</span><span>${escapeHtml(user.global_role)}</span></div>`).join("");
}

async function createInvite(event) {
  event.preventDefault();
  const result = await api("/api/invites", {
    method: "POST",
    body: JSON.stringify({ campaign_id: state.campaignId, email: $("inviteEmail").value, role: $("inviteRole").value }),
  });
  $("inviteUrl").value = result.invite_url;
  await loadCampaign();
}

async function createUser(event) {
  event.preventDefault();
  await api("/api/users", {
    method: "POST",
    body: JSON.stringify({ display_name: $("newUserName").value, email: $("newUserEmail").value, password: $("newUserPassword").value, global_role: $("newUserRole").value }),
  });
  await loadCampaign();
}

async function exportCampaign() {
  const data = await api(`/api/campaigns/${state.campaignId}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.data.campaign.name.replaceAll(" ", "-").toLowerCase()}-export.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importCampaign() {
  const file = $("importFile").files[0];
  if (!file) return;
  const text = await file.text();
  const result = await api("/api/campaigns/import", { method: "POST", body: JSON.stringify({ data: JSON.parse(text) }) });
  state.campaignId = result.id;
  await bootstrap();
}

let searchTimer = null;
async function runSearch() {
  const query = $("searchInput").value.trim();
  if (!query) {
    $("searchResults").innerHTML = `<div class="empty">Suchbegriff eingeben.</div>`;
    return;
  }
  const data = await api(`/api/search?campaign_id=${state.campaignId}&q=${encodeURIComponent(query)}`);
  $("searchResults").innerHTML = data.results.length ? data.results.map((result) => `
    <article class="card">
      <div class="meta"><span class="pill">${result.type === "page" ? "Wiki" : "Notiz"}</span><span>${escapeHtml(result.category)}</span></div>
      <h3>${escapeHtml(result.title)}</h3>
      <p>${escapeHtml(result.excerpt)}</p>
    </article>
  `).join("") : `<div class="empty">Keine Treffer mit deinen Berechtigungen.</div>`;
  activateTab("search");
}

function markdownToHtml(markdown) {
  const lines = escapeHtml(markdown).split("\n");
  let html = "";
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("### ")) html += closeList() + `<h4>${inlineMarkdown(line.slice(4))}</h4>`;
    else if (line.startsWith("## ")) html += closeList() + `<h3>${inlineMarkdown(line.slice(3))}</h3>`;
    else if (line.startsWith("# ")) html += closeList() + `<h2>${inlineMarkdown(line.slice(2))}</h2>`;
    else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineMarkdown(line.slice(2))}</li>`;
    } else if (!line.trim()) html += closeList();
    else html += closeList() + `<p>${inlineMarkdown(line)}</p>`;
  }
  return html + closeList();

  function closeList() {
    if (!inList) return "";
    inList = false;
    return "</ul>";
  }
}

function inlineMarkdown(text) {
  return text
    .replaceAll(/`([^`]+)`/g, "<code>$1</code>")
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll(/\*([^*]+)\*/g, "<em>$1</em>")
    .replaceAll(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function updatePreview() {
  $("markdownPreview").innerHTML = markdownToHtml($("bodyInput").value);
}

function visibilityLabel(value) {
  return { players: "Alle Mitglieder", dm: "Nur DMs", restricted: "Beschränkt", private: "Privat" }[value] || value;
}

function getSectionScope(sectionKey) {
  return sections[sectionKey]?.scope;
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

$("loginForm").addEventListener("submit", login);
$("setupForm").addEventListener("submit", setup);
$("logoutButton").addEventListener("click", logout);
$("campaignSelect").addEventListener("change", async (event) => { state.campaignId = Number(event.target.value); await loadCampaign(); });
$("newPageButton").addEventListener("click", openTemplatePicker);
$("newNoteButton").addEventListener("click", () => openNoteEditor());
$("saveButton").addEventListener("click", saveEditor);
$("newCampaignButton").addEventListener("click", () => $("campaignDialog").showModal());
$("createCampaignButton").addEventListener("click", createCampaign);
$("addMemberButton").addEventListener("click", () => $("memberDialog").showModal());
$("saveMemberButton").addEventListener("click", addMember);
$("templateInput").addEventListener("change", (event) => applyTemplate(event.target.value));
$("bodyInput").addEventListener("input", updatePreview);
$("visibilityInput").addEventListener("change", () => { $("readerField").style.display = $("visibilityInput").value === "restricted" ? "block" : "none"; });
$("templateGrid").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  $("templateDialog").close();
  openPageEditor(null, button.value);
});
$("acceptInviteButton").addEventListener("click", acceptInvite);
$("inviteForm").addEventListener("submit", createInvite);
$("userForm").addEventListener("submit", createUser);
$("exportButton").addEventListener("click", exportCampaign);
$("importButton").addEventListener("click", importCampaign);
$("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 250);
});

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  $(`${tabName}View`).classList.add("active");
}

init().catch((error) => {
  document.body.innerHTML = `<main class="empty">${escapeHtml(error.message)}</main>`;
});
