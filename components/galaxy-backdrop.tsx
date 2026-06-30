"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { isWeChatBrowser } from "@/lib/client-env";

const Galaxy = dynamic(() => import("@/components/galaxy").then((module) => module.Galaxy), {
  ssr: false,
  loading: () => null,
});

export function GalaxyBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isWeChatBrowser()) return;
    const requestIdle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 450));
    const cancelIdle = window.cancelIdleCallback ?? ((id: number) => window.clearTimeout(id));
    const idleId = requestIdle(() => setReady(true), { timeout: 1200 });

    return () => cancelIdle(idleId);
  }, []);

  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      {ready && (
        <Galaxy
          focal={[0.5, 0.42]}
          density={1.04}
          glowIntensity={0.36}
          saturation={0.68}
          hueShift={205}
          starSpeed={0.36}
          speed={0.68}
          twinkleIntensity={0.34}
          rotationSpeed={0.032}
          mouseInteraction={false}
          mouseRepulsion={false}
          autoCenterRepulsion={0.14}
          transparent={false}
          maxPixelRatio={1.05}
          targetFps={26}
          className="galaxy-canvas"
        />
      )}
    </div>
  );
}
