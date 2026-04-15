"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Section {
  id: string;
  label: string;
  order: number;
  collapsed: number;
}

interface LinkItem {
  id: string;
  section_id: string;
  label: string;
  url: string;
  icon: string;
  badge: string | null;
  order: number;
  enabled: number;
  link_type: string;
  media_url: string | null;
  click_count: number;
}

const LINK_TYPES = [
  { value: "link", label: "Link", icon: "🔗" },
  { value: "thumbnail", label: "Thumbnail", icon: "🖼️" },
  { value: "featured", label: "Featured", icon: "📸" },
  { value: "youtube", label: "YouTube", icon: "▶️" },
] as const;

interface Props {
  initialSections: Section[];
  initialLinks: LinkItem[];
}

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function api(path: string, method: string, body?: object) {
  await fetch(`/api/admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function LinksManager({ initialSections, initialLinks }: Props) {
  const [sections, setSections] = useState(initialSections);
  const [links, setLinks] = useState(initialLinks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- Toggle ---
  const toggleLink = useCallback(async (id: string, enabled: boolean) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: enabled ? 1 : 0 } : l)));
    await api("links", "PATCH", { id, enabled });
  }, []);

  // --- Save edit ---
  const saveLink = useCallback(async (id: string, updates: Partial<LinkItem>) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    setEditingId(null);
    await api("links", "PATCH", { id, ...updates });
  }, []);

  // --- Delete ---
  const deleteLink = useCallback(async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await api("links", "DELETE", { id });
  }, []);

  // --- Add link ---
  const addLink = useCallback(async (sectionId: string, data: { label: string; url: string; link_type: string; media_url: string; badge: string }) => {
    const id = crypto.randomUUID();
    const sectionLinks = links.filter((l) => l.section_id === sectionId);
    const order = sectionLinks.length;
    const newLink: LinkItem = {
      id, section_id: sectionId, label: data.label, url: data.url, icon: "link",
      badge: data.badge || null, order, enabled: 1, link_type: data.link_type,
      media_url: data.media_url || null, click_count: 0,
    };
    setLinks((prev) => [...prev, newLink]);
    setAddingTo(null);
    await api("links", "POST", { id, section_id: sectionId, ...data, order });
  }, [links]);

  // --- Add section ---
  const addSection = useCallback(async () => {
    const id = crypto.randomUUID();
    const order = sections.length;
    const newSection: Section = { id, label: "Nuova sezione", order, collapsed: 0 };
    setSections((prev) => [...prev, newSection]);
    await api("sections", "POST", { id, tab_id: "links", label: "Nuova sezione", order });
    setEditingId(`section-${id}`);
  }, [sections]);

  // --- Rename section ---
  const renameSection = useCallback(async (id: string, label: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
    setEditingId(null);
    await api("sections", "PATCH", { id, label });
  }, []);

  // --- Delete section ---
  const deleteSection = useCallback(async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setLinks((prev) => prev.filter((l) => l.section_id !== id));
    await api("sections", "DELETE", { id });
  }, []);

  // --- Drag & drop ---
  function handleDragEnd(sectionId: string) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLinks((prev) => {
        const sectionLinks = prev
          .filter((l) => l.section_id === sectionId)
          .sort((a, b) => a.order - b.order);
        const otherLinks = prev.filter((l) => l.section_id !== sectionId);

        const oldIndex = sectionLinks.findIndex((l) => l.id === active.id);
        const newIndex = sectionLinks.findIndex((l) => l.id === over.id);
        const reordered = arrayMove(sectionLinks, oldIndex, newIndex).map((l, i) => ({
          ...l,
          order: i,
        }));

        // Persist order
        reordered.forEach((l) => api("links", "PATCH", { id: l.id, order: l.order }));

        return [...otherLinks, ...reordered];
      });
    };
  }

  // --- Empty state ---
  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">
          Nessun link trovato. Esegui il seed del database.
        </p>
        <code className="block mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          npx tsx scripts/seed.ts
        </code>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections
        .sort((a, b) => a.order - b.order)
        .map((section) => {
          const sectionLinks = links
            .filter((l) => l.section_id === section.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Section header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                {editingId === `section-${section.id}` ? (
                  <SectionNameInput
                    initial={section.label}
                    onSave={(label) => renameSection(section.id, label)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <h3
                    className="text-sm font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-800"
                    onClick={() => setEditingId(`section-${section.id}`)}
                    title="Clicca per rinominare"
                  >
                    {section.label}
                  </h3>
                )}
                <button
                  onClick={() => { if (confirm(`Eliminare "${section.label}" e tutti i suoi link?`)) deleteSection(section.id); }}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Elimina sezione"
                >
                  <TrashIcon />
                </button>
              </div>

              {/* Links */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(section.id)}>
                <SortableContext items={sectionLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-gray-100">
                    {sectionLinks.map((link) => (
                      <SortableLink
                        key={link.id}
                        link={link}
                        isEditing={editingId === link.id}
                        onEdit={() => setEditingId(link.id)}
                        onSave={saveLink}
                        onCancel={() => setEditingId(null)}
                        onToggle={toggleLink}
                        onDelete={deleteLink}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add link */}
              {addingTo === section.id ? (
                <AddLinkForm
                  onSave={(data) => addLink(section.id, data)}
                  onCancel={() => setAddingTo(null)}
                />
              ) : (
                <button
                  onClick={() => setAddingTo(section.id)}
                  className="w-full py-3 text-sm text-gray-400 hover:text-[#E1251B] hover:bg-gray-50 transition-colors"
                >
                  + Aggiungi link
                </button>
              )}
            </div>
          );
        })}

      <button
        onClick={addSection}
        className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-400 hover:text-[#E1251B] hover:border-[#E1251B]/30 transition-colors"
      >
        + Nuova sezione
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Link Row                                                  */
/* ------------------------------------------------------------------ */

function SortableLink({
  link,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onToggle,
  onDelete,
}: {
  link: LinkItem;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (id: string, updates: Partial<LinkItem>) => void;
  onCancel: () => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const typeInfo = LINK_TYPES.find((t) => t.value === link.link_type) ?? LINK_TYPES[0];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="mr-3 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
        <GripIcon />
      </button>

      {/* Content */}
      {isEditing ? (
        <EditLinkForm link={link} onSave={onSave} onCancel={onCancel} />
      ) : (
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" title={typeInfo.label}>{typeInfo.icon}</span>
            <p className="text-sm font-medium text-gray-800 truncate">{link.label}</p>
          </div>
          <p className="text-xs text-gray-400 truncate">{link.url}</p>
        </div>
      )}

      {!isEditing && (
        <>
          {link.badge && (
            <span className="mx-2 text-[10px] font-bold uppercase bg-[#E1251B] text-white px-2 py-0.5 rounded-full">
              {link.badge}
            </span>
          )}
          <span className="text-xs text-gray-400 mx-2 whitespace-nowrap">{link.click_count} click</span>

          {/* Delete */}
          <button
            onClick={() => { if (confirm(`Eliminare "${link.label}"?`)) onDelete(link.id); }}
            className="mr-2 text-gray-300 hover:text-red-500 transition-colors"
          >
            <TrashIcon />
          </button>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => onToggle(link.id, !link.enabled)}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${link.enabled ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${link.enabled ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Link Form (inline)                                            */
/* ------------------------------------------------------------------ */

function EditLinkForm({
  link,
  onSave,
  onCancel,
}: {
  link: LinkItem;
  onSave: (id: string, updates: Partial<LinkItem>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [linkType, setLinkType] = useState(link.link_type);
  const [mediaUrl, setMediaUrl] = useState(link.media_url || "");
  const [badge, setBadge] = useState(link.badge || "");

  const needsMedia = linkType === "thumbnail" || linkType === "featured" || linkType === "youtube";

  return (
    <div className="flex-1 flex flex-col gap-2">
      {/* Row 1: type + label + url */}
      <div className="flex gap-2 items-center">
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E1251B] bg-white"
        >
          {LINK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="Titolo"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="URL"
        />
      </div>

      {/* Row 2: media + badge */}
      <div className="flex gap-2 items-center">
        {needsMedia && (
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
            placeholder={linkType === "youtube" ? "URL video YouTube" : "URL immagine"}
          />
        )}
        <input
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="Badge"
        />
        <button
          onClick={() => onSave(link.id, { label, url, link_type: linkType, media_url: mediaUrl || null, badge: badge || null } as Partial<LinkItem>)}
          className="text-xs font-bold text-white bg-[#E1251B] px-3 py-1.5 rounded-lg hover:bg-[#C41E16]"
        >
          Salva
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          Annulla
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Link Form                                                      */
/* ------------------------------------------------------------------ */

function AddLinkForm({ onSave, onCancel }: { onSave: (data: { label: string; url: string; link_type: string; media_url: string; badge: string }) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [linkType, setLinkType] = useState("link");
  const [mediaUrl, setMediaUrl] = useState("");
  const [badge, setBadge] = useState("");

  const needsMedia = linkType === "thumbnail" || linkType === "featured" || linkType === "youtube";

  return (
    <div className="flex flex-col gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex gap-2 items-center">
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E1251B] bg-white"
        >
          {LINK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="Titolo link"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="https://..."
        />
      </div>
      <div className="flex gap-2 items-center">
        {needsMedia && (
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
            placeholder={linkType === "youtube" ? "URL video YouTube" : "URL immagine"}
          />
        )}
        <input
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
          placeholder="Badge"
        />
        <button
          onClick={() => { if (label.trim()) onSave({ label, url, link_type: linkType, media_url: mediaUrl, badge }); }}
          className="text-xs font-bold text-white bg-[#E1251B] px-3 py-1.5 rounded-lg hover:bg-[#C41E16]"
        >
          Aggiungi
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          Annulla
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Name Input                                                 */
/* ------------------------------------------------------------------ */

function SectionNameInput({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="flex gap-2 items-center">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(value); if (e.key === "Escape") onCancel(); }}
        className="text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:border-[#E1251B]"
      />
      <button onClick={() => onSave(value)} className="text-xs font-bold text-[#E1251B]">✓</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
