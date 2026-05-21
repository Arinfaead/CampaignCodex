import Link from "next/link";
import { Plus } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/campaigns";

export default async function DashboardPage() {
  const user = await requireUser();
  const memberships = await listCampaignsForUser(user.id);

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <h1>Dashboard</h1>
          <p>Willkommen, {user.displayName}. Hier findest du deine Kampagnen und naechsten Arbeitsbereiche.</p>
        </div>
        <Link className="button" href="/campaigns/new">
          <Plus size={18} aria-hidden />
          Kampagne erstellen
        </Link>
      </div>

      <section className="panel stack">
        <div className="section-heading">
          <div>
            <h2>Deine Kampagnen</h2>
            <p className="muted">Angezeigt werden nur Kampagnen, fuer die eine serverseitig gepruefte Mitgliedschaft besteht.</p>
          </div>
          <Link className="button secondary small" href="/campaigns">
            Alle anzeigen
          </Link>
        </div>

        {memberships.length === 0 ? (
          <p className="muted">Noch keine Kampagne vorhanden.</p>
        ) : (
          <div className="grid">
            {memberships.map(({ campaign, role }) => (
              <Link className="card stack" href={`/campaigns/${campaign.slug}`} key={campaign.id}>
                <span className="badge">{role}</span>
                <div>
                  <h3>{campaign.name}</h3>
                  <p className="muted">{campaign.description || "Keine Beschreibung hinterlegt."}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
