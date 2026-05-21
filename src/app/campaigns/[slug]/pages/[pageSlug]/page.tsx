import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePageAction } from "@/app/actions";
import { VisibilitySelect } from "@/components/VisibilitySelect";
import { requireUser } from "@/lib/auth";
import { getCampaignForUser, getReadablePage } from "@/lib/campaign-access";
import { renderMarkdown } from "@/lib/markdown";
import { canWriteContent } from "@/lib/permissions";

export default async function WikiPage({
  params
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const user = await requireUser();
  const { slug, pageSlug } = await params;
  const context = await getCampaignForUser(slug, user.id);

  if (!context) {
    notFound();
  }

  const page = await getReadablePage(context.campaign.id, pageSlug, user.id, context.membership.role);

  if (!page) {
    notFound();
  }

  const canEdit = canWriteContent(context.membership.role);

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <Link className="muted" href={`/campaigns/${slug}`}>
            {context.campaign.name}
          </Link>
          <h1>{page.title}</h1>
          <p>Sichtbarkeit: {page.visibility}</p>
        </div>
      </div>

      <div className="two-column">
        <article className="panel markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />

        {canEdit ? (
          <section className="panel stack">
            <h2>Bearbeiten</h2>
            <form className="form" action={updatePageAction}>
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="campaignId" value={context.campaign.id} />
              <input type="hidden" name="campaignSlug" value={slug} />
              <input type="hidden" name="pageSlug" value={page.slug} />
              <label className="field">
                <span>Titel</span>
                <input className="input" name="title" defaultValue={page.title} required />
              </label>
              <VisibilitySelect defaultValue={page.visibility} />
              <label className="field">
                <span>Markdown</span>
                <textarea className="textarea" name="content" defaultValue={page.content} />
              </label>
              <button className="button" type="submit">
                Aenderungen speichern
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </section>
  );
}
