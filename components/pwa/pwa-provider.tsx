"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

export function PwaProvider() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(SW_PATH, {
          scope: "/",
        });
      } catch {
        // no-op: registration errors are non-critical
      }
    };

    register();

    return () => {
      void registration?.update();
    };
  }, []);

  return null;
}


