import Link from "next/link";
import { Plus } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/campaigns";

export default async function CampaignListPage() {
  const user = await requireUser();
  const memberships = await listCampaignsForUser(user.id);

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <h1>Eigene Kampagnen</h1>
          <p>Private Kampagnen erscheinen hier nur mit aktiver Mitgliedschaft.</p>
        </div>
        <Link className="button" href="/campaigns/new">
          <Plus size={18} aria-hidden />
          Neue Kampagne
        </Link>
      </div>

      {memberships.length === 0 ? (
        <section className="panel stack">
          <h2>Noch keine Kampagne</h2>
          <p className="muted">Erstelle deine erste Kampagne, um Inhalte und Mitglieder vorzubereiten.</p>
          <Link className="button" href="/campaigns/new">
            Kampagne erstellen
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
