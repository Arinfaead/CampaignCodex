import { eq } from "drizzle-orm";
import Link from "next/link";

import { createInviteAction } from "@/app/actions";
import { db } from "@/db";
import { campaignInvites, campaignMembers, users } from "@/db/schema";
import { requireCampaignAdmin } from "@/lib/campaign-access";
import { env } from "@/lib/env";

export default async function CampaignSettingsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const context = await requireCampaignAdmin(slug);

  const members = await db
    .select({
      role: campaignMembers.role,
      user: users
    })
    .from(campaignMembers)
    .innerJoin(users, eq(campaignMembers.userId, users.id))
    .where(eq(campaignMembers.campaignId, context.campaign.id));

  const invites = await db
    .select()
    .from(campaignInvites)
    .where(eq(campaignInvites.campaignId, context.campaign.id));

  const inviteUrl = query.invite ? `${env.PUBLIC_URL}/invites/${query.invite}` : null;

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <Link className="muted" href={`/campaigns/${slug}`}>
            {context.campaign.name}
          </Link>
          <h1>Einstellungen</h1>
          <p>Mitglieder und Einladungen verwalten.</p>
        </div>
      </div>

      {inviteUrl ? (
        <section className="panel stack">
          <h2>Einladungslink</h2>
          <p className="muted">{inviteUrl}</p>
        </section>
      ) : null}

      <div className="two-column">
        <section className="panel stack">
          <h2>Mitglieder</h2>
          {members.map((member) => (
            <div className="list-row" key={member.user.id}>
              <span>{member.user.displayName}</span>
              <span className="badge">{member.role}</span>
            </div>
          ))}
        </section>

        <section className="panel stack">
          <h2>Einladung erstellen</h2>
          <form className="form" action={createInviteAction}>
            <input type="hidden" name="campaignId" value={context.campaign.id} />
            <input type="hidden" name="campaignSlug" value={slug} />
            <label className="field">
              <span>E-Mail</span>
              <input className="input" name="email" type="email" required />
            </label>
            <label className="field">
              <span>Rolle</span>
              <select className="select" name="role" defaultValue="member">
                <option value="campaign_admin">Campaign Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <button className="button" type="submit">
              Einladungslink erzeugen
            </button>
          </form>
          <div>
            <h3>Offene Einladungen</h3>
            {invites.length === 0 ? (
              <p className="muted">Keine Einladungen.</p>
            ) : (
              invites.map((invite) => (
                <div className="list-row" key={invite.id}>
                  <span>{invite.email}</span>
                  <span className="badge warning">{invite.status}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
