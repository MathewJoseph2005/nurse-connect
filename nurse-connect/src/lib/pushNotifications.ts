/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

// VAPID public key - will be set from edge function
let vapidPublicKey: string | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getVapidPublicKey(): Promise<string> {
  if (vapidPublicKey) return vapidPublicKey;

  // Try to get from localStorage first
  const cached = localStorage.getItem("vapid_public_key");
  if (cached) {
    vapidPublicKey = cached;
    return cached;
  }

  // Generate new keys via edge function
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  const response = await fetch(
    `${apiBase}/functions/generate-vapid-keys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("nurseflow_access_token") || ""}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to generate VAPID keys");
  const keys = await response.json();

  // Store public key in localStorage and private key as secret
  localStorage.setItem("vapid_public_key", keys.publicKey);
  vapidPublicKey = keys.publicKey;

  return keys.publicKey;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("Service worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Check if notifications are supported and get permission
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return false;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return false;
    }

    // Get VAPID key
    const publicKey = await getVapidPublicKey();

    // Subscribe to push
    const appServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });

    const subscriptionJSON = subscription.toJSON();

    // Store in database
    const { error } = await supabase.from("push_subscriptions" as any).upsert(
      {
        user_id: userId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || "",
        auth: subscriptionJSON.keys?.auth || "",
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      return false;
    }

    console.log("Push subscription saved successfully");
    return true;
  } catch (error) {
    console.error("Push subscription failed:", error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
