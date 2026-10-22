"use client";

import Image from "next/image";
import Link from "next/link";
import LoginForm from "./components/LoginForm";

import useBrandingSettings from "../../../../hooks/useBrandingSettings";
import { useEffect, useState } from "react";

/* ---------------------------------------------------------------
   CONFIG
   Background photo (dark garage / car): /public/images/service-hero.jpg
   Missing image = dark red gradient only.
---------------------------------------------------------------- */
const HERO_IMAGE = "/images/service-hero.jpg";
const LOGO_IMAGE = "/images/mainlogo.jpeg";
const FORGOT_URL = "/forgot-password";
const HELP_URL = "/help";

const FEATURES = [
  {
    label: ["Vehicle", "Management"],
    icon: (
      <svg viewBox="0 0 24 24"><path d="M5 17h14M3 13l2-5.5A2 2 0 016.9 6h10.2a2 2 0 011.9 1.5L21 13v5a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1h-11v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z" /><path d="M3 13h18" /><circle cx="7.5" cy="15" r=".8" /><circle cx="16.5" cy="15" r=".8" /></svg>
    ),
  },
  {
    label: ["Service &", "Maintenance"],
    icon: (
      <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 00-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 005.2-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z" /><path d="M16 16l4 4M18 14l-4 4" /></svg>
    ),
  },
  {
    label: ["Reports &", "Analytics"],
    icon: (
      <svg viewBox="0 0 24 24"><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>
    ),
  },
  {
    label: ["Customer", "Management"],
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.2A5.5 5.5 0 0121.5 20" /></svg>
    ),
  },
];

const Brand = ({ size = "lg" }) => (
  <div className={`kz-brand ${size}`}>
    <div className="kz-logo-img">
      <Image src={LOGO_IMAGE} alt="Karunarathne Auto Zone" width={140} height={140} priority
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
    <div className="kz-wordmark">
      <span className="w1">KARUNARATHNE</span>
      <span className="w2">AUTO ZONE</span>
    </div>
    <div className="kz-tagline">
      SERVICE SMARTER <i /> MANAGE BETTER
    </div>
  </div>
);

const Login = () => {
  const { settings } = useBrandingSettings();
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    document.title = `${process.env.NEXT_PUBLIC_COMANY_NAME} | Login`;
    if (settings?.company_name) setCompanyName(settings.company_name);
  }, [settings]);

  const name = companyName || "Karunarathne Auto Zone";

  return (
    <div className="kz-auth">
      <style>{css}</style>

      {/* ================= LEFT ================= */}
      <aside className="kz-hero">
        <div className="kz-photo" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="kz-shade" />
        <div className="kz-neon" aria-hidden="true" />
        <div className="kz-stripe tl1" aria-hidden="true" />
        <div className="kz-stripe tl2" aria-hidden="true" />
        <div className="kz-stripe bl1" aria-hidden="true" />
        <div className="kz-stripe bl2" aria-hidden="true" />

        <div className="kz-hero-inner">
          <Brand />

          <div className="kz-features">
            {FEATURES.map((f, i) => (
              <div className="kz-feature" key={i} style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
                {f.icon}
                <span>{f.label[0]}<br />{f.label[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ================= RIGHT ================= */}
      <main className="kz-panel">
        <div className="kz-glow" aria-hidden="true" />
        <div className="kz-stripe br1" aria-hidden="true" />
        <div className="kz-stripe br2" aria-hidden="true" />

        <div className="kz-card">
          <div className="kz-mobile-brand"><Brand size="sm" /></div>

          <h1 className="kz-title">Welcome <span>Back</span></h1>
          <p className="kz-sub">Login to your {name} account</p>

          <div className="kz-form"><LoginForm /></div>

          <div className="kz-or"><span>OR</span></div>

          <div className="kz-links">
            <Link href={FORGOT_URL} className="forgot">Forgot Password?</Link>
            <Link href={HELP_URL} className="help">Need Help?</Link>
          </div>
        </div>

        <p className="kz-copy">&copy; {new Date().getFullYear()} {name}. All rights reserved.</p>
      </main>
    </div>
  );
};

export default Login;

/* ---------------------------------------------------------------
   Input icons (red stroke) as data URIs
---------------------------------------------------------------- */
const ICON_USER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e3192b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 21a8 8 0 0116 0'/%3E%3C/svg%3E")`;
const ICON_LOCK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e3192b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4.5' y='10.5' width='15' height='10.5' rx='2'/%3E%3Cpath d='M8 10.5V7.5a4 4 0 018 0v3'/%3E%3Ccircle cx='12' cy='15.5' r='1.2'/%3E%3C/svg%3E")`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;0,700;0,800;1,800;1,900&family=Inter:wght@400;500;600&display=swap');

html, body { margin: 0; padding: 0; background: #070709; }

.kz-auth {
  --red: #e3192b; --red-hot: #ff2a3c; --red-dark: #a80f1c;
  --bg: #070709; --panel: #0b0b0e; --line: rgba(255,255,255,.12); --muted: #a2a2ad;
  position: fixed; inset: 0; z-index: 1000;
  display: grid; grid-template-columns: 1.2fr 1fr; grid-template-rows: minmax(100%, auto);
  background: var(--bg); color: #fff; overflow: auto;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ================= LEFT ================= */
.kz-hero { position: relative; overflow: hidden; min-height: 100%; background: #08080a; }
.kz-photo {
  position: absolute; inset: 0; background-size: cover; background-position: center;
  animation: kz-ken 30s ease-in-out infinite alternate;
}
@keyframes kz-ken { from { transform: scale(1); } to { transform: scale(1.08); } }
/* Black overlay eka. Image eka thawa penna ona nam --shade adu karanna (0 = overlay naha, 1 = full) */
.kz-shade {
  --shade: .35;
  position: absolute; inset: 0; opacity: var(--shade);
  background:
    radial-gradient(60% 45% at 50% 30%, rgba(0,0,0,.6), transparent 75%),
    linear-gradient(180deg, rgba(5,5,7,.5) 0%, transparent 40%, transparent 70%, rgba(5,5,7,1) 100%);
}
.kz-neon {
  position: absolute; top: 18%; right: -2%; width: 22%; height: 6px; border-radius: 4px;
  background: var(--red-hot); transform: rotate(-14deg);
  box-shadow: 0 0 18px var(--red-hot), 0 0 50px rgba(255,42,60,.6);
  animation: kz-flicker 6s infinite;
}
@keyframes kz-flicker { 0%,100%,92% { opacity: 1; } 93% { opacity: .4; } 95% { opacity: 1; } 96% { opacity: .6; } }

/* angled red stripes */
.kz-stripe { position: absolute; pointer-events: none; }
.kz-stripe.tl1 { top: 0; left: 0; width: 13%; height: 26%; background: linear-gradient(135deg, var(--red-hot), var(--red-dark)); clip-path: polygon(0 0, 100% 0, 0 100%); }
.kz-stripe.tl2 { top: 0; left: 0; width: 22%; height: 40%; background: linear-gradient(135deg, rgba(227,25,43,.55), transparent 70%); clip-path: polygon(62% 0, 72% 0, 0 76%, 0 64%); }
.kz-stripe.bl1 { bottom: 0; left: 0; width: 18%; height: 26%; background: linear-gradient(45deg, var(--red-dark), var(--red-hot)); clip-path: polygon(0 20%, 100% 100%, 0 100%); }
.kz-stripe.bl2 { bottom: 0; left: 0; width: 26%; height: 34%; background: linear-gradient(45deg, transparent 30%, rgba(227,25,43,.6)); clip-path: polygon(0 0, 8% 0, 100% 92%, 100% 100%, 88% 100%, 0 14%); }
.kz-stripe.br1 { bottom: 0; right: 0; width: 22%; height: 24%; background: linear-gradient(315deg, var(--red-hot), var(--red-dark)); clip-path: polygon(100% 0, 100% 100%, 0 100%); opacity: .95; }
.kz-stripe.br2 { bottom: 0; right: 0; width: 34%; height: 34%; background: linear-gradient(315deg, rgba(227,25,43,.5), transparent 70%); clip-path: polygon(100% 18%, 100% 30%, 30% 100%, 18% 100%); }

.kz-hero-inner {
  position: relative; height: 100%; min-height: 100vh; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: clamp(40px, 8vh, 80px) 40px clamp(36px, 7vh, 72px);
}

/* brand */
.kz-brand { display: flex; flex-direction: column; align-items: center; text-align: center; }
.kz-wordmark, .kz-tagline { animation: kz-rise 1s cubic-bezier(.2,.8,.2,1) both; }
.kz-logo-img { width: clamp(90px, 13vh, 140px); height: clamp(90px, 13vh, 140px); border-radius: 18px; overflow: hidden; filter: drop-shadow(0 10px 30px rgba(227,25,43,.45)); }
.kz-wordmark { margin-top: 14px; font-family: 'Montserrat', sans-serif; font-style: italic; font-weight: 900; line-height: 1; letter-spacing: -.01em; text-shadow: 0 6px 24px rgba(0,0,0,.6); }
.kz-wordmark .w1 { display: block; font-size: clamp(30px, 3.6vw, 54px); color: #fff; }
.kz-wordmark .w2 { display: block; margin-top: 4px; font-size: clamp(22px, 2.5vw, 38px); color: var(--red-hot); letter-spacing: .06em; }
.kz-tagline { margin-top: 18px; font-size: clamp(11px, .95vw, 14px); font-weight: 500; letter-spacing: .32em; color: #e6e6ec; display: flex; align-items: center; gap: 14px; }
.kz-tagline i { width: 6px; height: 6px; border-radius: 50%; background: var(--red-hot); box-shadow: 0 0 8px var(--red-hot); }

.kz-brand.sm .kz-logo-img { width: 64px; height: 64px; }
.kz-brand.sm .kz-wordmark .w1 { font-size: 24px; }
.kz-brand.sm .kz-wordmark .w2 { font-size: 17px; }
.kz-brand.sm .kz-tagline { font-size: 10px; letter-spacing: .22em; margin-top: 10px; }

/* features */
.kz-features { display: flex; justify-content: center; }
.kz-feature {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 4px clamp(14px, 2.2vw, 34px);
  text-align: center; font-size: clamp(12px, 1vw, 14.5px); font-weight: 500; line-height: 1.3; color: #f1f1f4;
  position: relative; animation: kz-rise .9s cubic-bezier(.2,.8,.2,1) both;
}
.kz-feature + .kz-feature::before { content: ""; position: absolute; left: 0; top: 18%; bottom: 0; width: 1.5px; background: linear-gradient(180deg, transparent, var(--red), transparent); }
.kz-feature svg { width: 36px; height: 36px; fill: none; stroke: var(--red-hot); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 6px rgba(255,42,60,.5)); transition: transform .3s; }
.kz-feature:hover svg { transform: translateY(-3px); }

@keyframes kz-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

/* ================= RIGHT ================= */
.kz-panel {
  position: relative; overflow: hidden; min-height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px clamp(20px, 4vw, 60px) 24px;
  background: linear-gradient(160deg, #111115 0%, var(--panel) 45%, #08080a 100%);
  border-left: 1px solid rgba(255,255,255,.05);
}
.kz-glow { position: absolute; width: 520px; height: 520px; right: -200px; bottom: -200px; border-radius: 50%; background: radial-gradient(circle, rgba(227,25,43,.22), transparent 65%); pointer-events: none; }

.kz-card {
  position: relative; z-index: 2; width: 100%; max-width: 540px; box-sizing: border-box;
  padding: clamp(32px, 6vh, 56px) clamp(24px, 3.2vw, 50px) clamp(30px, 5vh, 50px);
  border-radius: 18px; border: 1px solid rgba(255,255,255,.09);
  background: linear-gradient(160deg, rgba(26,26,31,.85), rgba(12,12,15,.85));
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 40px 90px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.05);
  animation: kz-rise 1s cubic-bezier(.2,.8,.2,1) .2s both;
}
.kz-mobile-brand { display: none; margin-bottom: 26px; }

.kz-title { margin: 0 0 10px; font: 800 clamp(30px, 2.6vw, 42px)/1.1 'Montserrat', sans-serif; letter-spacing: -.01em; color: #fff; }
.kz-title span { color: var(--red-hot); }
.kz-sub { margin: 0 0 clamp(24px, 4vh, 34px); font-size: 16px; color: #c9c9d2; }

/* ---------- LoginForm overrides ---------- */
.kz-form label, .kz-form .form-label { color: var(--muted); font-size: 12.5px; font-weight: 500; margin-bottom: 6px; }
.kz-form .mb-3 { margin-bottom: 20px !important; }
.kz-form .form-control,
.kz-form input[type="text"], .kz-form input[type="email"], .kz-form input[type="password"] {
  width: 100%; box-sizing: border-box; height: 60px;
  background-color: rgba(255,255,255,.025) !important; color: #fff !important;
  border: 1px solid var(--line) !important; border-radius: 10px !important;
  padding: 0 18px 0 56px !important; font-size: 15.5px;
  background-repeat: no-repeat !important; background-position: 20px center !important; background-size: 22px 22px !important;
  transition: border-color .2s, box-shadow .2s, background-color .2s;
}
.kz-form input[type="text"], .kz-form input[type="email"] { background-image: ${ICON_USER} !important; }
.kz-form input[type="password"] { background-image: ${ICON_LOCK} !important; }
.kz-form .form-control::placeholder { color: #9d9da8; }
.kz-form .form-control:focus, .kz-form input:focus {
  outline: none; background-color: rgba(255,255,255,.045) !important;
  border-color: var(--red) !important; box-shadow: 0 0 0 4px rgba(227,25,43,.16) !important;
}
.kz-form input:-webkit-autofill { -webkit-text-fill-color: #fff; -webkit-box-shadow: 0 0 0 100px #16161a inset !important; caret-color: #fff; }
.kz-form .input-group-text { background: rgba(255,255,255,.025); border-color: var(--line); color: var(--muted); }
.kz-form .form-check-input { background-color: transparent; border-color: #55555f; }
.kz-form .form-check-input:checked { background-color: var(--red); border-color: var(--red); }
.kz-form .form-check-label { color: var(--muted); }
.kz-form a { color: var(--red-hot); text-decoration: none; }
.kz-form .text-danger, .kz-form .invalid-feedback { color: #ff5a68 !important; font-size: 12.5px; }

.kz-form .btn-primary, .kz-form button[type="submit"] {
  position: relative; overflow: hidden; width: 100%; height: 60px; margin-top: 6px;
  border: 0 !important; border-radius: 10px !important;
  font: 700 17px 'Montserrat', sans-serif; color: #fff !important;
  background: linear-gradient(180deg, #ff2a3c, #d3121f) !important;
  box-shadow: 0 14px 34px -10px rgba(227,25,43,.75); cursor: pointer;
  transition: transform .2s, box-shadow .2s, filter .2s;
}
.kz-form .btn-primary::after, .kz-form button[type="submit"]::after {
  content: "→"; display: inline-block; margin-left: 10px; font-size: 20px; transition: transform .25s;
}
.kz-form .btn-primary:hover, .kz-form button[type="submit"]:hover { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 18px 40px -10px rgba(255,42,60,.85); }
.kz-form .btn-primary:hover::after, .kz-form button[type="submit"]:hover::after { transform: translateX(4px); }
.kz-form .btn-primary:disabled, .kz-form button[type="submit"]:disabled { opacity: .7; transform: none; }

/* OR + links */
.kz-or { display: flex; align-items: center; gap: 22px; margin: clamp(22px, 4vh, 34px) 0 clamp(18px, 3vh, 26px); color: #c9c9d2; font-size: 14px; font-weight: 600; }
.kz-or::before, .kz-or::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.18); }
.kz-links { display: flex; justify-content: space-between; font-size: 15px; }
.kz-links a { text-decoration: none; transition: color .2s; }
.kz-links .forgot { color: var(--red-hot); font-weight: 500; }
.kz-links .forgot:hover { color: #ff6b78; }
.kz-links .help { color: #c9c9d2; }
.kz-links .help:hover { color: #fff; }

.kz-copy { position: relative; z-index: 2; margin: 22px 0 0; font-size: 12px; color: #6e6e79; }

/* ================= Responsive ================= */
@media (max-width: 991px) {
  .kz-auth { grid-template-columns: 1fr; }
  .kz-hero { display: none; }
  .kz-mobile-brand { display: block; }
  .kz-panel { border-left: 0; }
}
@media (max-width: 480px) {
  .kz-card { padding: 28px 20px; }
  .kz-links { font-size: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .kz-auth *, .kz-auth *::before, .kz-auth *::after { animation: none !important; transition: none !important; }
}
`;