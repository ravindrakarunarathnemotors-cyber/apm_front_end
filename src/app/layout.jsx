"use client";
import { useEffect, useState } from "react";
import { Be_Vietnam_Pro } from 'next/font/google';
import ReduxProvider from '../store/ReduxProvider';
import Image from 'next/image';
import NextTopLoader from 'nextjs-toploader';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper';
import { GoogleMapsProvider } from '@/context/GoogleMapsProvider'
import '@/assets/scss/app.scss';
import '@/assets/scss/icons.scss';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  subsets: ['latin']
});

/* ---------------------------------------------------------------
   Splash timing (ms)
   MIN_SHOW  : the meter animation plays at least this long (first visit of a session only)
   MAX_WAIT  : never wait longer than this for the logo image
---------------------------------------------------------------- */
const MIN_SHOW = 1800;
const MAX_WAIT = 3500;

/* ---------------------------------------------------------------
   Vehicle meter (SVG, driven by requestAnimationFrame)
---------------------------------------------------------------- */
const C = 200;
const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };

const TICKS = (() => {
  const out = [];
  for (let v = 0; v <= 8 + 1e-9; v += 0.5) {
    const major = Number.isInteger(v);
    const deg = 135 + (v / 8) * 270;
    const [x1, y1] = pt(major ? 148 : 158, deg);
    const [x2, y2] = pt(170, deg);
    out.push(<line key={"t" + v} x1={x1} y1={y1} x2={x2} y2={y2} className={`sp-tick${major ? " major" : ""}${v >= 6.5 ? " hot" : ""}`} />);
    if (major) { const [lx, ly] = pt(124, deg); out.push(<text key={"l" + v} x={lx} y={ly} className="sp-num">{v}</text>); }
  }
  return out;
})();

const STAGES = ["Starting engine", "Warming up", "Checking systems", "Ready to go"];

const SplashMeter = () => {
  const [s, setS] = useState({ rpm: 0, spd: 0, t: 0 });

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setS({ rpm: 0.2, spd: 0, t: 3 }); return; }
    let raf; const t0 = performance.now(); const c = { rpm: 0, spd: 0 };
    const loop = (now) => {
      const t = (now - t0) / 1000;
      let tr, ts;
      if (t < 0.2) { tr = 0.05; ts = 0; }                // ignition
      else if (t < 1.05) { tr = 1; ts = 1; }              // full sweep
      else { tr = 0.19 + 0.02 * Math.sin(t * 5); ts = 0; } // settle to idle
      c.rpm += (tr - c.rpm) * 0.11;
      c.spd += (ts - c.spd) * 0.08;
      setS({ rpm: c.rpm, spd: c.spd, t });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stage = s.t < 0.2 ? 0 : s.t < 1.05 ? 1 : s.t < 1.6 ? 2 : 3;
  const progress = Math.min(s.t / 1.7, 1) * 100;

  return (
    <div className="sp-meter">
      <div className="sp-gwrap">
        <div className="sp-halo" />
        <svg viewBox="0 0 400 400" className="sp-gauge" aria-hidden="true">
          <defs>
            <radialGradient id="spbez" cx="50%" cy="42%" r="65%">
              <stop offset="0%" stopColor="#1b1b22" /><stop offset="100%" stopColor="#040406" />
            </radialGradient>
            <linearGradient id="sparc" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff5f6d" /><stop offset="100%" stopColor="#e11d2e" />
            </linearGradient>
          </defs>
          <circle cx={C} cy={C} r="197" fill="url(#spbez)" className="sp-bezel" />
          <g className="sp-spin"><circle cx={C} cy={C} r="192" className="sp-dash" /></g>
          <g className="sp-spin rev"><circle cx={C} cy={C} r="106" className="sp-dash inner" /></g>

          <circle cx={C} cy={C} r="184" pathLength="100" className="sp-track" transform={`rotate(135 ${C} ${C})`} />
          <circle cx={C} cy={C} r="184" pathLength="100" className="sp-red" strokeDasharray={`${75 - (6.5 / 8) * 75} 100`} strokeDashoffset={-(6.5 / 8) * 75} transform={`rotate(135 ${C} ${C})`} />
          <circle cx={C} cy={C} r="184" pathLength="100" className="sp-live" stroke="url(#sparc)" strokeDasharray={`${Math.max(s.rpm, 0.001) * 75} 100`} transform={`rotate(135 ${C} ${C})`} />

          {TICKS}

          <text x={C} y="238" className="sp-small">x1000 r/min</text>
          <text x={C} y="298" className="sp-read">{Math.round(s.spd * 240)}</text>
          <text x={C} y="324" className="sp-unit">km/h</text>

          <g transform={`rotate(${-135 + s.rpm * 270} ${C} ${C})`} className="sp-needle">
            <line x1={C} y1={C + 24} x2={C} y2="38" />
            <circle cx={C} cy={C} r="13" /><circle cx={C} cy={C} r="4.5" className="pin" />
          </g>
        </svg>
      </div>

      <div className="sp-status" key={stage}>{STAGES[stage]}</div>
      <div className="sp-progress"><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
};

/* ---------------------------------------------------------------
   Splash CSS
---------------------------------------------------------------- */
const splashScreenStyles = `
#splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #050507;
  opacity: 1;
  transition: opacity 0.45s ease-in-out;
}
#splash-screen.hide { opacity: 0; pointer-events: none; }

.sp-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(55% 45% at 50% 55%, rgba(225,29,46,.28), transparent 70%),
    radial-gradient(60% 40% at 50% 110%, rgba(225,29,46,.4), transparent 70%);
}
.sp-content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center;
  gap: 22px; padding: 20px; width: 100%;
}

/* logo shown on a white chip so any loading_img_url looks right */
.sp-logo {
  display: flex; align-items: center; justify-content: center;
  padding: 12px 22px; border-radius: 16px; background: #fff;
  box-shadow: 0 14px 40px rgba(0,0,0,.55), 0 0 40px rgba(225,29,46,.25);
  animation: sp-rise .9s cubic-bezier(.2,.8,.2,1) both;
}

.sp-meter { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.sp-gwrap { position: relative; width: min(74vw, 46vh, 330px); aspect-ratio: 1; animation: sp-in 1s cubic-bezier(.2,.8,.2,1) both; }
.sp-halo { position: absolute; inset: -14%; border-radius: 50%; background: radial-gradient(circle, rgba(225,29,46,.45), transparent 62%); animation: sp-halo 3s ease-in-out infinite; }
.sp-gauge { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 26px 44px rgba(0,0,0,.85)); }

.sp-bezel { stroke: #2b2b33; stroke-width: 2; }
.sp-spin { transform-origin: 200px 200px; animation: sp-spin 30s linear infinite; }
.sp-spin.rev { animation-duration: 20s; animation-direction: reverse; }
.sp-dash { fill: none; stroke: rgba(255,255,255,.14); stroke-width: 1; stroke-dasharray: 2 9; }
.sp-dash.inner { stroke: rgba(225,29,46,.4); stroke-dasharray: 1 7; }
.sp-track, .sp-red, .sp-live { fill: none; stroke-width: 6; }
.sp-track { stroke: #1a1a20; stroke-dasharray: 75 100; }
.sp-red { stroke: #5c0710; }
.sp-live { filter: drop-shadow(0 0 8px rgba(255,60,75,.9)); }
.sp-tick { stroke: #4b4b55; stroke-width: 1.5; }
.sp-tick.major { stroke: #d6d6de; stroke-width: 2.5; }
.sp-tick.hot { stroke: #7a1420; }
.sp-tick.hot.major { stroke: #ff3b4b; }
.sp-num { fill: #d0d0d8; font-size: 15px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; }
.sp-small { fill: #6d6d78; font-size: 11px; font-weight: 500; text-anchor: middle; }
.sp-read { fill: #fff; font-size: 54px; font-weight: 600; text-anchor: middle; }
.sp-unit { fill: #ff4b5a; font-size: 13px; font-weight: 600; text-anchor: middle; }
.sp-needle line { stroke: #ff3b4b; stroke-width: 3.5; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(255,59,75,.95)); }
.sp-needle circle { fill: #0c0c10; stroke: #e11d2e; stroke-width: 3; }
.sp-needle .pin { fill: #ff3b4b; stroke: none; }

.sp-status { color: #d8d8e0; font-size: 14px; font-weight: 500; letter-spacing: .02em; animation: sp-fade .5s ease both; }
.sp-progress { width: min(64vw, 240px); height: 4px; border-radius: 99px; background: rgba(255,255,255,.12); overflow: hidden; }
.sp-progress i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #7a0f1a, #e11d2e, #ff4b5a); box-shadow: 0 0 12px rgba(255,75,90,.8); }

@keyframes sp-spin { to { transform: rotate(360deg); } }
@keyframes sp-halo { 0%,100% { opacity: .55; transform: scale(.96); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes sp-in { from { opacity: 0; transform: scale(.9); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes sp-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes sp-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

@media (max-height: 560px) { .sp-logo { display: none; } .sp-gwrap { width: min(60vh, 260px); } }
@media (prefers-reduced-motion: reduce) {
  #splash-screen *, #splash-screen *::before, #splash-screen *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
`;

export default function RootLayout({ children }) {
  const [logoSmb, setLogoSmb] = useState(null);   // loading_img_url
  const [logofav, setLogofav] = useState(null);   // favicon_url
  const [checked, setChecked] = useState(false);  // sessionStorage read finished
  const [isLoaded, setIsLoaded] = useState(false); // logo image loaded
  const [minDone, setMinDone] = useState(false);  // meter played long enough
  const [force, setForce] = useState(false);      // safety timeout
  const [gone, setGone] = useState(false);        // splash removed from DOM

useEffect(() => {
  if (typeof window !== "undefined") {
    const storedSettings = sessionStorage.getItem("brandingSettings");

    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);

        if (parsedSettings.loading_img_url) {
          setLogoSmb(parsedSettings.loading_img_url);
        }

        setLogofav("/images/mainlogo.jpeg");

      } catch (error) {
        console.error("Error parsing branding settings:", error);
      }
    } else {
      setLogofav("/images/mainlogo.jpeg");
    }
  }

  setChecked(true);


    const seen = sessionStorage.getItem("splashSeen") === "1";
    sessionStorage.setItem("splashSeen", "1");
    const t1 = setTimeout(() => setMinDone(true), seen ? 0 : MIN_SHOW);
    const t2 = setTimeout(() => setForce(true), MAX_WAIT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Splash hides after the meter has played AND the logo (if any) has loaded
  const logoReady = !logoSmb || isLoaded || force;
  const hide = checked && minDone && logoReady;

  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 550); // after the fade-out transition
    return () => clearTimeout(t);
  }, [hide]);

  return (
    <html lang="en">
      <head>
        {logofav && <link rel="icon" type="image/png" href={logofav} />}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <style suppressHydrationWarning>{splashScreenStyles}</style>
      </head>
      <body className={beVietnamPro.className} data-sidebar-size="collapsed">
        {/* Vehicle meter splash: always plays, shows the loading logo when available */}
        {!gone && (
          <div id="splash-screen" className={hide ? "hide" : ""}>
            <div className="sp-bg" />
            <div className="sp-content">
              {logoSmb && (
                <div >
                  {/* <Image
                    alt="logo-square"
                    width={200}
                    height={90}
                    src={logoSmb}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setIsLoaded(true)}
                    style={{ height: 52, width: "auto", maxWidth: "min(60vw, 210px)", objectFit: "contain" }}
                    priority
                  /> */}
                </div>
              )}
              <SplashMeter />
            </div>
          </div>
        )}

        <NextTopLoader color="#c52222" showSpinner={false} />

        {/* Content renders behind the splash so the app is ready when it fades out */}
        <div id="__next_splash">
          <ReduxProvider>
            <GoogleMapsProvider>
              <AppProvidersWrapper>
                {children}
              </AppProvidersWrapper>
            </GoogleMapsProvider>
          </ReduxProvider>
        </div>
      </body>
    </html>
  );
}

