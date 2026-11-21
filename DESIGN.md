# Die Bank für Privat- und Unternehmerkunden - Commerzbank

## Overview

**Product:** Die Bank für Privat- und Unternehmerkunden - Commerzbank
**URL:** https://www.commerzbank.de/start/
**Surface type:** marketing
**Audience:** Developers and technical decision-makers
**Brand character:** Conversion-focused marketing presence with a rich, diverse color palette and a complementary two-font typographic system.

> **Note:** Surface detection confidence is low. Verify the inferred audience and brand context before relying on this file.

### Design Principles

- Consistency over novelty — reuse existing patterns before inventing new ones.
- Token-driven — every visual decision references a token, not a magic number.
- Accessible by default — compliance is a baseline, not a feature.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-1 | `#002E3C` | Text Primary |
| color-2 | `#506C74` | Text Primary |
| color-5 | `#FFD700` | Accent |
| color-3 | `#83989F` | Border |
| color-4 | `#ACC3C7` | Background Dark |
| color-6 | `#DBE2E5` | Text Light |
| color-7 | `#FFFFFF` | Text Light |

## Typography

**Font stack:** Gotham, Times

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 13px | Captions, metadata |
| text-sm | 15px | Labels, secondary text |
| text-base | 17px | Body text (default) |
| text-lg | 22px | Subheadings, emphasis |
| text-xl | 42px | Section headings |
| text-2xl | 54px | Section headings |

**Weight scale:** 400 · 500 · 700
**Line heights:** 62px · 50px · 28px · 24px · 18.4px · 32px · 20px · 0px

## Spacing

**Base unit:** 4px

`space-1: 2px` · `space-2: 4px` · `space-3: 6px` · `space-4: 12px` · `space-5: 16px` · `space-6: 24px` · `space-7: 28px` · `space-8: 32px` · `space-9: 55px` · `space-10: 84px` · `space-11: 107px` · `space-12: 227px` · `space-13: 358px` · `space-14: 360px` · `space-15: 374px` · `space-16: 383px` · `space-17: 402px` · `space-18: 1010px`

## Shapes

**Border radius:** `radius-sm: 0px 0px 8px 8px` · `radius-md: 16px` · `radius-lg: 32px`

## Elevation

- **shadow-sm:** `rgb(255, 215, 0) 0px 0px 0px 6px, rgb(255, 199, 0) 0px 0px 0px 0.5px, rgb(255, 215, 0) 0px 0px 0px 2px, rgb(255, 215, 0) 0px 0px 0px 1px`
- **shadow-md:** `rgba(0, 0, 0, 0.4) 0px 2px 4px 1px`
- **shadow-lg:** `rgba(0, 37, 48, 0.24) 0px 2px 4px -1px`
- **shadow-xl:** `rgba(0, 37, 48, 0.36) 0px 2px 4px -1px`

## Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-fast:** `transform 0.1s`
- **duration-base:** `transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- **duration-base:** `0.24s cubic-bezier(0.1, 0, 0, 1)`
- **duration-base:** `color 0.3s ease-in-out`
- **duration-base:** `rotate 0.3s ease-in-out, color 0.3s ease-in-out, fill 0.3s ease-in-out`
- **duration-base:** `0.3s cubic-bezier(0.45, 0, 0.55, 1)`
- **duration-base:** `background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out, fill 0.3s ease-in-out, outline 0.3s ease-in-out`
- **duration-slow:** `0.5s ease-in 6 alternate bounce`
- **duration-slow:** `5s infinite backgroundColorAnim`

## Components

- **Buttons:** 30 detected
- **Links:** 66 detected
- **Navigation:** 2 elements
- **Lists:** 19 detected
- **Images:** 79 detected

## Do's and Don'ts

### Do

- Reference tokens by name, not raw values — agents and developers should use `color.text.primary`, not `#171717`.
- Define all interactive states: default, hover, focus-visible, active, disabled.
- Use the spacing scale for all padding, margin, and gap values.
- Write content in sentence case. Reserve ALL CAPS for acronyms only.
- Test every component at the smallest and largest breakpoint before shipping.

### Don't

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (0px 0px 8px 8px, 16px, 32px).
- Do not use full-uppercase text for body or paragraph content.
- Do not nest interactive elements (e.g. buttons inside links).
- Do not ship components without defining hover, focus-visible, and disabled states.

## Writing Tone

Concise, confident, implementation-focused. Avoid filler preambles.

## Authoring Workflow

When creating or updating a component guideline for this system, follow this sequence:

1. **State the intent** — one sentence on what the component does and why it exists.
2. **Map tokens** — list every color, spacing, typography, and radius token the component uses. No raw values.
3. **Define anatomy** — break the component into named parts (container, label, icon, etc.) with their token assignments.
4. **Specify states** — document every state: default, hover, focus-visible, active, disabled, loading, error, empty.
5. **Describe interactions** — keyboard, pointer, and touch behavior, including edge cases (long content, overflow, truncation).
6. **Add accessibility criteria** — write testable pass/fail checks (e.g. "focus ring must be visible at 3:1 contrast").
7. **List anti-patterns** — concrete examples of misuse with a brief explanation of why each is wrong.
8. **Close with a QA checklist** — a mechanical list of verifiable items (see Definition of Done below).

## Required Output Structure

Every component guideline produced from this system must contain these sections, in order:

1. Overview — purpose, when to use, when not to use.
2. Tokens and foundations — all referenced tokens from the tables above.
3. Anatomy and variants — named parts, variant matrix, responsive behavior.
4. States and interactions — full state table, keyboard/pointer/touch behavior.
5. Accessibility — ARIA attributes, contrast requirements, focus management, screen reader behavior.
6. Content guidelines — copy length, tone, capitalisation, placeholder text rules.
7. Anti-patterns — explicit examples of what not to build, with reasoning.

## Component Requirements

Every component built against this system must:

- Reference only tokens defined in the tables above — no hardcoded hex, px, or font values.
- Define all interactive states: default, hover, focus-visible, active, disabled, loading, error.
- Specify responsive behavior at the smallest and largest supported breakpoint.
- Handle edge cases: empty state, overflow / truncation, maximum content length.
- Include keyboard navigation (Tab, Enter, Escape, Arrow keys where applicable).
- Document ARIA roles, labels, and live-region behavior where relevant.
- Include known page component density: - **Buttons:** 30 detected
- **Links:** 66 detected
- **Navigation:** 2 elements
- **Lists:** 19 detected
- **Images:** 79 detected

## Definition of Done

A component is not complete until every item below is checked:

- Renders correctly in its default state (smoke test).
- All states documented and visually verified (hover, focus, disabled, loading, error, empty).
- All visual values use design tokens — zero hardcoded values.
- Keyboard navigation works without a pointer.
- No critical accessibility violations (contrast, ARIA, focus order).
- Tested at smallest and largest breakpoint.
- Anti-patterns section lists at least one concrete misuse example.
- Documentation covers purpose, usage, props/API, and limitations.
