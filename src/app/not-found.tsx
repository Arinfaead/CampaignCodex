import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel stack">
      <h1>Nicht gefunden</h1>
      <p className="muted">Die Seite existiert nicht oder du hast keine Berechtigung darauf.</p>
      <Link className="button" href="/">
        Zur Uebersicht
      </Link>
    </section>
  );
}
