import Image from "next/image";
import TabBar from "./TabBar";
import TrustpilotWidget from "./TrustpilotWidget";

export default function HubShell() {
  return (
    <div className="min-h-screen bg-[#e8e4de] flex items-start justify-center">
      {/* Mobile-only container — max 430px, centered on desktop */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#E1251B] relative overflow-x-hidden shadow-2xl">
        {/* Hero header — bold, full-bleed */}
        <header className="relative bg-[#E1251B] px-6 pt-10 pb-4 text-center">

          {/* Logo */}
          <div className="relative mx-auto mb-4 w-[220px]">
            <Image
              src="/images/hub/logo-white.svg"
              alt="Dog Heroes"
              width={220}
              height={110}
              priority
              className="w-full h-auto"
            />
          </div>

          {/* Tagline — GT Pressura */}
          <p
            className="relative text-white text-[15px] leading-snug font-normal tracking-wide"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            L&apos;azienda italiana del cibo fresco
          </p>

          {/* Social icons row */}
          <div className="relative flex justify-center gap-5 mt-5">
            <SocialLink
              href="https://instagram.com/dogheroes.it"
              label="Instagram"
            >
              <InstagramIcon />
            </SocialLink>
            <SocialLink
              href="https://tiktok.com/@dogheroes.it"
              label="TikTok"
            >
              <TikTokIcon />
            </SocialLink>
            <SocialLink
              href="https://www.youtube.com/@dogheroes"
              label="YouTube"
            >
              <YouTubeIcon />
            </SocialLink>
            <SocialLink
              href="https://www.linkedin.com/company/dog-heroes/"
              label="LinkedIn"
            >
              <LinkedInIcon />
            </SocialLink>
            <SocialLink
              href="https://www.facebook.com/dogheroes.it"
              label="Facebook"
            >
              <FacebookIcon />
            </SocialLink>
          </div>

          {/* Trustpilot — always visible */}
          <div className="relative mt-4">
            <TrustpilotWidget />
          </div>

        </header>

        {/* Tab pills on red + content in white rounded box */}
        <TabBar />
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="
        flex items-center justify-center text-white
        hover:opacity-70 active:scale-95
        transition-all
      "
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.83a8.28 8.28 0 004.76 1.5v-3.4a4.85 4.85 0 01-1-.24z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.67 31.67 0 000 12a31.67 31.67 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.67 31.67 0 0024 12a31.67 31.67 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77A1.75 1.75 0 000 1.73v20.54A1.75 1.75 0 001.77 24h20.45A1.75 1.75 0 0024 22.27V1.73A1.75 1.75 0 0022.22 0z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}
