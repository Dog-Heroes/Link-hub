"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM } from "@/lib/utm";
import { trackEvent } from "@/lib/analytics";
import type { SectionData, LinkData } from "../HubShell";

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

function LinkIcon({ name }: { name?: string }) {
  switch (name) {
    case "sparkle":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
        </svg>
      );
    case "star":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "instagram":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.83a8.28 8.28 0 004.76 1.5v-3.4a4.85 4.85 0 01-1-.24z" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Hero CTA                                                           */
/* ------------------------------------------------------------------ */

function HeroCTAButton({
  utm,
  sections,
  links,
}: {
  utm: Record<string, string | undefined>;
  sections: SectionData[];
  links: LinkData[];
}) {
  // Hero CTA is the first link in the "hero_cta" section, or the first section's first link
  const heroSection = sections.find((s) => s.id === "hero_cta");
  const heroLink = heroSection
    ? links.find((l) => l.section_id === heroSection.id)
    : null;

  if (!heroLink) return null;

  const href = appendUTM(heroLink.url, utm);

  function handleClick() {
    trackEvent("link_hub_click", {
      link_id: "hero_cta",
      label: heroLink!.label,
      url: heroLink!.url,
    });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="
        block w-full py-4 rounded-2xl
        bg-[#E1251B] text-white
        text-[16px] font-extrabold text-center uppercase tracking-wide
        min-h-[44px]
        shadow-[0_4px_16px_rgba(225,37,27,0.3)]
        active:scale-[0.97] hover:bg-[#C41E16]
        transition-all
      "
    >
      {heroLink.label}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible Section                                                */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  section,
  sectionLinks,
  utm,
}: {
  section: SectionData;
  sectionLinks: LinkData[];
  utm: Record<string, string | undefined>;
}) {
  const [open, setOpen] = useState(!section.collapsed);

  if (sectionLinks.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          flex items-center justify-between w-full
          py-3 min-h-[44px]
          text-[12px] font-extrabold uppercase tracking-[0.15em]
          text-[#002B49]/40
        "
      >
        {section.label}
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pb-2">
              {sectionLinks.map((link) => (
                <LinkCard key={link.id} link={link} utm={utm} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  YouTube ID extractor                                               */
/* ------------------------------------------------------------------ */

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/*  Link Card (dispatches to correct layout)                           */
/* ------------------------------------------------------------------ */

function LinkCard({
  link,
  utm,
}: {
  link: LinkData;
  utm: Record<string, string | undefined>;
}) {
  const href = appendUTM(link.url, utm);

  function handleClick() {
    trackEvent("link_hub_click", {
      link_id: link.id,
      label: link.label,
      url: link.url,
      ...Object.fromEntries(
        Object.entries(utm).filter(([, v]) => v !== undefined)
      ),
    });
  }

  // --- YouTube embed ---
  if (link.link_type === "youtube") {
    const videoId = extractYouTubeId(link.media_url || link.url);
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-[#002B49]/8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {videoId && (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={link.label}
            />
          </div>
        )}
        <a
          href={href}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.67 31.67 0 000 12a31.67 31.67 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.67 31.67 0 0024 12a31.67 31.67 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
          </span>
          <span className="flex-1 text-[13px] font-semibold text-[#002B49]">
            {link.label}
          </span>
        </a>
      </div>
    );
  }

  // --- Featured (big image + text below) ---
  if (link.link_type === "featured" && link.media_url) {
    return (
      <a
        href={href}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="
          block rounded-2xl overflow-hidden
          border-2 border-[#002B49]/8
          active:scale-[0.97] hover:border-[#E1251B]/30 hover:shadow-md
          transition-all
          shadow-[0_2px_8px_rgba(0,0,0,0.04)]
        "
      >
        <div className="relative w-full aspect-[2/1] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.media_url}
            alt={link.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="px-4 py-3 bg-white text-center">
          <p className="text-[14px] font-bold text-[#002B49]">{link.label}</p>
          {link.badge && (
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#E1251B] text-white text-[11px] font-extrabold uppercase tracking-wide">
              {link.badge}
            </span>
          )}
        </div>
      </a>
    );
  }

  // --- Thumbnail (small image left + text) ---
  if (link.link_type === "thumbnail" && link.media_url) {
    return (
      <a
        href={href}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="
          flex items-center gap-3.5 px-3 py-2.5
          bg-white rounded-2xl
          min-h-[44px]
          border-2 border-[#002B49]/8
          active:scale-[0.97] hover:border-[#E1251B]/30 hover:shadow-md
          transition-all
          shadow-[0_2px_8px_rgba(0,0,0,0.04)]
        "
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.media_url}
            alt={link.label}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="flex-1 text-[14px] font-bold text-[#002B49]">
          {link.label}
        </span>
        {link.badge && (
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#E1251B] text-white text-[11px] font-extrabold uppercase tracking-wide">
            {link.badge}
          </span>
        )}
        <ChevronIcon />
      </a>
    );
  }

  // --- Classic link (default) ---
  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex items-center gap-3.5 px-4 py-3.5
        bg-white rounded-2xl
        min-h-[44px]
        border-2 border-[#002B49]/8
        active:scale-[0.97] hover:border-[#E1251B]/30 hover:shadow-md
        transition-all
        shadow-[0_2px_8px_rgba(0,0,0,0.04)]
      "
    >
      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#E1251B]/8 flex items-center justify-center text-[#E1251B]">
        <LinkIcon name={link.icon} />
      </span>

      <span className="flex-1 text-[14px] font-bold text-[#002B49]">
        {link.label}
      </span>

      {link.badge && (
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#E1251B] text-white text-[11px] font-extrabold uppercase tracking-wide">
          {link.badge}
        </span>
      )}

      <ChevronIcon />
    </a>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 text-[#002B49]/20"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  LinksTab                                                           */
/* ------------------------------------------------------------------ */

export default function LinksTab({
  sections = [],
  links = [],
}: {
  sections?: SectionData[];
  links?: LinkData[];
}) {
  const utm = useUTM();

  // Separate hero_cta section from regular sections
  const regularSections = sections.filter((s) => s.id !== "hero_cta");

  return (
    <div className="px-4 pt-5 flex flex-col gap-4">
      <HeroCTAButton utm={utm} sections={sections} links={links} />

      <div className="flex flex-col gap-1 mt-1">
        {regularSections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            sectionLinks={links.filter((l) => l.section_id === section.id)}
            utm={utm}
          />
        ))}
      </div>
    </div>
  );
}
