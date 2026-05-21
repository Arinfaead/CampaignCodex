import { SignInForm } from "@/components/AuthForm";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="hero">
      <div className="hero-copy">
        <h1>Kampagnenwissen, sauber getrennt.</h1>
        <p>
          Melde dich an, um Wiki-Seiten, Assets und Einladungen fuer deine Spielrunden zu verwalten.
        </p>
      </div>
      <SignInForm error={params.error} />
    </div>
  );
}
