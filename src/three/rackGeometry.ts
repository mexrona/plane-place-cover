import * as THREE from "three";
import type { SectionInstance } from "../types";

const MM = 0.001;
const TW = 18 * MM;

function finiteMm(mm: number, fallback: number) {
  return Number.isFinite(mm) && mm > 0 ? mm : fallback;
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}

/**
 * Одна секция стеллажа в виде THREE.Group (без React / R3F).
 */
export function buildSectionGroupTHREE(
  section: SectionInstance,
  centerX: number,
  selected: boolean
): THREE.Group {
  const Wm = finiteMm(section.widthMm, 600) * MM;
  const Hm = finiteMm(section.heightMm, 1800) * MM;
  const Dm = finiteMm(section.depthMm, 400) * MM;
  const W = Math.max(TW * 4, Wm);
  const H = Math.max(TW * 6, Hm);
  const D = Math.max(TW * 4, Dm);
  const c = new THREE.Color(section.carcassColor);
  const edge = new THREE.Color(section.edgeColor);

  const innerW = Math.max(TW * 2, W - 2 * TW);
  const innerH = Math.max(TW * 2, H - 2 * TW);
  const shelfW = Math.max(TW * 2, W - TW * 2.2);
  const shelfD = Math.max(TW * 2, D - TW * 2.2);

  const group = new THREE.Group();
  group.position.x = centerX;
  group.userData.sectionId = section.id;

  const lambert = (color: THREE.Color) => new THREE.MeshLambertMaterial({ color });

  const addBox = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, color: THREE.Color) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, lambert(color));
    m.position.set(px, py, pz);
    group.add(m);
  };

  addBox(W, TW, D, 0, TW / 2, 0, c);
  addBox(W, TW, D, 0, H - TW / 2, 0, c);
  addBox(TW, H - 2 * TW, D, -W / 2 + TW / 2, H / 2, 0, c);
  addBox(TW, H - 2 * TW, D, W / 2 - TW / 2, H / 2, 0, c);
  addBox(innerW, innerH, TW, 0, H / 2, -D / 2 + TW / 2, c);

  addBox(W, TW * 0.35, TW * 0.35, 0, H - TW / 2, D / 2 - TW * 0.2, edge);
  addBox(TW * 0.35, H - 2 * TW, TW * 0.35, -W / 2 + TW / 2, H / 2, D / 2 - TW * 0.2, edge);
  addBox(TW * 0.35, H - 2 * TW, TW * 0.35, W / 2 - TW / 2, H / 2, D / 2 - TW * 0.2, edge);

  for (const sh of section.shelves) {
    const y = TW + sh.heightFromBottomMm * MM + TW / 2;
    addBox(shelfW, TW, shelfD, 0, y, 0, c);
    addBox(shelfW, TW * 0.25, TW * 0.25, 0, y, D / 2 - TW * 0.25, edge);
  }

  if (selected) {
    const box = new THREE.BoxGeometry(W + 0.004, H + 0.004, D + 0.004);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2563eb, depthTest: false }));
    line.position.set(0, H / 2, 0);
    group.add(line);
  }

  return group;
}

export function disposeRackRoot(root: THREE.Group) {
  for (const ch of [...root.children]) {
    root.remove(ch);
    disposeObject3D(ch);
  }
}
