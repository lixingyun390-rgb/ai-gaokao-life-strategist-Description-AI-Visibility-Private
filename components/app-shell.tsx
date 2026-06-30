import Link from "next/link";
import { BrainCircuit, Sparkles } from "lucide-react";

import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { MotionDirector } from "@/components/motion-director";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="safe-page galaxy-page">
      <MotionDirector />
      <GalaxyBackdrop />
      <header className="collage-header motion-section">
        <div className="collage-layer collage-layer-one motion-parallax" aria-hidden="true" />
        <div className="collage-layer collage-layer-two motion-parallax" aria-hidden="true" />
        <div className="collage-layer collage-layer-three motion-parallax" aria-hidden="true" />
        <div className="collage-letter collage-letter-a" aria-hidden="true">A</div>
        <div className="collage-letter collage-letter-i" aria-hidden="true">I</div>
        <div className="collage-mark collage-mark-score" aria-hidden="true">分</div>
        <div className="collage-mark collage-mark-route" aria-hidden="true">路</div>
        <div className="collage-orbit" aria-hidden="true" />
        <div className="collage-title-block">
          <p className="collage-kicker motion-card">5分钟生成你的18岁人生决策报告</p>
          <h1 className="motion-title">AI高考人生军师</h1>
        </div>
        <div className="collage-nav motion-card">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-primary shadow-sm">
              <BrainCircuit className="h-5 w-5" />
            </span>
            AI高考人生军师
          </Link>
          <span className="inline-flex items-center gap-1 rounded-sm border border-white/30 bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Beta
          </span>
        </div>
      </header>
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-md flex-col px-4">
        {children}
      </div>
    </main>
  );
}
