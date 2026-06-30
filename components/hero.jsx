'use client';

import { useEffect } from "react";
import Link from "next/link";
import { renderCanvas, cleanUpCanvas } from "@/components/ui/canvas";
import { Plus, ArrowRight } from "lucide-react";

export default function Hero() {
  useEffect(() => {
    renderCanvas();
    return () => {
      cleanUpCanvas();
    };
  }, []);

  return (
    <section id="home" className="relative flex flex-col items-center justify-center min-h-[85vh] overflow-hidden px-4 pt-24 pb-20">
      <div className="z-10 flex flex-col items-center justify-center text-center max-w-4xl w-full">

        {/* Heading Border Container */}
        <div className="mt-6 md:mt-10 w-full px-2">
          <div
            className="relative mx-auto h-full rounded-2xl p-8 md:p-14 md:py-20 backdrop-blur-sm"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Corner Plus Indicators */}
            <Plus
              strokeWidth={3.5}
              className="absolute -left-3.5 -top-3.5 h-7 w-7"
              style={{ color: 'var(--accent-primary)' }}
            />
            <Plus
              strokeWidth={3.5}
              className="absolute -bottom-3.5 -left-3.5 h-7 w-7"
              style={{ color: 'var(--accent-primary)' }}
            />
            <Plus
              strokeWidth={3.5}
              className="absolute -right-3.5 -top-3.5 h-7 w-7"
              style={{ color: 'var(--accent-primary)' }}
            />
            <Plus
              strokeWidth={3.5}
              className="absolute -bottom-3.5 -right-3.5 h-7 w-7"
              style={{ color: 'var(--accent-primary)' }}
            />

            {/* Headline */}
            <h1
              className="select-none text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[72px] leading-[1.1]"
              style={{
                color: 'var(--text-heading)',
                letterSpacing: '-0.03em',
                textWrap: 'balance',
              }}
            >
              Your complete platform for project execution.
            </h1>
          </div>
        </div>

        {/* Description */}
        <p
          className="mx-auto mb-10 mt-10 max-w-2xl px-4 text-sm md:text-base leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Niyoplan combines project dashboards, sprint visibility, documentation workflows, and
          secure file attachments so product teams can plan, coordinate, and execute without friction.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="hero-btn-primary"
          >
            Start Project
            <ArrowRight size={15} className="ml-1" />
          </Link>
        </div>
      </div>

      {/* Target Canvas element for custom math script */}
      <canvas
        className="pointer-events-none absolute inset-0 mx-auto z-0 h-full w-full opacity-70"
        id="canvas"
      ></canvas>
    </section>
  );
}
