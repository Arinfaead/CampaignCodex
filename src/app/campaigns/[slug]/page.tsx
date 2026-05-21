import { eq } from "drizzle-orm";
import Link from "next/link";
import { FilePlus, Image as ImageIcon, Settings } from "lucide-react";

import { createPageAction } from "@/app/actions";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { VisibilitySelect } from "@/components/VisibilitySelect";
import { requireCampaignAccess } from "@/lib/campaign-access";
import { canManageCampaign, canReadVisibility, canWriteContent } from "@/lib/permissions";

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await requireCampaignAccess(slug);
  const { user } = context;

  const pages = await db.select().from(wikiPages).where(eq(wikiPages.campaignId, context.campaign.id));
  const readablePages = pages.filter((page) =>
    canReadVisibility(context.membership.role, page.visibility, page.authorId === user.id)
  );

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <span className="badge">{context.membership.role}</span>
          <h1>{context.campaign.name}</h1>
          <p>{context.campaign.description || "Kampagnenwiki ohne Beschreibung."}</p>
          <p className="muted">Sichtbarkeit: {context.campaign.visibility}</p>
        </div>
        <div className="inline-actions">
          <Link className="icon-button" href={`/campaigns/${slug}/assets`} title="Assets" aria-label="Assets">
            <ImageIcon size={18} aria-hidden />
          </Link>
          {canManageCampaign(context.membership.role) ? (
            <Link className="icon-button" href={`/campaigns/${slug}/settings`} title="Einstellungen" aria-label="Einstellungen">
              <Settings size={18} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <h2>Wiki-Seiten</h2>
          {readablePages.length === 0 ? (
            <p className="muted">Noch keine sichtbaren Seiten.</p>
          ) : (
            <div>
              {readablePages.map((page) => (
                <Link className="list-row" href={`/campaigns/${slug}/pages/${page.slug}`} key={page.id}>
                  <span>{page.title}</span>
                  <span className="badge warning">{page.visibility}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {canWriteContent(context.membership.role) ? (
          <section className="panel stack">
            <h2>Seite anlegen</h2>
            <form className="form" action={createPageAction}>
              <input type="hidden" name="campaignId" value={context.campaign.id} />
              <input type="hidden" name="campaignSlug" value={slug} />
              <label className="field">
                <span>Titel</span>
                <input className="input" name="title" required />
              </label>
              <VisibilitySelect />
              <label className="field">
                <span>Markdown</span>
                <textarea className="textarea" name="content" defaultValue={"# Neue Seite\n\n"} />
              </label>
              <button className="button" type="submit">
                <FilePlus size={18} aria-hidden />
                Seite speichern
              </button>
            </form>
          </section>
        ) : null}

        {canManageCampaign(context.membership.role) ? (
          <section className="panel stack">
            <h2>Adminbereich</h2>
            <p className="muted">Grundlegende Kampagnenverwaltung ist vorbereitet. Erweiterte Inhalte folgen spaeter.</p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
