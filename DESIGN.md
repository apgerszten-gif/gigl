# Gigl UI Architecture & Design System Specification

**Option A: Refined Gigl x Beli / DICE Hybrid**

This document contains the single source of truth for Gigl's visual design system, Tailwind CSS configuration tokens, component patterns, and complete HTML templates for the 4 core mobile screens.

> How to apply this in code is covered under "Design system" in `CLAUDE.md`. In short: the templates in section 4 are visual references. Where they use raw hex values or Tailwind's default palette for something a token in section 2 covers, use the token.
>
> **Scores are out of 5 stars.** The 10-point numbers in this document (`9.7`, `Perf. 10.0`, …) are mockup placeholders. Score badges keep this visual treatment but show Gigl's real score: the average of three 1–5 star sub-ratings.

---

## 1. Design System & Brand Identity

- **Brand Personality**: Warm, tactile, editorial indie live-music passport. Combines the high-utility ranked indexing and circular score badges of Beli with the sleek underground energy of modern ticketing platforms (DICE).
- **Primary Surface**: Warm oat / parchment background (`#FBF7EE` / `#FFF8F5`) paired with soft cream cards (`#FCF2EB` / `#FFFFFF`).
- **Signature Accent**: Terracotta burnt orange (`#D95D39` / `#C2410C`) for active badges, primary CTAs, and milestone indicators.
- **Score & Rating Accent**: Forest moss green (`#16A34A` / `#15803D`) for elite tiers and numerical rating circles (e.g. `9.9`, `9.7`).
- **Typography**:
  - Primary Font: `Epilogue`, sans-serif (Google Fonts).
  - Headings: Bold / ExtraBold with tight letter spacing (`tracking-tight`).
  - Meta/Subtitles: Warm Stone / Espresso tones (`#78716C`, `#1C1917`).

---

## 2. Tailwind Configuration (`tailwind.config.js`)

Add or merge these theme extensions into your Next.js project:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFF8F5',
          dim: '#E2D8D2',
          bright: '#FFF8F5',
          container: {
            lowest: '#FFFFFF',
            low: '#FCF2EB',
            DEFAULT: '#F5ECE5',
            high: '#EFE5DF',
            highest: '#E8DED8',
          },
        },
        primary: {
          DEFAULT: '#D95D39',
          hover: '#C2410C',
          light: '#FFEDD5',
        },
        ink: {
          title: '#1C1917',
          body: '#44403C',
          muted: '#78716C',
          faint: '#A8A29E',
        },
        score: {
          elite: '#15803D',
          epic: '#16A34A',
          superb: '#EA580C',
          good: '#CA8A04',
        }
      },
      fontFamily: {
        epilogue: ['var(--font-epilogue)', 'Epilogue', 'sans-serif'],
      },
      borderRadius: {
        'inherit': 'inherit',
        'squircle': '14px',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(41, 37, 36, 0.05)',
        'warm-md': '0 4px 14px rgba(217, 93, 57, 0.08), 0 2px 6px rgba(41, 37, 36, 0.04)',
        'warm-lg': '0 10px 25px -5px rgba(217, 93, 57, 0.15)',
      }
    },
  },
  plugins: [],
};
```

---

## 3. Shared App Chrome & Navigation Anatomy

### Top Header Shell

- Brand mark: `gigl ·\⊙` with terracotta geometry.
- Centered title or sub-filter bar.
- Right actions: Search icon (`lucide:search`) and circular user avatar (`w-8 h-8 rounded-full border border-stone-200`).

### Persistent 4-Tab Bottom Dock

1. **Feed** (`/feed`) — Lucide `newspaper` or `ticket` icon.
2. **Rankings** (`/rankings`) — Lucide `bar-chart-2` or `award` icon.
3. **Log Show (+)** (`/log-show`) — Central elevated round button (`bg-primary text-white w-12 h-12 shadow-warm-md`).
4. **Diary / Profile** (`/profile`) — Lucide `book-marked` or user avatar icon.

---

## 4. Core Screens Code Templates

### Screen 1: Live Feed (`/app/feed/page.tsx` or `feed.html`)

- **Key Components**:
  - Segmented sub-tabs (`Activity`, `Following`, `Popular Gigs`).
  - Quick filter chips: `⚡ This Weekend`, `📍 Los Angeles, CA ⌄`, `🎸 Indie & Rock`.
  - Curated festival circuit callout banner (Outside Lands / Coachella season).
  - Social event review card with user header, verified badge, circular score badge (`9.6`, `9.8`), multi-attribute breakdown (Performance, Venue Sound, Crowd Energy), long-form field quote, and interactive reaction chips (`#Emotional`, `#SingAlong`, `#AcousticMoment`).
  - Next-up gig event card with friend RSVPs ("Maya, Leo & 2 others going") and `+ I'm Going` button.

```html
<!-- Live Feed Container -->
<div class="min-h-screen bg-[#FFF8F5] text-stone-900 pb-28 font-['Epilogue',sans-serif]">

  <!-- Header -->
  <header class="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 bg-[#FFF8F5]/90 backdrop-blur-md border-b border-stone-200/60">
    <div class="flex items-center gap-2">
      <span class="text-2xl font-black tracking-tight text-stone-900">gigl</span>
      <span class="text-primary text-xl font-bold">·\⊙</span>
    </div>
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-full hover:bg-stone-100 text-stone-700">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </button>
      <div class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/20">
        <img src="/avatar.jpg" alt="User Avatar" class="w-full h-full object-cover"/>
      </div>
    </div>
  </header>

  <!-- Segmented Tabs -->
  <div class="px-5 pt-3">
    <div class="grid grid-cols-3 p-1 bg-stone-200/70 rounded-xl text-sm font-semibold text-stone-600">
      <button class="py-1.5 rounded-lg bg-white text-stone-900 shadow-sm">Activity</button>
      <button class="py-1.5 rounded-lg hover:text-stone-900">Following</button>
      <button class="py-1.5 rounded-lg hover:text-stone-900">Popular Gigs</button>
    </div>
  </div>

  <!-- Filter Chips -->
  <div class="flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
      <span>⚡</span> This Weekend
    </button>
    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-stone-800 border border-stone-200 whitespace-nowrap">
      <span>📍</span> Los Angeles, CA ▾
    </button>
    <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-stone-800 border border-stone-200 whitespace-nowrap">
      <span>🎸</span> Indie & Rock
    </button>
  </div>

  <!-- Feed Cards Stream -->
  <main class="px-5 space-y-4">

    <!-- Review Post Card -->
    <article class="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-warm-sm space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-full bg-stone-100 overflow-hidden ring-1 ring-stone-200">
            <img src="/reviewer.jpg" class="w-full h-full object-cover" alt="Reviewer"/>
          </div>
          <div>
            <div class="flex items-center gap-1">
              <span class="text-sm font-bold text-stone-900">@malabracadabra</span>
              <span class="text-xs text-emerald-600">✓</span>
            </div>
            <span class="text-xs text-stone-500">2 days ago · Sutro Stage</span>
          </div>
        </div>
        <!-- Circular Score Badge -->
        <div class="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 flex flex-col items-center justify-center">
          <span class="text-sm font-extrabold text-emerald-700 leading-none">9.6</span>
          <span class="text-[9px] font-bold text-emerald-600 uppercase">Top Tier</span>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-extrabold text-stone-900 leading-snug">Death Cab for Cutie</h3>
        <p class="text-xs text-stone-500 font-medium">Outside Lands 2026 · Golden Gate Park</p>
      </div>

      <!-- Field Quote -->
      <div class="p-3 bg-stone-50 rounded-xl border border-stone-100 text-sm text-stone-700 italic">
        “Hard to beat being front row and hearing Plans in full. Unreal sound balance and the crowd energy during Brothers on a Hotel Bed felt suspended in time.”
      </div>

      <!-- Highlight Chips -->
      <div class="flex flex-wrap gap-1.5">
        <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-700">#Emotional</span>
        <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-700">#AcousticMoment</span>
        <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-700">#SingAlong</span>
      </div>
    </article>

  </main>
</div>
```

---

### Screen 2: Rankings Scorecard (`/app/rankings/page.tsx` or `rankings.html`)

- **Key Components**:
  - Segmented index header: `Been (42)`, `Want to See (18)`, `Festivals (4)`, `Recs`.
  - Top 5% Gig-Goer badge with rank context (`L.A. #84`).
  - Active filters: `[Los Angeles, CA ✕]`, `Highest Rated ▾`.
  - Numbered list of ranked concerts with Beli-style circular rating badges (`9.9`, `9.7`, `9.6`, `9.5`, `9.4`) and tier tags (`ELITE`, `EPIC`, `SWEATY`, `SUPERB`).
  - Floating pill button: **`🗺️ View Gig Map • 42`**.

```html
<!-- Rankings Scorecard Container -->
<div class="min-h-screen bg-[#FFF8F5] text-stone-900 pb-28 font-['Epilogue',sans-serif]">

  <!-- Top Navigation -->
  <header class="sticky top-0 z-30 px-5 py-3.5 bg-[#FFF8F5]/90 backdrop-blur-md border-b border-stone-200/60 flex items-center justify-between">
    <div>
      <p class="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">My Music Index ✓</p>
      <h1 class="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-1.5">
        2026 Gigs
        <span class="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Personal</span>
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button class="p-2 rounded-full border border-stone-200 bg-white text-stone-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
      </button>
    </div>
  </header>

  <!-- Segmented Sub-Nav -->
  <div class="flex border-b border-stone-200 px-5 gap-6 text-sm font-bold">
    <button class="py-2.5 text-stone-900 border-b-2 border-primary">Been (42)</button>
    <button class="py-2.5 text-stone-400 hover:text-stone-700">Want to See (18)</button>
    <button class="py-2.5 text-stone-400 hover:text-stone-700">Festivals (4)</button>
    <button class="py-2.5 text-stone-400 hover:text-stone-700">Recs</button>
  </div>

  <!-- Milestone Badge -->
  <div class="m-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">🏅</div>
      <div>
        <p class="text-xs font-bold text-stone-900">Top 5% Gig-Goer</p>
        <p class="text-[11px] text-stone-500">42 ranked shows across 11 venues</p>
      </div>
    </div>
    <span class="text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm">L.A. #84</span>
  </div>

  <!-- Ranked List -->
  <main class="px-5 space-y-3">

    <!-- Rank Item 1 -->
    <div class="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-warm-sm flex items-center justify-between">
      <div class="flex items-start gap-3.5">
        <span class="text-2xl font-black text-stone-900 w-6">1</span>
        <div>
          <h3 class="text-base font-extrabold text-stone-900">Tame Impala</h3>
          <p class="text-xs text-stone-500">Kia Forum · Inglewood, CA</p>
          <span class="inline-block mt-2 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            ★ Peak Setlist · 3x Encore
          </span>
        </div>
      </div>
      <div class="w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-50 flex flex-col items-center justify-center">
        <span class="text-sm font-extrabold text-emerald-700">9.9</span>
        <span class="text-[8px] font-black text-emerald-600">ELITE</span>
      </div>
    </div>

    <!-- Rank Item 2 -->
    <div class="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-warm-sm flex items-center justify-between">
      <div class="flex items-start gap-3.5">
        <span class="text-2xl font-black text-stone-900 w-6">2</span>
        <div>
          <h3 class="text-base font-extrabold text-stone-900">Fred again..</h3>
          <p class="text-xs text-stone-500">LA Coliseum · Los Angeles, CA</p>
          <span class="inline-block mt-2 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
            📊 78,000 cap · Insane Stage Prod
          </span>
        </div>
      </div>
      <div class="w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-50 flex flex-col items-center justify-center">
        <span class="text-sm font-extrabold text-emerald-700">9.7</span>
        <span class="text-[8px] font-black text-emerald-600">EPIC</span>
      </div>
    </div>

  </main>

  <!-- Floating Map Pill CTA -->
  <div class="fixed bottom-20 inset-x-0 flex justify-center z-20 pointer-events-none">
    <button class="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-white font-bold text-sm shadow-warm-lg hover:bg-stone-800 transition">
      <span>🗺️</span> View Gig Map <span class="text-stone-400">•</span> 42
    </button>
  </div>
</div>
```

---

### Screen 3: Log Show Flow (`/app/log-show/page.tsx` or `log-show.html` - Single Viewport)

- **Key Components**:
  - Compact header with gig card (`Death Cab for Cutie · Outside Lands 2026`).
  - Inline 3-metric Gigl Scorecard (`Performance 10.0`, `Venue 9.2`, `Crowd 9.8` with aggregate `9.7 Score` pill).
  - Compact field notes input (`78/500`) with quick tag suggestions.
  - Tactile Gig Highlights & Vibes selector pills.
  - Inline companion tagger (`Tag friends +1`) & photo/setlist attachment buttons.
  - Sticky primary CTA: **`SAVE & PUBLISH GIG LOG →`**.

```html
<!-- Log Show Flow (Single Viewport Container) -->
<div class="min-h-screen bg-[#FFF8F5] text-stone-900 p-4 pb-24 font-['Epilogue',sans-serif] flex flex-col justify-between">

  <!-- Top Bar & Event Badge -->
  <div class="space-y-3">
    <div class="flex items-center justify-between border-b border-stone-200 pb-2">
      <button class="text-stone-700 font-bold text-sm flex items-center gap-1">← Cancel</button>
      <span class="text-xs font-black uppercase tracking-wider text-stone-500">Log Gig · Step 2/2</span>
      <span class="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Draft</span>
    </div>

    <!-- Selected Event Card -->
    <div class="p-3 bg-white rounded-xl border border-stone-200 flex items-center gap-3 shadow-warm-sm">
      <div class="w-12 h-12 rounded-lg bg-stone-800 flex-shrink-0 overflow-hidden">
        <img src="/band.jpg" class="w-full h-full object-cover" alt="Concert"/>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-bold text-primary uppercase">Outside Lands 2026</p>
        <h2 class="text-sm font-extrabold text-stone-900 truncate">Death Cab for Cutie</h2>
        <p class="text-[11px] text-stone-500 truncate">Sutro Stage · Sun, Aug 11</p>
      </div>
      <button class="text-stone-400 hover:text-stone-700">✎</button>
    </div>

    <!-- The Gigl Scorecard (Inline 3-Column) -->
    <div class="p-3 bg-white rounded-xl border border-stone-200 shadow-warm-sm space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black uppercase tracking-wider text-stone-800">The Gigl Scorecard</span>
        <span class="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Score 9.7</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center pt-1">
        <div class="p-1.5 bg-stone-50 rounded-lg border border-stone-100">
          <p class="text-[10px] font-bold text-stone-500">Perf. 10.0</p>
          <p class="text-amber-500 text-xs">★★★★★</p>
        </div>
        <div class="p-1.5 bg-stone-50 rounded-lg border border-stone-100">
          <p class="text-[10px] font-bold text-stone-500">Venue 9.2</p>
          <p class="text-amber-500 text-xs">★★★★☆</p>
        </div>
        <div class="p-1.5 bg-stone-50 rounded-lg border border-stone-100">
          <p class="text-[10px] font-bold text-stone-500">Crowd 9.8</p>
          <p class="text-amber-500 text-xs">★★★★★</p>
        </div>
      </div>
    </div>

    <!-- Field Notes Textarea -->
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs font-bold text-stone-700">
        <span>Field Notes</span>
        <span class="text-stone-400 font-normal text-[10px]">78/500</span>
      </div>
      <textarea rows="2" class="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Sound, crowd, stage visuals, unforgettable songs...">Incredible set, Plans played front to back. Sound at Sutro was pristine and the foggy SF atmosphere was magical.</textarea>
    </div>

    <!-- Vibe Tags Selection -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-xs font-bold text-stone-700">
        <span>Gig Highlights & Vibes</span>
        <span class="text-primary text-[10px]">2 selected</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary text-white">Surprise guest ✓</button>
        <button class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary text-white">Acoustic moment ✓</button>
        <button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-700">+ Crowd surf</button>
        <button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-700">+ Sing along</button>
        <button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-700">+ Laser show</button>
      </div>
    </div>

    <!-- Companions & Media Row -->
    <div class="grid grid-cols-2 gap-2 pt-1">
      <div class="p-2 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
        <span class="text-xs font-bold text-stone-700">Companions</span>
        <span class="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">OL +1</span>
      </div>
      <div class="p-2 bg-white rounded-xl border border-stone-200 flex items-center justify-center gap-2 text-xs font-bold text-stone-700">
        <span>📷 Photo (1)</span>
        <span class="text-stone-300">|</span>
        <span>📋 Setlist</span>
      </div>
    </div>
  </div>

  <!-- Primary Bottom Action -->
  <div class="pt-3 border-t border-stone-200/60">
    <button class="w-full py-3 rounded-xl bg-primary text-white font-extrabold text-sm shadow-warm-md flex items-center justify-center gap-2 hover:bg-primary-hover transition">
      SAVE & PUBLISH GIG LOG →
    </button>
  </div>
</div>
```

---

### Screen 4: User Profile & Diary (`/app/profile/page.tsx` or `profile.html` - Single Viewport)

- **Key Components**:
  - Compact header with user avatar, `@gers_tunes`, `42 Gigs`, `128 Followers`, `#4.8k Rank`, and `Edit / Share` buttons.
  - Dual pill widgets: `🔥 Live Streak: 4 Weekends` and `Soundprints: Indie / Club`.
  - 2026 Concert Goal progress bar (`50 Shows Planned • 84%`).
  - 2×2 Directory Grid: `Attended Shows (42)`, `Want to See (18)`, `Festivals (6)`, `Buddies (34)`.
  - Latest Log Card (Jamie xx at Shrine Expo Hall, `9.9` score) and top venues list (`#1 The Bellwether Top 1%`).

```html
<!-- Profile & Diary (Single Viewport Container) -->
<div class="min-h-screen bg-[#FFF8F5] text-stone-900 p-4 pb-24 font-['Epilogue',sans-serif] space-y-3">

  <!-- Profile Summary Header -->
  <div class="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-warm-sm space-y-3">
    <div class="flex items-center gap-3">
      <div class="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary">
        <img src="/avatar.jpg" alt="Alex Gerszten" class="w-full h-full object-cover"/>
        <span class="absolute bottom-0 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">+</span>
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-extrabold text-stone-900 truncate">Alex Gerszten</h1>
        <p class="text-xs text-stone-500 font-medium">@gers_tunes · 📍 Los Angeles</p>
      </div>
      <span class="text-[10px] font-bold text-stone-400">Dec 2024</span>
    </div>

    <!-- Stats & Actions Row -->
    <div class="flex items-center justify-between border-t border-stone-100 pt-2.5">
      <div class="flex gap-4 text-center">
        <div>
          <p class="text-sm font-black text-stone-900">42</p>
          <p class="text-[9px] font-bold text-stone-400 uppercase">Gigs</p>
        </div>
        <div>
          <p class="text-sm font-black text-stone-900">128</p>
          <p class="text-[9px] font-bold text-stone-400 uppercase">Followers</p>
        </div>
        <div>
          <p class="text-sm font-black text-primary">#4.8k</p>
          <p class="text-[9px] font-bold text-stone-400 uppercase">Rank</p>
        </div>
      </div>
      <div class="flex gap-1.5">
        <button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-800">Edit</button>
        <button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-800">Share</button>
      </div>
    </div>
  </div>

  <!-- Dual Stat Pills -->
  <div class="grid grid-cols-2 gap-2">
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2 shadow-warm-sm">
      <span class="text-base">🔥</span>
      <div class="min-w-0">
        <p class="text-[9px] font-bold text-stone-400 uppercase">Live Streak</p>
        <p class="text-xs font-extrabold text-stone-900 truncate">4 Weekends</p>
      </div>
    </div>
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2 shadow-warm-sm">
      <span class="text-xs font-black text-emerald-700 bg-emerald-100 px-1 rounded">96%</span>
      <div class="min-w-0">
        <p class="text-[9px] font-bold text-stone-400 uppercase">Soundprints</p>
        <p class="text-xs font-extrabold text-stone-900 truncate">Indie / Club</p>
      </div>
    </div>
  </div>

  <!-- 2026 Concert Goal -->
  <div class="p-3 bg-white rounded-xl border border-stone-200 shadow-warm-sm space-y-1.5">
    <div class="flex items-center justify-between text-xs font-bold">
      <span class="text-stone-900 flex items-center gap-1">🏆 2026 GOAL</span>
      <span class="text-primary font-black">84%</span>
    </div>
    <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
      <div class="h-full bg-primary rounded-full" style="width: 84%;"></div>
    </div>
    <div class="flex justify-between text-[10px] text-stone-500 font-medium">
      <span>42 attended <span class="text-emerald-600 font-bold">(8 to go)</span></span>
      <span>Target: 50</span>
    </div>
  </div>

  <!-- 2x2 Directory Grid -->
  <div class="grid grid-cols-2 gap-2">
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-warm-sm">
      <span class="text-xs font-bold text-stone-800">Attended Shows</span>
      <span class="text-xs font-black text-stone-900">42</span>
    </div>
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-warm-sm">
      <span class="text-xs font-bold text-stone-800">Want to See</span>
      <span class="text-xs font-black text-stone-900">18</span>
    </div>
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-warm-sm">
      <span class="text-xs font-bold text-stone-800">Festivals</span>
      <span class="text-xs font-black text-stone-900">6</span>
    </div>
    <div class="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-warm-sm">
      <span class="text-xs font-bold text-stone-800">Buddies</span>
      <span class="text-xs font-black text-stone-900">34</span>
    </div>
  </div>

  <!-- Latest Log Card -->
  <div class="p-3 bg-white rounded-xl border border-stone-200 shadow-warm-sm space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-extrabold uppercase text-stone-400 text-[10px]">Latest Log</span>
      <span class="font-bold text-primary text-[11px]">View All (42)</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-xs font-extrabold text-stone-900">Jamie xx <span class="font-normal text-stone-400 text-[10px]">In Waves</span></h4>
        <p class="text-[10px] text-stone-500">Shrine Expo Hall · Jan 24</p>
      </div>
      <div class="w-8 h-8 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center">
        9.9
      </div>
    </div>
  </div>

</div>
```
