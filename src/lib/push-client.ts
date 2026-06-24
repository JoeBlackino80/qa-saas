import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC =
  "BAT8ksEJZKdffikkdMrnQLSh71oJ0AWuxnkpAhQ9zmUAC3LWd8saMUjFE_5sfm0bkoszTs_qPPYGjEtzl6j8z8Y";
const SUBSCRIBE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-subscribe`;
const SEND_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function token(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");
  return session.access_token;
}

// Registers the service worker, asks permission, subscribes and stores it.
export async function enablePush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    throw new Error("Tento prehliadač nepodporuje push notifikácie.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Povolenie pre notifikácie bolo zamietnuté.");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }

  const res = await fetch(SUBSCRIBE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${await token()}`,
    },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error("Uloženie subscription zlyhalo.");
}

export async function testPush(): Promise<void> {
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${await token()}`,
    },
    body: JSON.stringify({
      title: "QA Agent",
      body: "Testovacie upozornenie — funguje to.",
      url: "/dashboard",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data?.error ?? "Test zlyhal.");
  if (data.sent === 0)
    throw new Error("Žiadne aktívne zariadenie — najprv zapni notifikácie.");
}
