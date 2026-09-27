import { useEffect } from "react";

// Best-effort deterrents against screenshot/download for viewer role.
// Browsers cannot fully block screenshots at the OS level; this reduces easy paths.
export function useNoCapture() {
  useEffect(() => {
    const preventCtx = (e) => {
      e.preventDefault();
      return false;
    };
    const preventKeys = (e) => {
      const k = e.key?.toLowerCase();
      // Block common save / print / dev-tool shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "p", "u", "c"].includes(k)
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === "PrintScreen") {
        // Overwrite clipboard on PrintScreen if possible
        if (navigator.clipboard) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        e.preventDefault();
      }
      if (
        k === "f12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(k))
      ) {
        e.preventDefault();
      }
    };
    const preventDrag = (e) => {
      if (e.target?.tagName === "IMG") e.preventDefault();
    };

    document.addEventListener("contextmenu", preventCtx);
    document.addEventListener("keydown", preventKeys);
    document.addEventListener("dragstart", preventDrag);

    // Best-effort blur when window loses focus (screenshot attempts)
    const onBlur = () => {
      document.body.style.filter = "blur(20px)";
    };
    const onFocus = () => {
      document.body.style.filter = "";
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("contextmenu", preventCtx);
      document.removeEventListener("keydown", preventKeys);
      document.removeEventListener("dragstart", preventDrag);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.body.style.filter = "";
    };
  }, []);
}
