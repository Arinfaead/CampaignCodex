import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, LogOut, Shield } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CampaignCodex",
  description: "Self-hosted campaign wiki for pen-and-paper groups."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="de">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <BookOpen size={20} aria-hidden />
            </span>
            <span>CampaignCodex</span>
          </Link>
          <nav className="topnav" aria-label="Hauptnavigation">
            {user ? (
              <>
                <span className="user-pill">
                  <Shield size={15} aria-hidden />
                  {user.displayName}
                </span>
                <form action={signOutAction}>
                  <button className="icon-button" type="submit" title="Abmelden" aria-label="Abmelden">
                    <LogOut size={18} aria-hidden />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/sign-in">Anmelden</Link>
                <Link className="button small" href="/auth/sign-up">
                  Registrieren
                </Link>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
