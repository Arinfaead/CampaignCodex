import { createCampaignAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";

export default async function NewCampaignPage() {
  await requireUser();

  return (
    <section className="two-column">
      <div className="page-title">
        <div>
          <h1>Neue Kampagne</h1>
          <p>Owner-Rolle, Wiki und Einstellungen werden direkt angelegt.</p>
        </div>
      </div>
      <section className="panel">
        <form className="form" action={createCampaignAction}>
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
