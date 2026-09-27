import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Home, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const PinDots = ({ length, filled, error }) => (
  <div className="flex items-center justify-center gap-4 mb-10" data-testid="pin-indicator">
    {Array.from({ length }).map((_, i) => (
      <motion.div
        key={i}
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`h-3.5 w-3.5 rounded-full border ${
          i < filled
            ? error
              ? "bg-red-500 border-red-500"
              : "bg-stone-900 border-stone-900"
            : "bg-transparent border-stone-300"
        } transition-colors duration-150`}
      />
    ))}
  </div>
);

const KeypadButton = ({ value, onPress, icon, testId, disabled }) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={() => onPress(value)}
    disabled={disabled}
    data-testid={testId}
    className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full bg-white/80 backdrop-blur-xl border border-stone-200/70 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] flex items-center justify-center text-2xl font-light text-stone-800 hover:bg-amber-50 active:bg-amber-100 transition-colors duration-150 disabled:opacity-40"
  >
    {icon || value}
  </motion.button>
);

const PIN_LENGTH = 6;

export default function LoginPage() {
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePress = (digit) => {
    if (loading) return;
    setError(false);
    setPin((prev) => (prev.length < PIN_LENGTH ? prev + digit : prev));
  };

  const handleDelete = () => {
    if (loading) return;
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const trySubmit = async () => {
      if (pin.length !== PIN_LENGTH) return;
      setLoading(true);
      try {
        const role = await login(pin);
        toast.success(role === "admin" ? "Selamat datang, Admin" : "Selamat datang");
      } catch (e) {
        setError(true);
        toast.error("PIN salah, coba lagi");
        setTimeout(() => setPin(""), 500);
      } finally {
        setLoading(false);
      }
    };
    trySubmit();
  }, [pin, login]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF9F5] via-[#FFFBEB] to-[#FAF4E1] px-6 py-10 relative overflow-hidden">
      {/* subtle grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center relative z-10"
        >
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(202,138,4,0.35)] border border-amber-100 flex items-center justify-center">
            <Home className="h-7 w-7 text-amber-600" strokeWidth={1.6} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 mb-1">
            Kost KTP Manager
          </h1>
          <p className="text-sm text-stone-500 mb-10 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Masuk dengan 6 digit PIN
          </p>

          <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />

          <div className="grid grid-cols-3 gap-4 sm:gap-5 justify-items-center mt-2">
            {keys.map((k) => (
              <KeypadButton
                key={k}
                value={k}
                onPress={handlePress}
                testId={`pin-key-${k}`}
                disabled={loading}
              />
            ))}
            <div />
            <KeypadButton value="0" onPress={handlePress} testId="pin-key-0" disabled={loading} />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleDelete}
              disabled={loading || pin.length === 0}
              data-testid="pin-key-delete"
              className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 disabled:opacity-30 transition-colors"
            >
              <Delete className="h-6 w-6" strokeWidth={1.6} />
            </motion.button>
          </div>

          <p className="text-xs text-stone-400 mt-10">
            Sistem manajemen KTP penghuni kost · Privasi terjaga
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
