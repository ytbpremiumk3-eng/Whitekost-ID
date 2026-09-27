import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, RotateCcw, Lock } from "lucide-react";

export default function KtpViewer({ src, name, room, onClose, restricted = false }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.5, 1));
  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const onPointerDown = (e) => {
    if (scale <= 1) return;
    dragging.current = true;
    start.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const preventCtx = (e) => {
    if (restricted) e.preventDefault();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex flex-col"
        onContextMenu={preventCtx}
        data-testid="ktp-viewer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 text-white/90">
          <div>
            <p className="text-xs text-white/60">Kamar {room}</p>
            <h3 className="text-base font-medium">{name}</h3>
          </div>
          <button
            onClick={onClose}
            data-testid="viewer-close"
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {restricted && (
          <div className="mx-auto mb-3 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Screenshot & unduh dinonaktifkan
          </div>
        )}

        {/* Image */}
        <div
          className="flex-1 overflow-hidden flex items-center justify-center relative"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ cursor: scale > 1 ? "grab" : "default", touchAction: "none" }}
        >
          <motion.img
            src={src}
            alt={`KTP ${name}`}
            draggable={false}
            onContextMenu={preventCtx}
            animate={{ scale, x: pos.x, y: pos.y }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-[92vw] max-h-[70vh] object-contain rounded-xl shadow-2xl select-none pointer-events-none"
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
            }}
            data-testid="viewer-image"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 pb-8 pt-4">
          <button
            onClick={zoomOut}
            disabled={scale <= 1}
            data-testid="viewer-zoom-out"
            className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="px-4 py-2 rounded-full bg-white/10 text-white text-sm min-w-[68px] text-center" data-testid="viewer-scale">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={zoomIn}
            disabled={scale >= 5}
            data-testid="viewer-zoom-in"
            className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={reset}
            data-testid="viewer-reset"
            className="h-11 w-11 ml-2 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
