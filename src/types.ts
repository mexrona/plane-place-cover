export interface ShelfInstance {
  id: string;
  /** расстояние от внутреннего низа секции, мм */
  heightFromBottomMm: number;
}

export interface SectionInstance {
  id: string;
  shelves: ShelfInstance[];
  widthMm: number;
  heightMm: number;
  depthMm: number;
  carcassColor: string;
  edgeColor: string;
}

export interface DesignExport {
  catalogHint: string;
  createdAt: string;
  client?: { name: string; phone: string; note: string };
  sections: SectionInstance[];
}
