"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM, isSiteUrl } from "@/lib/utm";
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
/*  Internal tab links                                                 */
/* ------------------------------------------------------------------ */

/**
 * A link whose `url` is `#<tabId>` (e.g. `#quiz`) opens that tab of the hub
 * itself instead of navigating anywhere — the CMS convention for "Crea il
 * piano personalizzato" pointing at the hub's own Quiz tab rather than an
 * external site. Returns the target tab id, or null for a normal URL.
 */
function internalTabId(url: string): string | null {
  return url.startsWith("#") && url.length > 1 ? url.slice(1) : null;
}

/* ------------------------------------------------------------------ */
/*  Hero CTA                                                           */
/* ------------------------------------------------------------------ */

/** Real id of the "Hero CTA" section in the `sections` table (type `cta`). */
const HERO_CTA_SECTION_ID = "hero-cta";

function HeroCTAButton({
  utm,
  sections,
  links,
  onNavigateTab,
  brand,
}: {
  utm: Record<string, string | undefined>;
  sections: SectionData[];
  links: LinkData[];
  onNavigateTab?: (tabId: string) => void;
  brand: string;
}) {
  // Hero CTA is the first link in the dedicated "hero-cta" section
  const heroSection = sections.find((s) => s.id === HERO_CTA_SECTION_ID);
  const heroLink = heroSection
    ? links.find((l) => l.section_id === heroSection.id)
    : null;

  if (!heroLink) return null;

  const tabId = internalTabId(heroLink.url);

  // Same rule as the regular link cards: only tag links that point back
  // at the Dog Heroes site, never an external domain.
  const href = tabId ? "#" : isSiteUrl(heroLink.url) ? appendUTM(heroLink.url, utm) : heroLink.url;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (tabId) {
      e.preventDefault();
      onNavigateTab?.(tabId);
    }
    trackEvent(
      "link_hub_click",
      {
        link_id: heroLink!.id,
        label: heroLink!.label,
        url: heroLink!.url,
      },
      brand
    );
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="
        block w-full py-4 rounded-[var(--brand-radius)]
        bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)]
        text-[16px] font-extrabold text-center uppercase tracking-wide
        min-h-[44px]
        shadow-[0_4px_16px_var(--brand-shadow-accent)]
        active:scale-[0.97] hover:brightness-90
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
  onNavigateTab,
  brand,
}: {
  section: SectionData;
  sectionLinks: LinkData[];
  utm: Record<string, string | undefined>;
  onNavigateTab?: (tabId: string) => void;
  brand: string;
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
          text-[var(--brand-color-text)]/40
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
                <LinkCard key={link.id} link={link} utm={utm} onNavigateTab={onNavigateTab} brand={brand} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Video detection (YouTube + direct video files)                     */
/* ------------------------------------------------------------------ */

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

/** True for a URL that is a YouTube watch/short/embed link (any `youtube*` host or `youtu.be`). */
function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  return /youtu\.be\/|youtube(?:-nocookie)?\.com\//i.test(url);
}

/** True for a YouTube Shorts URL (used to pick the 9:16 aspect ratio). */
function isYouTubeShortsUrl(url?: string | null): boolean {
  if (!url) return false;
  return /youtube(?:-nocookie)?\.com\/shorts\//i.test(url);
}

/** True for a URL that points directly at a video file (.mp4/.webm/.mov/.ogg), query string allowed. */
function isDirectVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

/**
 * A link is rendered as an inline video when it's explicitly typed as such
 * (`link_type` "youtube" or "video" — the latter future-proofing for the
 * admin), or when its URL/media_url is recognisably a YouTube link or a
 * direct video file. This lets a plain "classic" link whose URL is a
 * YouTube link or a Shopify CDN .mp4 become a video automatically, with no
 * DB change required.
 */
function isVideoLink(link: LinkData): boolean {
  return (
    link.link_type === "youtube" ||
    link.link_type === "video" ||
    isYouTubeUrl(link.url) ||
    isYouTubeUrl(link.media_url) ||
    isDirectVideoUrl(link.url) ||
    isDirectVideoUrl(link.media_url)
  );
}

/* ------------------------------------------------------------------ */
/*  In-viewport hook — lazy mount + play/pause on scroll                */
/* ------------------------------------------------------------------ */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  // No IntersectionObserver support (very old browsers): fall back to
  // "always visible" from the start rather than never, computed once at
  // mount time (not as a setState inside the effect below).
  const noIOSupport =
    typeof window !== "undefined" && typeof IntersectionObserver === "undefined";
  const [inView, setInView] = useState(noIOSupport);
  const [hasEntered, setHasEntered] = useState(noIOSupport);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasEntered(true);
      },
      { threshold: 0.4, rootMargin: "100px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView, hasEntered };
}

/* ------------------------------------------------------------------ */
/*  Audio icons                                                        */
/* ------------------------------------------------------------------ */

function SpeakerOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M18.07 5.93a9 9 0 010 12.73" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function PlayBadgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Video card — native <video> for direct files, YouTube iframe       */
/*  otherwise. Autoplay muted loop, no native controls, overlay        */
/*  audio toggle, lazy-mounted and play/paused via IntersectionObserver */
/* ------------------------------------------------------------------ */

function VideoCard({
  link,
  href,
  onClick,
  brand,
}: {
  link: LinkData;
  href: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  brand: string;
}) {
  const { ref, inView, hasEntered } = useInView<HTMLDivElement>();
  const [muted, setMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const youtubeId = isYouTubeUrl(link.media_url)
    ? extractYouTubeId(link.media_url!)
    : isYouTubeUrl(link.url)
      ? extractYouTubeId(link.url)
      : null;

  // Native video wins when there's a direct video file to play; YouTube is
  // the fallback for "youtube"-typed / YouTube-URL links.
  const directVideoUrl = isDirectVideoUrl(link.media_url)
    ? link.media_url
    : isDirectVideoUrl(link.url)
      ? link.url
      : null;

  // Optional poster: media_url, when it isn't itself the video source (e.g.
  // a thumbnail image URL set alongside a .mp4 `url`).
  const posterUrl =
    link.media_url && link.media_url !== directVideoUrl && !isDirectVideoUrl(link.media_url)
      ? link.media_url
      : undefined;

  const isShorts = isYouTubeShortsUrl(link.media_url) || isYouTubeShortsUrl(link.url);
  const [aspectRatio, setAspectRatio] = useState<string>(isShorts ? "9 / 16" : "16 / 9");

  // Play/pause the native <video> as it enters/leaves the viewport.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !directVideoUrl) return;
    if (inView) {
      v.play().catch(() => {
        /* autoplay can be rejected by the browser — the video simply stays paused */
      });
    } else {
      v.pause();
    }
  }, [inView, hasEntered, directVideoUrl]);

  // Drive the YouTube player via postMessage (requires enablejsapi=1).
  function sendYouTubeCommand(func: string) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*"
    );
  }

  useEffect(() => {
    if (!youtubeId || !hasEntered) return;
    sendYouTubeCommand(inView ? "playVideo" : "pauseVideo");
  }, [inView, hasEntered, youtubeId]);

  function toggleMute(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !muted;
    setMuted(next);

    if (directVideoUrl && videoRef.current) {
      videoRef.current.muted = next;
    } else if (youtubeId) {
      sendYouTubeCommand(next ? "mute" : "unMute");
    }

    if (!next) {
      // Reuse the existing click-tracking pipeline, tagged with the link id.
      trackEvent("video_audio_on", { link_id: link.id }, brand);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const youtubeSrc = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`
    : null;

  return (
    <div className="rounded-[var(--brand-radius)] overflow-hidden border-2 border-[var(--brand-color-text)]/8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div
        ref={ref}
        className="relative w-full bg-black"
        style={{ aspectRatio }}
      >
        {hasEntered && directVideoUrl && (
          <video
            ref={videoRef}
            src={directVideoUrl}
            poster={posterUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                setAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
              }
            }}
          />
        )}

        {hasEntered && !directVideoUrl && youtubeSrc && (
          <iframe
            ref={iframeRef}
            src={youtubeSrc}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={link.label}
          />
        )}

        {hasEntered && (directVideoUrl || youtubeSrc) && (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Attiva audio" : "Disattiva audio"}
            aria-pressed={!muted}
            className="
              absolute bottom-2.5 right-2.5 z-10
              w-9 h-9 rounded-full
              bg-black/55 hover:bg-black/70 text-white
              flex items-center justify-center
              backdrop-blur-sm transition-colors
            "
          >
            {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
          </button>
        )}
      </div>

      <a
        href={href}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 bg-[var(--brand-color-card-bg)] hover:brightness-95 transition-colors"
      >
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
          {youtubeId ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.67 31.67 0 000 12a31.67 31.67 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.67 31.67 0 0024 12a31.67 31.67 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
          ) : (
            <PlayBadgeIcon />
          )}
        </span>
        <span className="flex-1 text-[13px] font-semibold text-[var(--brand-color-text)]">
          {link.label}
        </span>
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Link Card (dispatches to correct layout)                           */
/* ------------------------------------------------------------------ */

function LinkCard({
  link,
  utm,
  onNavigateTab,
  brand,
}: {
  link: LinkData;
  utm: Record<string, string | undefined>;
  onNavigateTab?: (tabId: string) => void;
  brand: string;
}) {
  const tabId = internalTabId(link.url);

  // External platforms (social, YouTube, Trustpilot, Notion, Empathy…) never
  // get the hub's UTM — only links back to the Dog Heroes site do. An
  // internal tab link (#quiz) never gets a UTM either: it never leaves the hub.
  const href = tabId ? "#" : isSiteUrl(link.url) ? appendUTM(link.url, utm) : link.url;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (tabId) {
      e.preventDefault();
      onNavigateTab?.(tabId);
    }
    trackEvent(
      "link_hub_click",
      {
        link_id: link.id,
        label: link.label,
        url: link.url,
        ...Object.fromEntries(
          Object.entries(utm).filter(([, v]) => v !== undefined)
        ),
      },
      brand
    );
  }

  // --- Video (YouTube embed or direct video file, e.g. cdn.shopify.com/videos/...) ---
  if (isVideoLink(link)) {
    return <VideoCard link={link} href={href} onClick={handleClick} brand={brand} />;
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
          block rounded-[var(--brand-radius)] overflow-hidden
          border-2 border-[var(--brand-color-text)]/8
          active:scale-[0.97] hover:border-[var(--brand-color-accent)]/30 hover:shadow-md
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
        <div className="px-4 py-3 bg-[var(--brand-color-card-bg)] text-center">
          <p className="text-[14px] font-bold text-[var(--brand-color-text)]">{link.label}</p>
          {link.badge && (
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)] text-[11px] font-extrabold uppercase tracking-wide">
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
          bg-[var(--brand-color-card-bg)] rounded-[var(--brand-radius)]
          min-h-[44px]
          border-2 border-[var(--brand-color-text)]/8
          active:scale-[0.97] hover:border-[var(--brand-color-accent)]/30 hover:shadow-md
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
        <span className="flex-1 text-[14px] font-bold text-[var(--brand-color-text)]">
          {link.label}
        </span>
        {link.badge && (
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)] text-[11px] font-extrabold uppercase tracking-wide">
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
      {...(tabId ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="
        flex items-center gap-3.5 px-4 py-3.5
        bg-[var(--brand-color-card-bg)] rounded-[var(--brand-radius)]
        min-h-[44px]
        border-2 border-[var(--brand-color-text)]/8
        active:scale-[0.97] hover:border-[var(--brand-color-accent)]/30 hover:shadow-md
        transition-all
        shadow-[0_2px_8px_rgba(0,0,0,0.04)]
      "
    >
      {link.media_url ? (
        <span className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.media_url}
            alt={link.label}
            className="w-full h-full object-cover"
          />
        </span>
      ) : (
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--brand-color-accent)]/8 flex items-center justify-center text-[var(--brand-color-accent)]">
          <LinkIcon name={link.icon} />
        </span>
      )}

      <span className="flex-1 text-[14px] font-bold text-[var(--brand-color-text)]">
        {link.label}
      </span>

      {link.badge && (
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)] text-[11px] font-extrabold uppercase tracking-wide">
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
      className="flex-shrink-0 text-[var(--brand-color-text)]/20"
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
  onNavigateTab,
  brand = "dog",
}: {
  sections?: SectionData[];
  links?: LinkData[];
  onNavigateTab?: (tabId: string) => void;
  brand?: string;
}) {
  const utm = useUTM(brand);

  // Separate the Hero CTA section (rendered by HeroCTAButton) from regular sections
  const regularSections = sections.filter((s) => s.id !== HERO_CTA_SECTION_ID);

  return (
    <div className="px-4 pt-5 flex flex-col gap-4">
      <HeroCTAButton utm={utm} sections={sections} links={links} onNavigateTab={onNavigateTab} brand={brand} />

      <div className="flex flex-col gap-1 mt-1">
        {regularSections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            sectionLinks={links.filter((l) => l.section_id === section.id)}
            utm={utm}
            onNavigateTab={onNavigateTab}
            brand={brand}
          />
        ))}
      </div>
    </div>
  );
}
