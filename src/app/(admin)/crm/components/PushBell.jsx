"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useGetPushKeyQuery, useSubscribePushMutation, useUnsubscribePushMutation } from "./pushApi";

// base64url VAPID key -> Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Top bar button: turn "new job" push notifications on / off for this device.
//  - off (not allowed yet): bell with a slash, a red dot. Click = ask the browser for permission and subscribe.
//  - on: ringing bell with a green dot. Click = turn off for this device.
// Also plays a sound when a push arrives while any page of the app is open.
export default function PushBell() {
  const { data: keyData } = useGetPushKeyQuery();
  const [subscribePush] = useSubscribePushMutation();
  const [unsubscribePush] = useUnsubscribePushMutation();
  const [state, setState] = useState("checking"); // checking | unsupported | off | denied | on
  const [busy, setBusy] = useState(false);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);

  const supported = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  /* ---------- sound while the app is open ---------- */
  useEffect(() => {
    if (!supported()) return;
    audioRef.current = new Audio("/sound/success.mp3"); // same sound file the notification bell already uses

    const unlock = () => { // browsers allow audio only after the user has clicked / tapped once
      try {
        ctxRef.current = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
        if (ctxRef.current.state === "suspended") ctxRef.current.resume();
      } catch {}
    };
    const fallbackBeep = () => {
      try {
        unlock();
        const ctx = ctxRef.current;
        if (!ctx) return;
        [880, 1175].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = freq;
          const t = ctx.currentTime + i * 0.18;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
          o.connect(g); g.connect(ctx.destination);
          o.start(t); o.stop(t + 0.18);
        });
      } catch {}
    };
    const onMsg = (e) => {
      if (e.data?.type !== "PUSH_RECEIVED") return;
      let muted = false;
      try { muted = localStorage.getItem("notif_muted") === "true"; } catch {} // respects the mute button of the notification bell
      if (muted) return;
      audioRef.current?.play().catch(fallbackBeep);
    };
    window.addEventListener("pointerdown", unlock);
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, []);

  /* ---------- subscribe / unsubscribe ---------- */
  const register = async (key) => {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    await subscribePush(sub.toJSON()).unwrap();
  };

  useEffect(() => {
    if (!keyData) return;
    if (!keyData.enabled || !supported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    if (Notification.permission === "granted") {
      // already allowed: silently keep this device registered on every page load
      register(keyData.key)
        .then(() => setState("on"))
        .catch(() => setState("off"));
    } else {
      setState("off");
    }
  }, [keyData]);

  const turnOn = async () => {
    const perm = await Notification.requestPermission(); // must come from a click
    if (perm === "denied") { setState("denied"); return; }
    if (perm !== "granted") return;
    await register(keyData.key);
    setState("on");
  };

  const turnOff = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribePush(sub.endpoint).unwrap().catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState("off");
  };

  const onClick = async () => {
    if (busy) return;
    if (state === "denied") {
      alert("Notifications are blocked for this site. Click the lock icon next to the address bar, allow Notifications, then reload.");
      return;
    }
    setBusy(true);
    try {
      if (state === "on") await turnOff();
      else await turnOn();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking" || state === "unsupported") return null;

  const on = state === "on";
  const title = on
    ? "New job alerts are ON for this device (click to turn off)"
    : state === "denied"
      ? "Notifications are blocked in this browser"
      : "Turn on new job alerts for this device";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      aria-label={title}
      className="position-relative d-flex align-items-center justify-content-center border-0 bg-transparent p-1"
      style={{ width: 36, height: 36, cursor: "pointer" }}
    >
      <Icon
        icon={on ? "mdi:bell-ring" : "mdi:bell-off-outline"}
        width="22"
        height="22"
        style={{ color: on ? "#fff" : "rgba(255,255,255,.7)" }}
      />
      <span
        className="position-absolute rounded-circle"
        style={{ top: 5, right: 5, width: 9, height: 9, background: on ? "#22c55e" : "#ef4444", border: "1.5px solid #1a0000" }}
      />
    </button>
  );
}