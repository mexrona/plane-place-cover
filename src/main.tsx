import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RootErrorBoundary } from "./RootErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">В документе нет элемента #root — проверьте index.html.</p>';
} else {
  try {
    const root = createRoot(rootEl);
    root.render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    );
  } catch (e) {
    rootEl.innerHTML = `<p style="padding:24px;font-family:sans-serif;color:#b91c1c">Не удалось запустить React: ${String(
      e
    )}</p>`;
  }
}
