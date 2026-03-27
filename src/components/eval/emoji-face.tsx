'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ── Score → image index ───────────────────────────────────────────────────────
// 1.png → score 1-4   (crying)
// 2.png → score 5-7   (neutral)
// 3.png → score 8-9   (happy)
// 4.png → score 10    (ecstatic)

const EMOJI_SRCS = [
    '/emoji/1.png',
    '/emoji/2.png',
    '/emoji/3.png',
    '/emoji/4.png',
] as const;

function getEmojiIndex(score: number): 0 | 1 | 2 | 3 {
    const s = Math.max(1, Math.min(10, Math.round(score)));
    if (s <= 4) return 0;
    if (s <= 7) return 1;
    if (s <= 9) return 2;
    return 3;
}

// Animation class per tier
const ANIM: Record<0 | 1 | 2 | 3, string> = {
    0: 'animate-cry',                                     // gentle sway when sad
    1: '',                                                // no animation, calm
    2: 'animate-[bounce_1.4s_ease-in-out_infinite]',      // happy bouncing
    3: 'animate-[bounce_0.75s_ease-in-out_infinite]',     // ecstatic fast bounce
};

// ── Component ─────────────────────────────────────────────────────────────────

export function EmojiFace({
    score,
    size = 80,
    priority = false,
    className,
}: {
    score: number;
    size?: number;
    priority?: boolean;
    className?: string;
}) {
    const idx = getEmojiIndex(score);

    return (
        <div
            className={cn('inline-flex items-center justify-center shrink-0', ANIM[idx], className)}
            style={{ width: size, height: size }}
        >
            <Image
                key={idx}
                src={EMOJI_SRCS[idx]}
                alt=""
                width={size}
                height={size}
                priority={priority}
                sizes={`${Math.ceil(size * 1.5)}px`}
                quality={80}
                className="object-contain w-full h-full animate-fadeIn"
                style={{ imageRendering: 'auto' }}
            />
        </div>
    );
}

// ── Preloader: preloads all 4 emoji images at the most used sizes ─────────────
// Placed in the eval layout so images are ready before user starts rating.

export function EmojiPreloader() {
    return (
        // size=0 visually but priority=true emits <link rel="preload"> in <head>
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            {EMOJI_SRCS.map((src) => (
                <Image
                    key={src}
                    src={src}
                    alt=""
                    width={96}
                    height={96}
                    priority
                    quality={80}
                    sizes="96px"
                />
            ))}
        </div>
    );
}
