import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/campaigns";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="hero">
        <div className="hero-copy">
          <span className="badge">AGPL-3.0 self-hosted</span>
          <h1>CampaignCodex</h1>
          <p>
            Eine lokal betreibbare Kampagnen-Wiki-App fuer Pen-and-Paper-Gruppen mit Markdown, Rollen,
            PostgreSQL und MinIO.
          </p>
          <div className="inline-actions">
            <Link className="button" href="/auth/sign-up">
              Instanz starten
            </Link>
            <Link className="button secondary" href="/auth/sign-in">
              Anmelden
            </Link>
          </div>
        </div>
        <aside className="hero-panel" aria-label="Architekturueberblick">
          <dl>
            <div>
              <dt>Stack</dt>
              <dd>Next.js</dd>
            </div>
            <div>
              <dt>Daten</dt>
              <dd>PostgreSQL</dd>
            </div>
            <div>
              <dt>ORM</dt>
              <dd>Drizzle</dd>
            </div>
            <div>
              <dt>Assets</dt>
              <dd>MinIO</dd>
            </div>
          </dl>
        </aside>
      </section>
    );
  }

  const memberships = await listCampaignsForUser(user.id);

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <h1>Deine Kampagnen</h1>
          <p>Wikis, Rollen und Assets fuer deine Runden.</p>
        </div>
        <div className="inline-actions">
          <Link className="button secondary" href="/dashboard">
            <LayoutDashboard size={18} aria-hidden />
            Dashboard
          </Link>
          <Link className="button" href="/campaigns/new">
            <Plus size={18} aria-hidden />
            Kampagne
          </Link>
        </div>
      </div>

      {memberships.length === 0 ? (
        <section className="panel stack">
          <h2>Noch keine Kampagne</h2>
          <p className="muted">Lege eine neue Kampagne an oder nutze einen Einladungslink.</p>
          <Link className="button" href="/campaigns/new">
            Erste Kampagne erstellen
          </Link>
        </section>
      ) : (
        <div className="grid">
          {memberships.map(({ campaign, role }) => (
            <Link className="card stack" href={`/campaigns/${campaign.slug}`} key={campaign.id}>
              <span className="badge">{role}</span>
              <div>
                <h2>{campaign.name}</h2>
                <p className="muted">{campaign.description || "Keine Beschreibung hinterlegt."}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
