const state = {
  user: null,
  campaigns: [],
  campaignId: null,
  data: null,
  adminSettings: null,
  adminSettingsTab: "users",
  adminAuthTab: "local",
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
  $("adminSettingsNav").classList.toggle("hidden", state.user.global_role !== "admin");
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
    $("adminSettingsNav").classList.toggle("hidden", state.user?.global_role !== "admin");
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
  $("adminSettingsNav").classList.toggle("hidden", state.user.global_role !== "admin");
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
  const tags = (page.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `
    <article id="page-${page.id}" class="card">
      <div class="meta">
        <span class="pill">${escapeHtml(sections[page.category]?.label || "Wiki")}</span>
        <span>${escapeHtml(template.label)}</span>
        <span>${visibilityLabel(page.visibility)}</span>
        ${page.status ? `<span>${escapeHtml(page.status)}</span>` : ""}
      </div>
      <h3>${escapeHtml(page.title)}</h3>
      ${tags ? `<div class="tags">${tags}</div>` : ""}
      ${page.summary ? `<p class="summary">${escapeHtml(page.summary)}</p>` : ""}
      <div class="markdown-body">${markdownToHtml(page.body)}</div>
      ${canManage() && page.body_private ? `<details class="dm-notes"><summary>DM-Notizen</summary><div class="markdown-body">${markdownToHtml(page.body_private)}</div></details>` : ""}
      ${renderRelations(page)}
      ${renderBacklinks(page)}
      ${renderAttachments(attachments)}
      ${page.owner_id === state.user.id || canManage() ? `<button onclick="openPageEditor(${page.id})">Bearbeiten</button>` : ""}
    </article>
  `;
}

function renderRelations(page) {
  if (!page.relations?.length) return "";
  return `
    <section class="link-panel">
      <h4>Verknüpft mit</h4>
      ${page.relations.map((relation) => {
        const label = relationLabel(relation.relation_type);
        const target = relation.target_page_id ? `<button class="text-link" onclick="openWikiLink(${relation.target_page_id})">${escapeHtml(relation.target_title)}</button>` : `<span>${escapeHtml(relation.target_title)}</span>`;
        return `<div><strong>${escapeHtml(label)}</strong> ${target}${relation.description ? `<small>${escapeHtml(relation.description)}</small>` : ""}</div>`;
      }).join("")}
    </section>
  `;
}

function renderBacklinks(page) {
  if (!page.backlinks?.length) return "";
  return `
    <section class="link-panel">
      <h4>Erwähnt in</h4>
      ${page.backlinks.map((backlink) => `<button class="text-link" onclick="openWikiLink(${backlink.source_page_id})">${escapeHtml(backlink.source_title)}${backlink.source_field === "body_private" ? " · DM" : ""}</button>`).join("")}
    </section>
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
  $("tagsInput").value = (page?.tags || []).join(", ");
  $("statusInput").value = page?.status || "";
  $("slugInput").value = page?.slug || "";
  $("templateInput").value = page?.template_key || templateKey;
  $("categoryInput").value = page?.category || template.category;
  $("visibilityInput").value = page?.visibility || template.visibility;
  $("bodyInput").value = page?.body || bodyFromTemplate(template);
  $("privateBodyInput").value = page?.body_private || "";
  $("relationsInput").value = relationsToText(page?.relations || []);
  $("pageOptions").style.display = "grid";
  $("entityMetaFields").style.display = "grid";
  $("entityGraphFields").style.display = canManage() ? "grid" : "none";
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
  $("tagsInput").value = "";
  $("statusInput").value = "";
  $("slugInput").value = "";
  $("privateBodyInput").value = "";
  $("relationsInput").value = "";
  $("bodyInput").value = note?.body || "# Zusammenfassung\n\n## Wichtige Ereignisse\n- \n\n## Offene Fragen\n- \n\n## Loot und Hinweise\n- ";
  $("pageOptions").style.display = "none";
  $("entityMetaFields").style.display = "none";
  $("entityGraphFields").style.display = "none";
  $("summaryLabel").style.display = "none";
  $("readerField").style.display = "none";
  $("attachmentInput").value = "";
  updatePreview();
  $("editor").showModal();
}

function renderReaderList(pageId = null) {
  const selected = new Set(((state.data.page_readers || {})[String(pageId)] || []).map(String));
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

function parseRelationsInput(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [relationType = "related", targetTitle = "", description = "", visibility = "players"] = line.split("|").map((part) => part.trim());
      return {
        relation_type: relationType || "related",
        target_title: targetTitle,
        description,
        visibility: visibility || "players",
      };
    })
    .filter((relation) => relation.target_title);
}

function relationsToText(relations) {
  return relations
    .map((relation) => `${relation.relation_type || "related"} | ${relation.target_title || ""}${relation.description ? ` | ${relation.description}` : ""}${relation.visibility && relation.visibility !== "players" ? ` | ${relation.visibility}` : ""}`)
    .join("\n");
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
    payload.slug = $("slugInput").value;
    payload.status = $("statusInput").value;
    payload.tags = $("tagsInput").value.split(",").map((tag) => tag.trim()).filter(Boolean);
    payload.body_private = $("privateBodyInput").value;
    payload.relations = parseRelationsInput($("relationsInput").value);
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

async function loadAdminSettings() {
  if (state.user?.global_role !== "admin") return;
  state.adminSettings = await api("/api/admin/settings");
  renderAdminSettings();
}

function renderAdminSettings() {
  const payload = state.adminSettings;
  if (!payload) return;
  const settings = payload.settings;
  const runtime = payload.runtime;
  $("installedVersionInput").value = runtime.version;
  $("updateWindowInput").value = settings.general.update_window || "";
  $("includeBetaInput").checked = Boolean(settings.general.include_beta_releases);
  $("updateCommandInput").value = settings.general.update_command || "";
  $("logPath").textContent = runtime.log_file;
  $("logOutput").textContent = runtime.log || "Keine Logs vorhanden.";
  renderAdminAuthPanels(settings.users);
  activateAdminSettingsTab(state.adminSettingsTab);
}

function renderAdminAuthPanels(users) {
  const panels = {
    local: `
      <div class="admin-auth-panel active" data-admin-panel="local">
        <div class="form-grid">
          ${toggleField("localEnabled", "Lokale Anmeldung aktivieren", users.local.enabled)}
          ${toggleField("localAdminCreated", "Nur durch Admins angelegte Benutzer", users.local.allow_admin_created_users)}
          ${numberField("localMinPassword", "Minimale Passwortlänge", users.local.minimum_password_length)}
          ${numberField("localSessionDays", "Session-Laufzeit in Tagen", users.local.session_days)}
          ${toggleField("localPasswordReset", "Passwort-Reset vorbereiten", users.local.password_reset_enabled)}
        </div>
      </div>`,
    email: `
      <div class="admin-auth-panel" data-admin-panel="email">
        <div class="form-grid">
          ${toggleField("emailEnabled", "E-Mail-Authentifizierung aktivieren", users.email.enabled)}
          ${textField("smtpHost", "SMTP Host", users.email.smtp_host)}
          ${numberField("smtpPort", "SMTP Port", users.email.smtp_port)}
          ${textField("smtpUsername", "SMTP Benutzername", users.email.smtp_username)}
          ${textField("smtpFrom", "Absenderadresse", users.email.from_address)}
          ${toggleField("emailConfirmation", "E-Mail-Bestätigung verlangen", users.email.require_email_confirmation)}
          ${toggleField("magicLinkLogin", "Magic-Link-Login erlauben", users.email.magic_link_login)}
        </div>
      </div>`,
    ldap: `
      <div class="admin-auth-panel" data-admin-panel="ldap">
        <div class="form-grid">
          ${toggleField("ldapEnabled", "LDAP aktivieren", users.ldap.enabled)}
          ${textField("ldapServer", "LDAP Server URL", users.ldap.server_url)}
          ${textField("ldapBindDn", "Bind DN", users.ldap.bind_dn)}
          ${textField("ldapBaseDn", "Base DN", users.ldap.base_dn)}
          ${textField("ldapUserFilter", "User Filter", users.ldap.user_filter)}
          ${textField("ldapGroupFilter", "Group Filter", users.ldap.group_filter)}
          ${textField("ldapAdminGroup", "Admin-Gruppe", users.ldap.admin_group)}
          ${textField("ldapDmGroup", "DM-Gruppe", users.ldap.dm_group)}
          ${toggleField("ldapStartTls", "StartTLS verwenden", users.ldap.start_tls)}
        </div>
      </div>`,
    twoFactor: `
      <div class="admin-auth-panel" data-admin-panel="twoFactor">
        <div class="form-grid">
          ${toggleField("twoFactorEnabled", "Zwei Faktor-Authentifizierung aktivieren", users.two_factor.enabled)}
          ${toggleField("twoFactorAdmins", "Für Admins erzwingen", users.two_factor.required_for_admins)}
          ${toggleField("twoFactorDms", "Für DMs erzwingen", users.two_factor.required_for_dms)}
          ${textField("twoFactorIssuer", "TOTP Issuer Name", users.two_factor.issuer_name)}
          ${numberField("twoFactorRememberDays", "Gerät merken in Tagen", users.two_factor.remember_device_days)}
        </div>
      </div>`,
    oidc: `
      <div class="admin-auth-panel" data-admin-panel="oidc">
        <div class="form-grid">
          ${toggleField("oidcEnabled", "SSO/OIDC aktivieren", users.oidc.enabled)}
          ${textField("oidcIssuer", "Issuer URL", users.oidc.issuer)}
          ${textField("oidcClientId", "Client ID", users.oidc.client_id)}
          ${textField("oidcRedirectUri", "Redirect URI", users.oidc.redirect_uri)}
          ${textField("oidcScopes", "Scopes", users.oidc.scopes)}
          ${textField("oidcAdminGroup", "Admin-Gruppe", users.oidc.admin_group)}
          ${textField("oidcDmGroup", "DM-Gruppe", users.oidc.dm_group)}
        </div>
      </div>`,
  };
  $("adminAuthPanels").innerHTML = Object.values(panels).join("");
  activateAdminSubtab(state.adminAuthTab);
}

function textField(id, label, value = "") {
  return `<label>${label}<input id="${id}" value="${escapeHtml(value)}"></label>`;
}

function numberField(id, label, value = 0) {
  return `<label>${label}<input id="${id}" type="number" min="0" value="${escapeHtml(value)}"></label>`;
}

function toggleField(id, label, checked = false) {
  return `<label class="check"><input id="${id}" type="checkbox" ${checked ? "checked" : ""}> ${label}</label>`;
}

function collectAdminSettings() {
  return {
    users: {
      local: {
        enabled: $("localEnabled").checked,
        allow_admin_created_users: $("localAdminCreated").checked,
        minimum_password_length: Number($("localMinPassword").value || 8),
        session_days: Number($("localSessionDays").value || 14),
        password_reset_enabled: $("localPasswordReset").checked,
      },
      email: {
        enabled: $("emailEnabled").checked,
        smtp_host: $("smtpHost").value,
        smtp_port: Number($("smtpPort").value || 587),
        smtp_username: $("smtpUsername").value,
        from_address: $("smtpFrom").value,
        require_email_confirmation: $("emailConfirmation").checked,
        magic_link_login: $("magicLinkLogin").checked,
      },
      ldap: {
        enabled: $("ldapEnabled").checked,
        server_url: $("ldapServer").value,
        bind_dn: $("ldapBindDn").value,
        base_dn: $("ldapBaseDn").value,
        user_filter: $("ldapUserFilter").value,
        group_filter: $("ldapGroupFilter").value,
        admin_group: $("ldapAdminGroup").value,
        dm_group: $("ldapDmGroup").value,
        start_tls: $("ldapStartTls").checked,
      },
      two_factor: {
        enabled: $("twoFactorEnabled").checked,
        required_for_admins: $("twoFactorAdmins").checked,
        required_for_dms: $("twoFactorDms").checked,
        issuer_name: $("twoFactorIssuer").value,
        remember_device_days: Number($("twoFactorRememberDays").value || 30),
      },
      oidc: {
        enabled: $("oidcEnabled").checked,
        issuer: $("oidcIssuer").value,
        client_id: $("oidcClientId").value,
        redirect_uri: $("oidcRedirectUri").value,
        scopes: $("oidcScopes").value,
        admin_group: $("oidcAdminGroup").value,
        dm_group: $("oidcDmGroup").value,
      },
    },
    general: {
      update_window: $("updateWindowInput").value,
      include_beta_releases: $("includeBetaInput").checked,
      update_command: state.adminSettings?.settings?.general?.update_command || "",
    },
  };
}

async function saveAdminSettings() {
  state.adminSettings = await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ settings: collectAdminSettings() }) });
  state.adminSettings.runtime = (await api("/api/admin/settings")).runtime;
  renderAdminSettings();
  showUpdateStatus("Einstellungen gespeichert.");
}

async function refreshAdminLog() {
  await loadAdminSettings();
}

async function checkUpdate() {
  const result = await api("/api/admin/update-check", { method: "POST", body: JSON.stringify({ include_prereleases: $("includeBetaInput").checked }) });
  const message = result.update_available
    ? `Update verfügbar: ${result.current_version} -> ${result.latest_version}`
    : result.message || `Kein Update verfügbar. Aktuell: ${result.current_version}`;
  showUpdateStatus(message, !result.ok);
}

async function runUpdate() {
  const result = await api("/api/admin/update", { method: "POST", body: "{}" });
  showUpdateStatus(`${result.message}${result.exit_code !== undefined ? ` Exit ${result.exit_code}.` : ""}`, !result.ok);
  await loadAdminSettings();
}

function showUpdateStatus(message, isError = false) {
  $("updateStatus").textContent = message;
  $("updateStatus").classList.toggle("hidden", false);
  $("updateStatus").classList.toggle("error", isError);
}

function activateAdminSubtab(tabName) {
  state.adminAuthTab = tabName;
  document.querySelectorAll("[data-admin-tab]").forEach((button) => button.classList.toggle("active", button.dataset.adminTab === tabName));
  document.querySelectorAll(".admin-auth-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === tabName));
}

function activateAdminSettingsTab(tabName) {
  state.adminSettingsTab = tabName;
  document.querySelectorAll("[data-settings-tab]").forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tabName));
  document.querySelectorAll("[data-settings-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === tabName));
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
    .replaceAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, label) => wikiLinkToHtml(target, label || target))
    .replaceAll(/`([^`]+)`/g, "<code>$1</code>")
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll(/\*([^*]+)\*/g, "<em>$1</em>")
    .replaceAll(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function wikiLinkToHtml(target, label) {
  const page = findPageByTitleOrSlug(target);
  if (!page) return `<span class="missing-link">${label}</span>`;
  return `<button class="wiki-link" onclick="openWikiLink(${page.id})">${label}</button>`;
}

function findPageByTitleOrSlug(value) {
  const lookup = String(value || "").trim().toLowerCase();
  return state.data?.pages.find((page) => page.title.toLowerCase() === lookup || page.slug === lookup);
}

function openWikiLink(pageId) {
  const page = state.data?.pages.find((entry) => entry.id === pageId);
  if (!page) return;
  const scope = getSectionScope(page.category);
  state.activeSection = page.category;
  activateTab(scope === "dm" ? "dm" : "wiki");
  renderSectionNav();
  renderPages();
  requestAnimationFrame(() => document.getElementById(`page-${page.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function relationLabel(value) {
  return {
    related: "Bezug",
    lives_in: "lebt in",
    located_in: "liegt in",
    involves: "betrifft",
    owns: "besitzt",
    held_by: "getragen von",
    ally_of: "verbündet mit",
    enemy_of: "verfeindet mit",
    parent_of: "übergeordnet",
    child_of: "untergeordnet",
  }[value] || value.replaceAll("_", " ");
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
$("adminSettingsButton").addEventListener("click", async () => {
  activateTab("adminSettings");
  await loadAdminSettings();
});
$("saveAdminSettingsButton").addEventListener("click", saveAdminSettings);
$("refreshLogButton").addEventListener("click", refreshAdminLog);
$("checkUpdateButton").addEventListener("click", checkUpdate);
$("runUpdateButton").addEventListener("click", runUpdate);
$("adminAuthPanels").addEventListener("input", () => $("updateStatus").classList.add("hidden"));
$("adminSettingsView").addEventListener("click", (event) => {
  const settingsButton = event.target.closest("[data-settings-tab]");
  if (settingsButton) {
    activateAdminSettingsTab(settingsButton.dataset.settingsTab);
    return;
  }
  const button = event.target.closest("[data-admin-tab]");
  if (button) activateAdminSubtab(button.dataset.adminTab);
});
$("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 250);
});

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".section-link[data-tab]").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");
  $(`${tabName}View`)?.classList.add("active");
}

init().catch((error) => {
  document.body.innerHTML = `<main class="empty">${escapeHtml(error.message)}</main>`;
});
