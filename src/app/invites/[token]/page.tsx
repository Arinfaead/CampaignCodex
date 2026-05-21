import { and, eq, gt } from "drizzle-orm";
import { notFound } from "next/navigation";

import { acceptInviteAction } from "@/app/actions";
import { db } from "@/db";
import { campaignInvites, campaigns } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashToken } from "@/lib/security";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await requireUser();
  const { token } = await params;
  const [invite] = await db
    .select({
      invite: campaignInvites,
      campaign: campaigns
    })
    .from(campaignInvites)
    .innerJoin(campaigns, eq(campaignInvites.campaignId, campaigns.id))
    .where(and(eq(campaignInvites.tokenHash, hashToken(token)), eq(campaignInvites.status, "pending"), gt(campaignInvites.expiresAt, new Date())))
    .limit(1);

  if (!invite) {
    notFound();
  }

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="badge">{invite.invite.role}</span>
        <h1>{invite.campaign.name}</h1>
        <p>Du wurdest zu dieser Kampagne eingeladen.</p>
      </div>
      <section className="panel stack">
        <h2>Einladung annehmen</h2>
        <p className="muted">Nach dem Annehmen erscheint die Kampagne in deiner Uebersicht.</p>
        <form action={acceptInviteAction}>
          <input type="hidden" name="token" value={token} />
          <button className="button" type="submit">
            Einladung annehmen
          </button>
        </form>
      </section>
    </section>
  );
}
