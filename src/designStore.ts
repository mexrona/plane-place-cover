import { create } from "zustand";
import { CONSTRAINTS } from "./catalog";
import type { DesignExport, SectionInstance, ShelfInstance } from "./types";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function snapMm(value: number, step: number) {
  return Math.round(value / step) * step;
}

interface DesignState {
  sections: SectionInstance[];
  selectedSectionId: string | null;
  addSection: () => void;
  addShelfToSelected: () => void;
  selectSection: (id: string | null) => void;
  updateSelected: (partial: Partial<SectionInstance>) => void;
  updateShelfHeight: (sectionId: string, shelfId: string, heightMm: number) => void;
  removeSelectedSection: () => void;
  removeShelf: (sectionId: string, shelfId: string) => void;
  exportDesign: (client?: DesignExport["client"]) => DesignExport;
  reset: () => void;
}

const sc = CONSTRAINTS.section;

const defaultSection = (): SectionInstance => ({
  id: uid("sec"),
  widthMm: sc.width.default,
  heightMm: sc.height.default,
  depthMm: sc.depth.default,
  carcassColor: "#ececec",
  edgeColor: "#c4a574",
  shelves: [],
});

export const useDesignStore = create<DesignState>((set, get) => ({
  sections: [defaultSection()],
  selectedSectionId: null,

  addSection: () => {
    const next = defaultSection();
    set((s) => ({
      sections: [...s.sections, next],
      selectedSectionId: next.id,
    }));
  },

  addShelfToSelected: () => {
    const sel = get().selectedSectionId ?? get().sections[0]?.id;
    if (!sel) return;
    set((state) => {
      const sec = state.sections.find((x) => x.id === sel);
      if (!sec) return state;
      const innerMax = sec.heightMm - 40;
      const defaultH = snapMm(Math.min(innerMax * 0.5, innerMax - 80), CONSTRAINTS.shelf.heightFromBottom.step);
      const shelf: ShelfInstance = {
        id: uid("shf"),
        heightFromBottomMm: Math.max(CONSTRAINTS.shelf.heightFromBottom.min, defaultH),
      };
      return {
        sections: state.sections.map((s) =>
          s.id === sel ? { ...s, shelves: [...s.shelves, shelf] } : s
        ),
        selectedSectionId: sel,
      };
    });
  },

  selectSection: (id) => set({ selectedSectionId: id }),

  updateSelected: (partial) => {
    const sel = get().selectedSectionId ?? get().sections[0]?.id;
    if (!sel) return;
    set((state) => ({
      sections: state.sections.map((s) => {
        if (s.id !== sel) return s;
        const next = { ...s, ...partial };
        const num = (v: number, fallback: number) =>
          Number.isFinite(v) && v > 0 ? v : fallback;
        const w = Math.min(sc.width.max, Math.max(sc.width.min, num(next.widthMm, s.widthMm)));
        const h = Math.min(sc.height.max, Math.max(sc.height.min, num(next.heightMm, s.heightMm)));
        const d = Math.min(sc.depth.max, Math.max(sc.depth.min, num(next.depthMm, s.depthMm)));
        const clamped = { ...next, widthMm: w, heightMm: h, depthMm: d };
        const shelves = clamped.shelves.map((sh) => ({
          ...sh,
          heightFromBottomMm: Math.min(
            h - 80,
            Math.max(CONSTRAINTS.shelf.heightFromBottom.min, sh.heightFromBottomMm)
          ),
        }));
        return { ...clamped, shelves };
      }),
    }));
  },

  updateShelfHeight: (sectionId, shelfId, heightMm) => {
    set((state) => ({
      sections: state.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const maxH = s.heightMm - 80;
        const snapped = snapMm(heightMm, CONSTRAINTS.shelf.heightFromBottom.step);
        const v = Math.min(maxH, Math.max(CONSTRAINTS.shelf.heightFromBottom.min, snapped));
        return {
          ...s,
          shelves: s.shelves.map((sh) =>
            sh.id === shelfId ? { ...sh, heightFromBottomMm: v } : sh
          ),
        };
      }),
    }));
  },

  removeSelectedSection: () => {
    const sel = get().selectedSectionId ?? get().sections[0]?.id;
    if (!sel) return;
    set((state) => {
      const next = state.sections.filter((s) => s.id !== sel);
      if (next.length === 0) next.push(defaultSection());
      return {
        sections: next,
        selectedSectionId: next[0]?.id ?? null,
      };
    });
  },

  removeShelf: (sectionId, shelfId) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === sectionId
          ? { ...s, shelves: s.shelves.filter((sh) => sh.id !== shelfId) }
          : s
      ),
    }));
  },

  exportDesign: (client) => ({
    catalogHint: "Модульные стеллажи: секции и полки",
    createdAt: new Date().toISOString(),
    client,
    sections: get().sections.map((s) => ({ ...s, shelves: s.shelves.map((x) => ({ ...x })) })),
  }),

  reset: () =>
    set({
      sections: [defaultSection()],
      selectedSectionId: null,
    }),
}));
