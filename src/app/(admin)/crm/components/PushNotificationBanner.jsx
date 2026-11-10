"use client";

import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetPushKeyQuery, useSubscribePushMutation } from "./pushApi";

// base64url VAPID key -> Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Shows a small "Enable job notifications" bar until the user allows them.
// Once allowed, it silently (re)registers this device every time the page opens.
// Put <PushNotificationBanner /> at the top of the Jobs Dashboard.
export default function PushNotificationBanner() {
  const { data: keyData } = useGetPushKeyQuery();
  const [subscribePush] = useSubscribePushMutation();
  const [state, setState] = useState("checking"); // checking | unsupported | ask | denied | on | error
  const [busy, setBusy] = useState(false);

  // Beep when a push arrives while this page is open (made with the browser's audio, no sound file needed)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let ctx = null;
    const unlock = () => { // browsers allow audio only after the user has clicked / tapped once
      try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch {}
    };
    const beep = () => {
      try {
        unlock();
        if (!ctx) return;
        [880, 1175].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
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
    const onMsg = (e) => { if (e.data?.type === "PUSH_RECEIVED") beep(); };
    window.addEventListener("pointerdown", unlock);
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, []);

  const supported = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const register = async (key) => {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    }
    await subscribePush(sub.toJSON()).unwrap();
  };

  useEffect(() => {
    if (!keyData) return;
    if (!keyData.enabled || !supported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    if (Notification.permission === "granted") {
      register(keyData.key).then(() => setState("on")).catch(() => setState("error"));
    } else {
      setState("ask");
    }
  }, [keyData]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission(); // must come from a click
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "ask"); return; }
      await register(keyData.key);
      setState("on");
    } catch (e) {
      console.error(e);
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  if (state === "ask" || state === "error") {
    return (
      <div className="d-flex align-items-center gap-2 flex-wrap rounded-3 px-3 py-2 mb-2" style={{ background: "#f4f4f5", border: "1px solid #e4e4e7" }}>
        <Icon icon="mdi:bell-ring-outline" width="20" height="20" style={{ color: "#111" }} />
        <span className="flex-grow-1" style={{ fontSize: ".85rem", color: "#0f172a" }}>
          {state === "error" ? "Could not enable notifications. Try again." : "Get a notification when a new job is assigned to you."}
        </span>
        <Button size="sm" variant="dark" onClick={enable} disabled={busy}>
          {busy ? "Enabling..." : "Enable notifications"}
        </Button>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="rounded-3 px-3 py-2 mb-2" style={{ background: "#fef2f2", border: "1px solid #fecaca", fontSize: ".8rem", color: "#991b1b" }}>
        Notifications are blocked in this browser. Allow them in the site settings (lock icon next to the address) to get new-job alerts.
      </div>
    );
  }
  return null; // checking / on / unsupported
}