import { useCallback, useMemo, useState } from "react";
import type { Camera, Scene, WebGLRenderer } from "three";
import { MODULE_LIBRARY, CONSTRAINTS } from "./catalog";
import { useDesignStore } from "./designStore";
import { RackThreeView } from "./components/RackThreeView";
import { SubmitModal } from "./components/SubmitModal";
import type { DesignExport } from "./types";

const MM = 0.001;

/** WebGLRenderer в three.js не имеет userData — храним сцену/камеру для скрина. */
type WebGLRendererWithCapture = WebGLRenderer & {
  userData: { scene: Scene; camera: Camera };
};

export function App() {
  const sections = useDesignStore((s) => s.sections);
  const selectedId = useDesignStore((s) => s.selectedSectionId);
  const selectSection = useDesignStore((s) => s.selectSection);
  const addSection = useDesignStore((s) => s.addSection);
  const addShelf = useDesignStore((s) => s.addShelfToSelected);
  const updateSelected = useDesignStore((s) => s.updateSelected);
  const updateShelfHeight = useDesignStore((s) => s.updateShelfHeight);
  const removeSection = useDesignStore((s) => s.removeSelectedSection);
  const removeShelf = useDesignStore((s) => s.removeShelf);
  const exportDesign = useDesignStore((s) => s.exportDesign);
  const reset = useDesignStore((s) => s.reset);

  const [submitOpen, setSubmitOpen] = useState(false);

  const selected = useMemo(
    () => sections.find((s) => s.id === (selectedId ?? sections[0]?.id)) ?? null,
    [sections, selectedId]
  );

  const effectiveSelectedId = selected?.id ?? null;

  const layoutOffsets = useMemo(() => {
    let x = 0;
    const gap = 0.04;
    return sections.map((sec) => {
      const w = sec.widthMm * MM;
      const pos = x + w / 2;
      x += w + gap;
      return pos;
    });
  }, [sections]);

  const handleGlReady = useCallback((gl: WebGLRenderer, scene: Scene, camera: Camera) => {
    (gl as WebGLRendererWithCapture).userData = { scene, camera };
    (window as Window & { __mvpGl?: WebGLRenderer }).__mvpGl = gl;
  }, []);

  const handlePickSection = useCallback((id: string) => {
    selectSection(id);
  }, [selectSection]);

  const downloadJson = (data: DesignExport, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCapture = () => {
    const gl = (window as Window & { __mvpGl?: WebGLRenderer }).__mvpGl as WebGLRendererWithCapture | undefined;
    if (!gl?.userData?.scene || !gl.userData?.camera) return;
    const ud = gl.userData;
    const save = () => {
      gl.render(ud.scene!, ud.camera!);
      const url = gl.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `stellazh-${Date.now()}.png`;
      a.click();
    };
    requestAnimationFrame(() => requestAnimationFrame(save));
  };

  const onDropModule = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-module-kind");
    if (kind === "section") addSection();
    if (kind === "shelf") addShelf();
  };

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <header className="top-bar">
        <div className="brand">
          <strong>Стеллаж</strong>
          <span className="muted">конструктор MVP</span>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={() => reset()}>
            Сброс
          </button>
          <button type="button" onClick={handleCapture}>
            Сохранить изображение
          </button>
          <button type="button" className="primary" onClick={() => setSubmitOpen(true)}>
            Отправить на расчёт
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="panel library">
          <h2>Модули</h2>
          <p className="hint">Перетащите на область 3D или нажмите «добавить».</p>
          <ul className="module-list">
            {MODULE_LIBRARY.map((m) => (
              <li key={m.id}>
                <div
                  className="module-card"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-module-kind", m.kind);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <div>
                    <strong>{m.label}</strong>
                    <div className="muted small">{m.hint}</div>
                  </div>
                  <button
                    type="button"
                    className="mini"
                    onClick={() => (m.kind === "section" ? addSection() : addShelf())}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <h3>Секции</h3>
          <ul className="section-list">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={effectiveSelectedId === s.id ? "sel" : ""}
                  onClick={() => selectSection(s.id)}
                >
                  Секция {i + 1} · {s.widthMm}×{s.heightMm}×{s.depthMm} мм
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main
          className="viewport-wrap"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropModule}
        >
          <RackThreeView
            sections={sections}
            layoutCenterXs={layoutOffsets}
            selectedSectionId={selectedId}
            onPickSection={handlePickSection}
            onGlReady={handleGlReady}
          />
          <div className="drop-hint">Область сборки · сетка {CONSTRAINTS.gridMm} мм</div>
        </main>

        <aside className="panel inspector">
          <h2>Параметры</h2>
          {!selected ? (
            <p className="muted">Выберите секцию слева или в сцене.</p>
          ) : (
            <>
              <label className="field">
                <span>Ширина, мм</span>
                <input
                  type="range"
                  min={CONSTRAINTS.section.width.min}
                  max={CONSTRAINTS.section.width.max}
                  step={CONSTRAINTS.section.width.step}
                  value={selected.widthMm}
                  onChange={(e) => updateSelected({ widthMm: Number(e.target.value) })}
                />
                <span className="value">{selected.widthMm}</span>
              </label>
              <label className="field">
                <span>Высота, мм</span>
                <input
                  type="range"
                  min={CONSTRAINTS.section.height.min}
                  max={CONSTRAINTS.section.height.max}
                  step={CONSTRAINTS.section.height.step}
                  value={selected.heightMm}
                  onChange={(e) => updateSelected({ heightMm: Number(e.target.value) })}
                />
                <span className="value">{selected.heightMm}</span>
              </label>
              <label className="field">
                <span>Глубина, мм</span>
                <input
                  type="range"
                  min={CONSTRAINTS.section.depth.min}
                  max={CONSTRAINTS.section.depth.max}
                  step={CONSTRAINTS.section.depth.step}
                  value={selected.depthMm}
                  onChange={(e) => updateSelected({ depthMm: Number(e.target.value) })}
                />
                <span className="value">{selected.depthMm}</span>
              </label>
              <label className="field">
                <span>Цвет корпуса</span>
                <input
                  type="color"
                  value={selected.carcassColor}
                  onChange={(e) => updateSelected({ carcassColor: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Цвет кромки</span>
                <input
                  type="color"
                  value={selected.edgeColor}
                  onChange={(e) => updateSelected({ edgeColor: e.target.value })}
                />
              </label>

              <h3>Полки</h3>
              {selected.shelves.length === 0 ? (
                <p className="muted small">Нет полок. Добавьте модуль «Полка».</p>
              ) : (
                <ul className="shelf-inspector">
                  {selected.shelves.map((sh) => (
                    <li key={sh.id}>
                      <label>
                        Высота от низа, мм
                        <input
                          type="range"
                          min={CONSTRAINTS.shelf.heightFromBottom.min}
                          max={selected.heightMm - 80}
                          step={CONSTRAINTS.shelf.heightFromBottom.step}
                          value={sh.heightFromBottomMm}
                          onChange={(e) =>
                            updateShelfHeight(selected.id, sh.id, Number(e.target.value))
                          }
                        />
                      </label>
                      <button type="button" className="mini danger" onClick={() => removeShelf(selected.id, sh.id)}>
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="danger-zone">
                <button type="button" className="danger outline" onClick={() => removeSection()}>
                  Удалить секцию
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmit={(client) => {
          const data = exportDesign(client);
          downloadJson(data, `quote-${Date.now()}.json`);
          handleCapture();
        }}
      />

      <style>{css}</style>
    </div>
  );
}

const css = `
.app-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 1rem; background: #fff; border-bottom: 1px solid #dde2ea;
  flex-wrap: wrap; gap: 0.5rem;
}
.brand { display: flex; align-items: baseline; gap: 0.5rem; }
.muted { color: #5c6570; }
.small { font-size: 0.85rem; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
button {
  border: 1px solid #c9d0db; border-radius: 8px; padding: 0.45rem 0.75rem;
  background: #fff;
}
button.primary { background: #2563eb; color: #fff; border-color: #1d4ed8; }
button.ghost { background: transparent; }
button.mini { padding: 0.2rem 0.45rem; font-size: 0.85rem; }
button.danger { color: #b91c1c; border-color: #f0abab; }
button.danger.outline { background: #fff; }
.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.panel {
  background: #fff; border-right: 1px solid #dde2ea; padding: 0.85rem 1rem;
  overflow: auto;
}
.panel.library { width: 260px; flex-shrink: 0; }
.panel.inspector {
  width: 300px;
  flex-shrink: 0;
  border-right: none;
  border-left: 1px solid #dde2ea;
}
.panel h2 { margin: 0 0 0.35rem; font-size: 1.05rem; }
.panel h3 { margin: 1rem 0 0.35rem; font-size: 0.95rem; }
.hint { margin-top: 0; font-size: 0.88rem; }
.module-list, .section-list { list-style: none; padding: 0; margin: 0; }
.module-list li { margin-bottom: 0.5rem; }
.module-card {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 0.35rem;
  border: 1px dashed #9aa4b2; border-radius: 10px; padding: 0.5rem 0.55rem; background: #f8fafc;
}
.section-list button {
  width: 100%; text-align: left; margin-bottom: 0.35rem;
  border-radius: 8px; background: #f8fafc;
}
.section-list button.sel { border-color: #2563eb; background: #eff6ff; }
.viewport-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.drop-hint {
  position: absolute; left: 10px; bottom: 10px; font-size: 0.8rem;
  background: rgba(255,255,255,0.75); padding: 0.25rem 0.5rem; border-radius: 6px;
  pointer-events: none;
}
.field { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 0.5rem; margin-bottom: 0.75rem; align-items: center; }
.field span:first-child { grid-column: 1 / -1; font-size: 0.85rem; color: #444; }
.field input[type="range"] { grid-column: 1 / 2; width: 100%; }
.field .value { font-variant-numeric: tabular-nums; font-size: 0.9rem; }
.field input[type="color"] { width: 100%; height: 36px; border: 1px solid #ccc; border-radius: 6px; padding: 0; }
.shelf-inspector { list-style: none; padding: 0; margin: 0; }
.shelf-inspector li {
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem; margin-bottom: 0.5rem;
  display: flex; flex-direction: column; gap: 0.35rem;
}
.shelf-inspector label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; }
.danger-zone { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #eee; }
@media (max-width: 960px) {
  .workspace { flex-direction: column; }
  .panel.library { width: 100%; border-right: none; border-bottom: 1px solid #dde2ea; }
  .panel.inspector { width: 100%; border-left: none; border-top: 1px solid #dde2ea; }
  .viewport-wrap {
    flex: none;
    min-height: 0;
  }
}
`;
