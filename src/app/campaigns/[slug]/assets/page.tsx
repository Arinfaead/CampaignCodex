import { eq } from "drizzle-orm";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { notFound } from "next/navigation";

import { uploadAssetAction } from "@/app/actions";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { VisibilitySelect } from "@/components/VisibilitySelect";
import { requireUser } from "@/lib/auth";
import { getCampaignForUser } from "@/lib/campaign-access";
import { canReadVisibility, canWriteContent } from "@/lib/permissions";

export default async function AssetsPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const context = await getCampaignForUser(slug, user.id);

  if (!context) {
    notFound();
  }

  const allAssets = await db.select().from(assets).where(eq(assets.campaignId, context.campaign.id));
  const readableAssets = allAssets.filter((asset) =>
    canReadVisibility(context.membership.role, asset.visibility, asset.uploadedById === user.id)
  );

  return (
    <section className="stack">
      <div className="page-title">
        <div>
          <Link className="muted" href={`/campaigns/${slug}`}>
            {context.campaign.name}
          </Link>
          <h1>Assets</h1>
          <p>Karten, Handouts und Bilder liegen in MinIO statt im lokalen App-Dateisystem.</p>
        </div>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <h2>Dateien</h2>
          {readableAssets.length === 0 ? (
            <p className="muted">Noch keine sichtbaren Assets.</p>
          ) : (
            readableAssets.map((asset) => (
              <div className="asset-row" key={asset.id}>
                <div>
                  <strong>{asset.fileName}</strong>
                  <p className="muted">{asset.contentType} · {Math.ceil(asset.size / 1024)} KB · {asset.visibility}</p>
                </div>
                <Link className="icon-button" href={`/api/assets/${asset.id}`} title="Herunterladen" aria-label="Herunterladen">
                  <Download size={18} aria-hidden />
                </Link>
              </div>
            ))
          )}
        </section>

        {canWriteContent(context.membership.role) ? (
          <section className="panel stack">
            <h2>Upload</h2>
            <form className="form" action={uploadAssetAction}>
              <input type="hidden" name="campaignId" value={context.campaign.id} />
              <input type="hidden" name="campaignSlug" value={slug} />
              <label className="field">
                <span>Datei</span>
                <input className="input" name="file" type="file" required />
              </label>
              <VisibilitySelect />
              <button className="button" type="submit">
                <Upload size={18} aria-hidden />
                Hochladen
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </section>
  );
}
