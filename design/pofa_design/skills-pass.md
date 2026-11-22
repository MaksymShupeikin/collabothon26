# Skills pass — audit and plan

Skills studied: obra/superpowers, nextlevelbuilder/ui-ux-pro-max-skill, pbakaus/impeccable, Leonxlnx/taste-skill.
Their scripts were NOT run (downloaded third-party code). Rules were applied by hand from their reference files:
impeccable `craft-floor.md`, `operate.md`, `polish.md`; ui-ux-pro-max `quick-reference.md` and its fintech / financial-dashboard data rows.
taste-skill targets marketing websites (Persuade mode); this app is Operate mode, so only its shared rules apply
(one system, one button style, equal edges, quiet hover feedback, no violet).

Mode: **Operate** (impeccable). Product type: **Financial dashboard + educational app** (ui-ux-pro-max):
dark + data-dense + Swiss minimalism for trading; restrained colour; accent only for primary action, selection, state.

## Audit findings → fix

| # | Finding | Rule | Fix |
|---|---|---|---|
| 1 | Selected watchlist row uses a 3px yellow bar on one side | impeccable ban: one-sided bar | Full tint + bold text, no side bar |
| 2 | Concept card has a 6px yellow top border | same ban | Remove; flat page, pill carries the topic |
| 3 | ✓ ✗ ↑ ↓ glyphs used as icons (history, path, rivals) | impeccable: no unicode glyphs as icons; ui-ux `no-emoji-icons` | Inline SVG icons, one stroke weight |
| 4 | Browser surfaces unthemed (selection, caret, scrollbars) | impeccable craft-floor "Browser surfaces" | `::selection`, `caret-color`, `scrollbar-color` from palette |
| 5 | Small buttons ~26px tall on phones | ui-ux `touch-target-size` 44px | Min 44px for controls under 700px |
| 6 | No reduced-motion handling | ui-ux `reduced-motion` | `prefers-reduced-motion` rule |
| 7 | Quantity is a bare number field | mockup 01 stepper; ui-ux `touch-friendly-input` | − / + stepper around the field |
| 8 | Clock shows "Week 2 of 24", no sense of progress | mockup 01 "Day 12 of 120" + bar | Day counter + thin yellow progress |
| 9 | Learn page: two boxed cards, quiz as plain buttons, dark "next" link | mockup 03; impeccable "cards are the lazy container"; ui-ux `primary-action` | Flat column, topic pill "Basics · 1/5", radio rows, yellow "Next card" |
| 10 | Font falls back to Helvetica (Gotham not shipped) | impeccable: source a face; operate: one family | Load Figtree (geometric, close to Gotham) via next/font |
| 11 | Design page has a kicker above the h1 | impeccable ban: eyebrow | Remove |

Kept on purpose: news has no Signal/Noise tags before the reveal (the game is to spot the signal; tags would give it away).

## Verify
Chrome desktop 1280 + phone 375: simulator, home, learn, history. tsc clean, eslint no new errors.
