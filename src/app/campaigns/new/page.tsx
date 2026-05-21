import { createCampaignAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";

export default async function NewCampaignPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  return (
    <section className="two-column">
      <div className="page-title">
        <div>
          <h1>Neue Kampagne</h1>
          <p>Du wirst automatisch als campaign_admin eingetragen.</p>
        </div>
      </div>
      <section className="panel">
        {params.error ? <p className="error">Bitte gib einen Kampagnennamen an.</p> : null}
        <form className="form" action={createCampaignAction}>
          <input type="hidden" name="visibility" value="private" />
          <label className="field">
            <span>Name</span>
            <input className="input" name="name" required />
          </label>
          <label className="field">
            <span>Beschreibung</span>
            <textarea className="textarea" name="description" />
          </label>
          <button className="button" type="submit">
            Kampagne erstellen
          </button>
        </form>
      </section>
    </section>
  );
}
