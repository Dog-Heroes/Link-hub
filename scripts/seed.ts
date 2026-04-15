/**
 * Seed script — imports current JSON config into the local SQLite DB.
 * Run: npx tsx scripts/seed.ts
 */

import { db, migrate } from "../src/lib/db";

// Import current config files
import tabsConfig from "../src/config/tabs.json";
import linksConfig from "../src/config/links.json";
import quizConfig from "../src/config/quiz.json";

async function seed() {
  console.log("🔄 Running migrations...");
  await migrate();
  console.log("✅ Schema ready\n");

  // --- Settings ---
  console.log("📝 Seeding settings...");
  const settings: [string, string][] = [
    ["tagline", "L'azienda italiana del cibo fresco"],
    ["meta_title", "Dog Heroes | Link Hub"],
    ["meta_description", "Tutto Dog Heroes in un unico posto"],
    ["discount_percent", String(quizConfig.discountPercent)],
    ["quiz_submit_url", quizConfig.submitUrl],
    ["quiz_intro_text", "Crea il piano di Fido in 1 minuto"],
    ["trustpilot_template_id", "5419b637fa0340045cd0c936"],
    ["trustpilot_business_id", "5ef37f719b4d640001c640ef"],
    ["trustpilot_token", "c7774e47-725c-420b-84bd-5536ba95f678"],
    ["trustpilot_locale", "it-IT"],
  ];

  for (const [key, value] of settings) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      args: [key, value],
    });
  }
  console.log(`  → ${settings.length} settings\n`);

  // --- Tabs ---
  console.log("📑 Seeding tabs...");
  for (const tab of tabsConfig.tabs) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO tabs (id, label, icon, "order", enabled, component_key) VALUES (?, ?, ?, ?, ?, ?)',
      args: [tab.id, tab.label, tab.icon, tab.order, tab.enabled ? 1 : 0, tab.component],
    });
  }
  console.log(`  → ${tabsConfig.tabs.length} tabs\n`);

  // --- Sections & Links ---
  console.log("🔗 Seeding sections & links...");
  // Hero CTA as a special section
  await db.execute({
    sql: 'INSERT OR REPLACE INTO sections (id, tab_id, label, "order", collapsed, type) VALUES (?, ?, ?, ?, ?, ?)',
    args: ["hero-cta", "links", "Hero CTA", 0, 0, "cta"],
  });
  await db.execute({
    sql: 'INSERT OR REPLACE INTO links (id, section_id, label, url, icon, badge, "order", enabled, link_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [
      "hero-cta-main",
      "hero-cta",
      linksConfig.hero_cta.label,
      linksConfig.hero_cta.url,
      "sparkle",
      null,
      0,
      1,
      "cta",
    ],
  });

  for (let si = 0; si < linksConfig.sections.length; si++) {
    const section = linksConfig.sections[si];
    await db.execute({
      sql: 'INSERT OR REPLACE INTO sections (id, tab_id, label, "order", collapsed, type) VALUES (?, ?, ?, ?, ?, ?)',
      args: [section.id, "links", section.label, si + 1, section.collapsed ? 1 : 0, "links"],
    });

    for (let li = 0; li < section.links.length; li++) {
      const link = section.links[li];
      await db.execute({
        sql: 'INSERT OR REPLACE INTO links (id, section_id, label, url, icon, badge, "order", enabled, link_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          link.id,
          section.id,
          link.label,
          link.url,
          link.icon || "link",
          (link as { badge?: string }).badge || null,
          li,
          1,
          "link",
        ],
      });
    }
  }

  // Add the links from Linktree that aren't in JSON yet
  const extraSections: {
    id: string;
    label: string;
    links: { id: string; label: string; url: string; enabled: boolean }[];
  }[] = [
    {
      id: "ordina-online",
      label: "Ordina Online 30% di sconto!",
      links: [
        {
          id: "acquista-box-prova",
          label: "🐶 ACQUISTA UNA BOX PROVA AL 30% DI SCONTO 🎁",
          url: "https://www.dogheroes.it/crea?promocoupon=cibofresco3",
          enabled: true,
        },
        {
          id: "come-funziona",
          label: "📦 Come funziona?",
          url: "https://www.youtube.com/watch?v=mDTpBVQT4B&list=PLh",
          enabled: true,
        },
        {
          id: "i-nostri-prodotti",
          label: "🍖 I nostri prodotti",
          url: "https://www.dogheroes.it/tutti-i-prodotti/",
          enabled: true,
        },
      ],
    },
    {
      id: "pet-store",
      label: "Prova Dog Heroes nei Pet Store",
      links: [
        {
          id: "trova-negozio",
          label: "📍 Trova il negozio più vicino a te 🐕",
          url: "https://www.google.com/maps/d/u/0/edit?mid=fMWOyCH",
          enabled: true,
        },
      ],
    },
    {
      id: "family",
      label: "Dog Heroes Family",
      links: [
        {
          id: "adotta",
          label: "Adotta con Dog Heroes",
          url: "https://business.empathy.it/dog-heroes/rifugio-virtuale",
          enabled: true,
        },
        {
          id: "blog",
          label: "🖤 Leggi il nostro Blog",
          url: "https://www.dogheroes.it/blog/",
          enabled: true,
        },
      ],
    },
    {
      id: "contatto",
      label: "Entriamo in contatto 🤝",
      links: [
        {
          id: "ambassador",
          label: "🏆 Diventa un Ambassador",
          url: "https://www.dogheroes.it/ambassador-program/",
          enabled: true,
        },
        {
          id: "recensione-trustpilot",
          label: "⭐⭐⭐⭐⭐ Lascia una recensione",
          url: "https://www.trustpilot.com/review/dogheroes.it",
          enabled: true,
        },
        {
          id: "lavora-con-noi",
          label: "🚀 Lavora con noi",
          url: "https://www.notion.so/Entra-nel-team-Dog-Heroes-81328cf",
          enabled: true,
        },
      ],
    },
  ];

  const baseOrder = linksConfig.sections.length + 1;
  for (let si = 0; si < extraSections.length; si++) {
    const section = extraSections[si];
    await db.execute({
      sql: 'INSERT OR REPLACE INTO sections (id, tab_id, label, "order", collapsed, type) VALUES (?, ?, ?, ?, ?, ?)',
      args: [section.id, "links", section.label, baseOrder + si, 0, "links"],
    });

    for (let li = 0; li < section.links.length; li++) {
      const link = section.links[li];
      await db.execute({
        sql: 'INSERT OR REPLACE INTO links (id, section_id, label, url, icon, badge, "order", enabled, link_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [link.id, section.id, link.label, link.url, "link", null, li, link.enabled ? 1 : 0, "link"],
      });
    }
  }

  console.log(`  → ${linksConfig.sections.length + extraSections.length + 1} sections\n`);

  // --- Social Links ---
  console.log("💬 Seeding social links...");
  const socials = [
    { id: "instagram", platform: "instagram", url: "https://instagram.com/dogheroes.it" },
    { id: "tiktok", platform: "tiktok", url: "https://tiktok.com/@dogheroes.it" },
    { id: "youtube", platform: "youtube", url: "https://www.youtube.com/@dogheroes" },
    { id: "linkedin", platform: "linkedin", url: "https://www.linkedin.com/company/dog-heroes/" },
    { id: "facebook", platform: "facebook", url: "https://www.facebook.com/dogheroes.it" },
  ];

  for (let i = 0; i < socials.length; i++) {
    const s = socials[i];
    await db.execute({
      sql: 'INSERT OR REPLACE INTO social_links (id, platform, url, "order", enabled) VALUES (?, ?, ?, ?, ?)',
      args: [s.id, s.platform, s.url, i, 1],
    });
  }
  console.log(`  → ${socials.length} social links\n`);

  // --- Quiz Options ---
  console.log("🐕 Seeding quiz options...");
  let optionCount = 0;

  const quizFields: { field: string; items: { value: string; label: string }[] }[] = [
    { field: "breed", items: quizConfig.breeds.map((b) => ({ value: b.toLowerCase(), label: b })) },
    { field: "body_condition", items: quizConfig.bodyConditions },
    { field: "activity_level", items: quizConfig.activityLevels },
    { field: "hunger_level", items: quizConfig.hungerLevels },
    { field: "diet", items: quizConfig.diets },
    { field: "allergy", items: quizConfig.allergies.map((a) => ({ value: a.value, label: a.label })) },
    { field: "health_issue", items: quizConfig.healthIssues.map((h) => ({ value: h.value, label: h.label })) },
  ];

  for (const { field, items } of quizFields) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = `${field}-${item.value}`;
      await db.execute({
        sql: 'INSERT OR REPLACE INTO quiz_options (id, field, value, label, "order") VALUES (?, ?, ?, ?, ?)',
        args: [id, field, item.value, item.label, i],
      });
      optionCount++;
    }
  }
  console.log(`  → ${optionCount} quiz options\n`);

  console.log("🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
