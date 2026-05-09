import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Camera, Scene, WebGLRenderer } from "three";
import type { SectionInstance } from "../types";
import { buildSectionGroupTHREE, disposeRackRoot } from "../three/rackGeometry";

interface Props {
  sections: SectionInstance[];
  layoutCenterXs: number[];
  selectedSectionId: string | null;
  onPickSection: (id: string) => void;
  onGlReady?: (gl: WebGLRenderer, scene: Scene, camera: Camera) => void;
}

type Ctx = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: InstanceType<typeof OrbitControls>;
  rackRoot: THREE.Group;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  mount: HTMLDivElement;
};

export function RackThreeView({
  sections,
  layoutCenterXs,
  selectedSectionId,
  onPickSection,
  onGlReady,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const pickRef = useRef(onPickSection);
  const glReadyRef = useRef(onGlReady);
  pickRef.current = onPickSection;
  glReadyRef.current = onGlReady;

  const dataRef = useRef({ sections, layoutCenterXs, selectedSectionId });
  dataRef.current = { sections, layoutCenterXs, selectedSectionId };

  useLayoutEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch (e) {
      mount.innerHTML = `<div style="padding:16px;font-family:sans-serif;color:#b91c1c">WebGL недоступен: ${String(
        e
      )}</div>`;
      return () => {};
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if ("outputColorSpace" in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0xe9edf2, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9edf2);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    camera.position.set(2.2, 1.6, 2.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.35, 0.85, 0);
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xeef2ff, 0x9aa8b8, 1.05));
    scene.add(new THREE.AmbientLight(0xffffff, 0.38));
    const dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(6, 11, 5);
    scene.add(dir);

    const grid = new THREE.GridHelper(8, 40, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.002;
    scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0xd8dee9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(1, 0, 0);
    scene.add(ground);

    const rackRoot = new THREE.Group();
    scene.add(rackRoot);

    {
      const d = dataRef.current;
      disposeRackRoot(rackRoot);
      const effSel = d.selectedSectionId ?? d.sections[0]?.id ?? null;
      d.sections.forEach((sec, idx) => {
        rackRoot.add(buildSectionGroupTHREE(sec, d.layoutCenterXs[idx] ?? 0, effSel !== null && sec.id === effSel));
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      display: "block",
      touchAction: "none",
    });

    const setSize = () => {
      const r = mount.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(320, Math.floor(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(() => setSize());
    ro.observe(mount);
    setSize();

    const ctx: Ctx = {
      renderer,
      scene,
      camera,
      controls,
      rackRoot,
      raycaster,
      pointer,
      mount,
    };
    ctxRef.current = ctx;

    glReadyRef.current?.(renderer, scene, camera);
    (window as Window & { __rackCaptureGl?: WebGLRenderer }).__rackCaptureGl = renderer;

    let alive = true;
    const loop = () => {
      if (!alive) return;
      requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    requestAnimationFrame(loop);

    const onPointerDown = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(rackRoot.children, true);
      for (const hit of hits) {
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          const id = o.userData?.sectionId as string | undefined;
          if (id) {
            pickRef.current(id);
            return;
          }
          o = o.parent;
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    return () => {
      alive = false;
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      disposeRackRoot(rackRoot);
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      scene.remove(rackRoot);
      scene.remove(grid);
      scene.remove(ground);
      scene.remove(dir);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if ((window as Window & { __rackCaptureGl?: WebGLRenderer }).__rackCaptureGl === renderer) {
        delete (window as Window & { __rackCaptureGl?: WebGLRenderer }).__rackCaptureGl;
      }
      ctxRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { sections: secs, layoutCenterXs: xs, selectedSectionId: sel } = dataRef.current;
    disposeRackRoot(ctx.rackRoot);
    const effSel = sel ?? secs[0]?.id ?? null;
    secs.forEach((sec, idx) => {
      const cx = xs[idx] ?? 0;
      ctx.rackRoot.add(buildSectionGroupTHREE(sec, cx, effSel !== null && sec.id === effSel));
    });
    ctx.renderer.setRenderTarget(null);
  }, [sections, layoutCenterXs, selectedSectionId]);

  return <div ref={mountRef} className="scene-viewport-host rack-three-mount" />;
}
