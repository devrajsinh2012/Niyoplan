# Niyoplan Homepage Redesign: Premium 3D & Interactive Brief

This document serves as a comprehensive "Master Prompt" for an AI Web Development Agent to redesign the **Niyoplan** homepage into a high-end, professional, and visually stunning SaaS platform.

---

## 1. Project Overview
**Product:** Niyoplan (Project Execution Platform)
**Goal:** Transform the current landing page into a "top-tier" professional site that competes with industry leaders like Linear, Framer, and Vercel. 
**Key Requirements:**
- **Premium Aesthetics:** Dark mode or sophisticated glassmorphism.
- **3D Elements:** High-quality 3D abstract shapes, floating UI elements with depth, and spatial layouts.
- **Interactive Canvas:** Integration of a custom trail-animation component.
- **High-Tech Vibe:** Clean typography, micro-interactions, and bento-grid layouts.

---

## 2. Visual & Brand Identity
The redesign should follow a **"Modern High-Tech Command Center"** aesthetic.

| Element | Direction |
| :--- | :--- |
| **Color Palette** | Primary: Deep Midnight (#050505), Secondary: Electric Blue (#3B82F6), Accents: Emerald Green for "Available Now" status. |
| **Typography** | Sans-serif, high-contrast. Use **Geist** or **Inter** for a technical, clean look. Bold headings with tight tracking. |
| **Visual Style** | **Glassmorphism:** Semi-transparent cards with `backdrop-blur`. **3D Depth:** Use Z-axis offsets, drop shadows, and 3D icons. |
| **Atmosphere** | Professional, secure, and cutting-edge. |

---

## 3. Technical Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (customized for premium look)
- **Language:** TypeScript
- **Animations:** Framer Motion for scroll reveals and micro-interactions.

---

## 4. Core Integration: Interactive Canvas
You MUST integrate the following custom canvas animation into the Hero section to create a "creative playground" feel.

### Component 1: `components/ui/canvas.tsx`
This file handles the high-performance trail animation.
*(Agent: Use the logic from the provided source code involving `Line`, `Node`, and `renderCanvas` functions.)*

### Component 2: `components/hero.tsx`
The Hero section should feature:
1. **Interactive Background:** The `canvas` element should sit behind the content.
2. **Badge:** A "Introducing Dicons" style pill at the top.
3. **Headline:** "Build faster with one command center for planning, execution, and team clarity."
4. **Sub-headline:** "Niyoplan combines project dashboards, sprint visibility, documentation workflows, and secure file attachments."
5. **CTAs:** Primary "Start Project" (High-contrast) and Secondary "Book a Call" (Outline).

---

## 5. Page Structure & Content

### Section 1: The Hero (The Hook)
- **Visuals:** Floating 3D "Project Nodes" or a 3D command center illustration.
- **Interaction:** The cursor-following trail animation (from `canvas.tsx`).
- **Status:** "Available Now" green pulse indicator.

### Section 2: Feature Bento Grid (The Meat)
Replace standard cards with a **Bento Grid** layout showcasing:
1. **Smart Delivery Dashboard:** 3D UI preview of a dashboard with "depth" (layers of cards).
2. **Google Drive Integration:** 3D icon of a cloud/drive linking to project cards.
3. **Secure Team Collaboration:** Visual representation of organization-based access control.
4. **API-First Workflow:** A "code-snippet" style 3D window showing API routes.

### Section 3: Social Proof & Trust
- Clean, monochrome logo cloud of "Trusted by" companies.
- High-quality testimonial cards with subtle hover-lift effects.

### Section 4: Final CTA
- A "Gravity-defying" 3D element at the bottom.
- Large, clear "Get Started for Free" button.

---

## 6. Detailed Prompt for AI Agent Execution

> **Copy and paste the following prompt into your Web Dev AI Agent:**
>
> "You are a Senior Design Engineer. Your task is to redesign the homepage for Niyoplan (https://niyoplan.in). 
> 
> **Visual Direction:** 
> - Create a premium, dark-themed SaaS landing page. 
> - Use a 'Bento Grid' for features. 
> - Incorporate 3D abstract elements (use high-quality 3D icons or CSS-based 3D transformations). 
> - Implement 'Glassmorphism' for all UI cards (blur: 12px, opacity: 0.1, border: 1px solid white/10).
>
> **Interactive Component:**
> - Implement the `canvas.tsx` trail animation as a background for the Hero section. 
> - Ensure the animation is performance-optimized and responds to mouse/touch movements.
>
> **Content Strategy:**
> - Maintain the core messaging: 'Command center for planning, execution, and team clarity.'
> - Focus on the 4 pillars: Smart Dashboard, Google Drive Attachments, Secure Collaboration, and API Workflows.
>
> **Technical Requirements:**
> - Use Next.js, Tailwind CSS, and shadcn/ui.
> - Ensure mobile responsiveness (stack bento items on mobile).
> - Add Framer Motion 'fade-in-up' animations for all sections as they enter the viewport.
>
> **Deliverable:** 
> - Provide the full code for `Hero.tsx`, `Features.tsx`, and `Canvas.tsx`.
> - Ensure the final page looks 'expensive' and professional."

---

## 7. 3D Asset Suggestions
To achieve the "High Quality" look, use assets similar to:
- **Icons:** 3D Fluency or 3D Clay style icons.
- **Shapes:** Floating glass spheres or toruses in the background.
- **UI:** Layered "Project Cards" with `perspective` CSS properties.
