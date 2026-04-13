import Image from "next/image";
import TabBar from "./TabBar";

export default function HubShell() {
  return (
    <div className="min-h-screen bg-[#e8e4de] flex items-start justify-center">
      {/* Mobile-only container — max 430px, centered on desktop */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#F9F6F1] relative overflow-x-hidden shadow-2xl">
        {/* Hero header — bold, full-bleed */}
        <header className="relative bg-[#E1251B] px-6 pt-10 pb-8 text-center overflow-hidden">
          {/* Decorative paw pattern — subtle background */}
          <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
            <svg width="100%" height="100%" className="absolute inset-0">
              <pattern id="paws" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="12" r="5" fill="white" />
                <circle cx="28" cy="8" r="4" fill="white" />
                <circle cx="38" cy="14" r="4" fill="white" />
                <circle cx="26" cy="22" r="7" fill="white" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#paws)" />
            </svg>
          </div>

          {/* Logo */}
          <div className="relative mx-auto mb-4 w-[160px]">
            <Image
              src="/images/hub/logo-white.svg"
              alt="Dog Heroes"
              width={160}
              height={80}
              priority
              className="w-full h-auto"
            />
          </div>

          {/* Tagline — serif, bold */}
          <p
            className="relative text-white text-[15px] leading-snug font-normal tracking-wide"
            style={{ fontFamily: "var(--font-cardo), Cardo, Georgia, serif" }}
          >
            Cibo fresco su misura per il tuo cane
          </p>

          {/* Social icons row */}
          <div className="relative flex justify-center gap-3 mt-5">
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
              href="https://www.facebook.com/dogheroes.it"
              label="Facebook"
            >
              <FacebookIcon />
            </SocialLink>
          </div>
        </header>

        {/* Tab system */}
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
        w-[44px] h-[44px] rounded-full
        bg-white/20 backdrop-blur-sm
        flex items-center justify-center text-white
        hover:bg-white/30 active:scale-95
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

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}
