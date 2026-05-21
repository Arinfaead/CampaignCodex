import Link from "next/link";

import { signInAction, signUpAction } from "@/app/actions";

export function SignInForm({ error }: { error?: string }) {
  return (
    <section className="panel stack">
      <div>
        <h1>Anmelden</h1>
        <p className="muted">Zurueck an den Spieltisch.</p>
      </div>
      {error ? <p className="error">Die Anmeldung ist fehlgeschlagen. Bitte pruefe E-Mail und Passwort.</p> : null}
      <form className="form" action={signInAction}>
        <label className="field">
          <span>E-Mail</span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Passwort</span>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button" type="submit">
          Anmelden
        </button>
      </form>
      <p className="muted">
        Noch kein Konto? <Link href="/auth/sign-up">Registrieren</Link>
      </p>
    </section>
  );
}

export function SignUpForm({ error }: { error?: string }) {
  return (
    <section className="panel stack">
      <div>
        <h1>Registrieren</h1>
        <p className="muted">Der erste Account wird Instanz-Admin.</p>
      </div>
      {error ? (
        <p className="error">
          {error === "email-exists"
            ? "Diese E-Mail-Adresse ist bereits registriert."
            : "Bitte pruefe E-Mail, Namen und ein Passwort mit mindestens 12 Zeichen."}
        </p>
      ) : null}
      <form className="form" action={signUpAction}>
        <label className="field">
          <span>Name</span>
          <input className="input" name="displayName" autoComplete="name" required />
        </label>
        <label className="field">
          <span>E-Mail</span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Passwort</span>
          <input className="input" name="password" type="password" minLength={12} autoComplete="new-password" required />
        </label>
        <button className="button" type="submit">
          Konto anlegen
        </button>
      </form>
      <p className="muted">
        Schon registriert? <Link href="/auth/sign-in">Anmelden</Link>
      </p>
    </section>
  );
}
