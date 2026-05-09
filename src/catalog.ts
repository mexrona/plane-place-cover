/** Расширяемый каталог: технолог может править значения / добавлять записи по той же форме. */

export type ModuleKind = "section" | "shelf";

export interface CatalogModule {
  id: string;
  kind: ModuleKind;
  label: string;
  hint: string;
}

export const MODULE_LIBRARY: CatalogModule[] = [
  {
    id: "bay_section",
    kind: "section",
    label: "Секция стеллажа",
    hint: "Корпус с боками, верхом, низом и задником",
  },
  {
    id: "inner_shelf",
    kind: "shelf",
    label: "Полка",
    hint: "Добавляется в выбранную секцию",
  },
];

export const MATERIAL_SWATCHES = [
  { id: "white", label: "Белый", value: "#ececec" },
  { id: "oak", label: "Дуб", value: "#c4a574" },
  { id: "graphite", label: "Графит", value: "#4a4a4a" },
  { id: "sage", label: "Салатовый", value: "#9cb59c" },
] as const;

export const CONSTRAINTS = {
  section: {
    width: { min: 400, max: 1200, step: 10, default: 600 },
    height: { min: 800, max: 2400, step: 10, default: 1800 },
    depth: { min: 250, max: 600, step: 10, default: 400 },
  },
  shelf: {
    /** от низа внутренности, мм */
    heightFromBottom: { min: 120, step: 32 },
  },
  gridMm: 50,
} as const;
