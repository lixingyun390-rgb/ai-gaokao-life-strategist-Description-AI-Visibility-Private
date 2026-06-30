"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { isWeChatBrowser } from "@/lib/client-env";

export function MotionDirector() {
  const pathname = usePathname();
  const [showOpening, setShowOpening] = useState(true);

  useEffect(() => {
    let context: { revert: () => void } | undefined;
    let cancelled = false;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isWeChat = isWeChatBrowser();
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const shouldPlayOpening = !sessionStorage.getItem("gaokao-opening-played");
    if (reduceMotion || isWeChat) {
      setShowOpening(false);
      return undefined;
    } else if (!shouldPlayOpening) {
      setShowOpening(false);
    }

    async function runMotion() {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      if (cancelled) return;

      const { gsap } = gsapModule;
      const { ScrollTrigger } = scrollTriggerModule;
      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        if (showOpening && shouldPlayOpening && !reduceMotion) {
          const stage = document.querySelector(".opening-stage");
          const timeline = gsap.timeline({
            defaults: { ease: "expo.out" },
            onComplete: () => {
              sessionStorage.setItem("gaokao-opening-played", "1");
              setShowOpening(false);
            },
          });

          timeline
            .set(document.body, { overflow: "hidden" })
            .fromTo(
              ".opening-panel",
              { scaleY: 0, transformOrigin: "top center" },
              { scaleY: 1, duration: 0.46, stagger: 0.055 },
            )
            .fromTo(
              ".opening-kicker",
              { y: 26, opacity: 0, clipPath: "inset(0 0 100% 0)" },
              { y: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 0.44 },
              "-=0.12",
            )
            .fromTo(
              ".opening-title",
              {
                x: -54,
                scaleX: 0.68,
                opacity: 0,
                clipPath: "inset(0 100% 0 0)",
                transformOrigin: "left center",
              },
              {
                x: 0,
                scaleX: 1,
                opacity: 1,
                clipPath: "inset(0 0% 0 0)",
                duration: 0.68,
              },
              "-=0.05",
            )
            .fromTo(
              ".opening-scanline",
              { xPercent: -120, opacity: 0 },
              { xPercent: 145, opacity: 1, duration: 0.5, ease: "power3.inOut" },
              "-=0.44",
            )
            .to(stage, {
              autoAlpha: 0,
              clipPath: "inset(0 0 100% 0)",
              duration: 0.5,
              ease: "power4.inOut",
              delay: 0.04,
            })
            .set(document.body, { overflow: "" });
        }

        gsap.utils.toArray<HTMLElement>(".motion-section").forEach((section) => {
          const title = section.querySelector(".motion-title");
          const explicitCards = Array.from(section.querySelectorAll<HTMLElement>(".motion-card"));
          const directCards = Array.from(
            section.querySelectorAll<HTMLElement>(
              ":scope > div.rounded-md, :scope > div.grid, :scope > div.flex, :scope > button, :scope > a",
            ),
          );
          const cards = Array.from(new Set([...explicitCards, ...directCards]));
          const reveals = section.querySelectorAll(".motion-reveal");

          if (title) {
            gsap.fromTo(
              title,
              {
                y: 78,
                scaleY: 0.72,
                opacity: 0,
                clipPath: "inset(0 0 100% 0)",
                transformOrigin: "left bottom",
              },
              {
                y: 0,
                scaleY: 1,
                opacity: 1,
                clipPath: "inset(0 0 0% 0)",
                duration: 1.18,
                ease: "expo.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 82%",
                  once: true,
                },
              },
            );
          }

          if (cards.length) {
            gsap.fromTo(
              cards,
              { y: coarsePointer ? 36 : 54, opacity: 0, rotateX: coarsePointer ? 0 : 7, filter: coarsePointer ? "blur(4px)" : "blur(10px)" },
              {
                y: 0,
                opacity: 1,
                rotateX: 0,
                filter: "blur(0px)",
                duration: 1.08,
                stagger: 0.08,
                ease: "power4.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 84%",
                  once: true,
                },
              },
            );
          }

          if (reveals.length) {
            gsap.fromTo(
              reveals,
              { clipPath: "inset(0 0 100% 0)", y: 28 },
              {
                clipPath: "inset(0 0 0% 0)",
                y: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: "power4.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 86%",
                  once: true,
                },
              },
            );
          }
        });

        gsap.utils.toArray<HTMLElement>(".motion-parallax").forEach((node) => {
          gsap.fromTo(
            node,
            { yPercent: -5 },
            {
              yPercent: 7,
              ease: "none",
              scrollTrigger: {
                trigger: node,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.7,
              },
            },
          );
        });

        ScrollTrigger.refresh();
      });
    }

    runMotion();

    return () => {
      cancelled = true;
      document.body.style.overflow = "";
      context?.revert();
    };
  }, [pathname]);

  if (!showOpening) return null;

  return (
    <div className="opening-stage" aria-hidden="true">
      <div className="opening-panel opening-panel-a" />
      <div className="opening-panel opening-panel-b" />
      <div className="opening-panel opening-panel-c" />
      <div className="opening-title-wrap">
        <div className="opening-kicker">AI GAOKAO STRATEGIST</div>
        <div className="opening-title">AI高考人生军师</div>
      </div>
      <div className="opening-scanline" />
    </div>
  );
}
