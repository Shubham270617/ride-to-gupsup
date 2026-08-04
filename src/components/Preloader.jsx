import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { images } from "../data/images";
import { brand } from "../data/content";

const IntroScene = lazy(() => import("../three/IntroScene"));

const DURATION = 3200;
const SESSION_KEY = "rtg_intro_shown";

export default function Preloader({ onFinish }) {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [progress, setProgress] = useState(0);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sessionStorage unavailable — non-fatal */
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) {
      onFinish?.();
      return;
    }
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const pct = Math.min(100, ((now - start) / DURATION) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(finish, 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <AnimatePresence onExitComplete={() => (document.body.style.overflow = "", onFinish?.())}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] bg-rtg-ink overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            exit={{ scale: 1.08 }}
            transition={{ duration: 4, ease: "linear" }}
          >
            <video
              className="w-full h-full object-cover"
              src="/videos/rtg-intro.mp4"
              poster={images.introPoster}
              autoPlay
              muted
              loop
              playsInline
            />
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-b from-rtg-ink/55 via-transparent to-rtg-ink/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-rtg-purple-950/40 via-transparent to-transparent" />

          <div className="absolute inset-0 mix-blend-screen opacity-50">
            <Suspense fallback={null}>
              <IntroScene />
            </Suspense>
          </div>

          <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 text-center">
            <div className="glass rounded-3xl px-6 py-8 md:px-14 md:py-12 max-w-2xl">
            <motion.img
              src={images.logo}
              alt={brand.name}
              className="h-14 md:h-20 w-auto mb-6 mx-auto"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.h1
              className="font-display text-3xl md:text-5xl leading-tight mb-3"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              Ride Together. Run Together.{" "}
              <span className="text-gradient">Grow Together.</span>
            </motion.h1>
            <motion.p
              className="text-rtg-mist text-sm md:text-base max-w-md mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              India's endurance sports community is loading.
            </motion.p>

            <motion.div
              className="w-56 md:w-72 mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rtg-orange-500 to-rtg-purple-400 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs tracking-[0.2em] uppercase text-rtg-mist">
                {Math.round(progress)}%
              </p>
            </motion.div>
            </div>

            <motion.button
              onClick={finish}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-8 md:bottom-10 text-xs md:text-sm text-rtg-white/60 hover:text-rtg-orange-400 tracking-wide uppercase transition-colors"
            >
              Skip Intro
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
