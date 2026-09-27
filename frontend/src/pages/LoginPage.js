import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";

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
              ? "bg-[#FF3B30] border-[#FF3B30]"
              : "bg-[#1C1C1E] border-[#1C1C1E]"
            : "bg-transparent border-[#C7C7CC]"
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
    className="w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] rounded-full bg-white/90 backdrop-blur-2xl border border-[#E5E5EA] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] flex items-center justify-center text-[28px] font-light text-[#1C1C1E] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors duration-150 disabled:opacity-40"
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
        toast.success(role === "admin" ? "Selamat datang, Admin" : "Selamat datang, RT");
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] px-6 py-10 relative overflow-hidden">
      {/* subtle iOS wallpaper gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-[#F2F2F7] to-[#E5E5EA]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center relative z-10"
        >
          <div className="mx-auto mb-4 h-24 w-24 rounded-[26px] bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-[#E5E5EA] flex items-center justify-center overflow-hidden p-2">
            <img src="/whitekost-logo.jpg" alt="White Kost 35" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1C1E] mb-1">
            White Kost 35
          </h1>
          <p className="text-[13px] text-[#8E8E93] italic mb-1">
            Tempatmu diterima dan dihargai
          </p>
          <p className="text-sm text-[#8E8E93] mb-10 flex items-center justify-center gap-1.5 mt-3">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} /> Masuk dengan 6 digit PIN
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
              className="w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] disabled:opacity-30 transition-colors"
            >
              <Delete className="h-6 w-6" strokeWidth={1.5} />
            </motion.button>
          </div>

          <p className="text-xs text-[#8E8E93] mt-10">
            Sistem manajemen KTP penghuni kost · Privasi terjaga
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-0 inset-x-0 z-10">
        <Footer />
      </div>
    </div>
  );
}
