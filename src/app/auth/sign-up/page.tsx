import { SignUpForm } from "@/components/AuthForm";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="hero">
      <div className="hero-copy">
        <h1>Starte deine Codex-Instanz.</h1>
        <p>
          Der erste registrierte Account wird Admin. Danach steuerst du offene Registrierung ueber die Umgebungskonfiguration.
        </p>
      </div>
      <SignUpForm error={params.error} />
    </div>
  );
}
