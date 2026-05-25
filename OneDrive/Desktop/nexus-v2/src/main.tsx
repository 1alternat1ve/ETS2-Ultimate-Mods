import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/Confirm";
import "./index.css";

// Block browser-style behaviors in WebView2 (right-click menu, F5/refresh, zoom, drag-drop)
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  // Block F5, Ctrl+R, Ctrl+Shift+R (refresh)
  if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"))) {
    e.preventDefault();
  }
  // Block Ctrl+P (print), Ctrl+S (save), Ctrl+U (view source)
  if ((e.ctrlKey || e.metaKey) && ["p", "P", "s", "S", "u", "U"].includes(e.key)) {
    e.preventDefault();
  }
  // Block Ctrl/Meta + +/-/0 (zoom)
  if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
    e.preventDefault();
  }
});
// Block Ctrl+wheel zoom
window.addEventListener("wheel", (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
