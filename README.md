# TDBU Shade Card

A custom Lovelace card for Home Assistant that provides a **visual, interactive representation** of a Top-Down Bottom-Up (TDBU) shade.

---

## Overview

A TDBU shade has two independently moveable beams:

| Beam | 0 % | 100 % |
|------|-----|-------|
| **Top beam** | Fully up (at top of window) | Fully down (at bottom of window) |
| **Bottom beam** | Fully down (at bottom of window) | Fully up (at top of window) |

The shade fabric occupies the space between the two beams.

The card supports **two entity modes**:

| Mode | When to use |
|------|-------------|
| **Dual entities** | Your integration exposes a separate entity per beam (most common) |
| **Single cover entity** | One cover entity uses `position` for the top beam and `tilt_position` for the bottom beam |

The card shows a scaled window visualization with the two wooden rails and the shade fabric between them. You can **drag** either beam to change its position, use optional **arrow buttons** for precise stepping, and optionally show the **percentage** values on the beams.

---

## Features

- Scalable, responsive window visualization (CSS `aspect-ratio`)
- Draggable top and bottom beams (mouse & touch)
- Beams **cannot cross** each other — movement is constrained
- Smooth **CSS animation** when entity values change externally
- Optional **arrow-button controls** per beam (▲/▼)
- Optional **percentage display** on each beam
- Works with `cover`, `number`, and `input_number` entities
- Respects Home Assistant theme colors (`--primary-color`, etc.)

---

## Installation via HACS

1. In HACS, go to **Frontend** → click the three-dot menu → **Custom repositories**.
2. Add the URL of this repository, category **Lovelace**.
3. Install **TDBU Shade Card**.
4. Clear your browser cache / reload the HA dashboard.
5. Add the resource (HACS does this automatically):
   ```
   /hacsfiles/tdbu-shade-card/tdbu-shade-card.js
   ```

> **Version numbers & update badge**
> HACS shows a proper version number (e.g. `1.1.0`) and the update-available balloon
> as soon as the repository has a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
> with a semantic version tag (`v1.1.0`).
> The included GitHub Actions workflow (`.github/workflows/release.yaml`) creates a
> release automatically whenever you push a tag:
> ```bash
> git tag v1.2.7
> git push origin v1.2.7
> ```

### Manual installation

1. Copy `tdbu-shade-card.js` to `config/www/tdbu-shade-card/`.
2. In **Settings → Dashboards → Resources**, add:
   ```
   /local/tdbu-shade-card/tdbu-shade-card.js   (type: JavaScript module)
   ```

---

## Configuration

### Mode A — Dual entities (separate entity per beam)

```yaml
type: custom:tdbu-shade-card
name: Living Room Shade
top_entity: input_number.shade_top_position
bottom_entity: input_number.shade_bottom_position
show_percentages: false   # optional
show_controls: false      # optional
step: 5                   # optional — % per button click
```

### Mode B — Single cover entity (position + tilt)

Use this when one cover entity controls both beams via `current_position`
(top beam) and `current_tilt_position` (bottom beam).

```yaml
type: custom:tdbu-shade-card
name: Office Window
entity: cover.my_tdbu_shade
show_percentages: true
show_controls: true
step: 10
```

The default attribute mapping is:

| Beam | Reads attribute | Calls service |
|------|----------------|---------------|
| Top | `current_position` | `cover.set_cover_position` |
| Bottom | `current_tilt_position` | `cover.set_cover_tilt_position` |

If your integration uses the **opposite** attribute for a beam, override it:

```yaml
type: custom:tdbu-shade-card
entity: cover.my_tdbu_shade
top_attribute: tilt_position   # default: position
bottom_attribute: position     # default: tilt_position
```

### Inversion flags

If your integration reports values in the opposite direction (e.g. `0` means fully
extended instead of retracted), set the invert flag for that beam:

```yaml
type: custom:tdbu-shade-card
top_entity: cover.shade_top
bottom_entity: cover.shade_bottom
invert_top: true      # mirrors the top-beam value: stored = 100 - ha_value
invert_bottom: false
```

Inversion works in both dual-entity and single-entity mode.

### All configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `entity` | — | Single cover entity (alternative to dual-entity mode) |
| `top_entity` | — | Entity for the top beam |
| `bottom_entity` | — | Entity for the bottom beam |
| `name` | `'Window Shade'` | Card title |
| `show_percentages` | `false` | Show % label on each beam |
| `show_controls` | `false` | Show ▲/▼ arrow buttons below the window |
| `step` | `5` | % step size for arrow buttons |
| `top_attribute` | `'position'` | Attribute for top beam (`position` or `tilt_position`) — single entity only |
| `bottom_attribute` | `'tilt_position'` | Attribute for bottom beam — single entity only |
| `invert_top` | `false` | Invert top beam direction |
| `invert_bottom` | `false` | Invert bottom beam direction |

---

## Entity conventions

The card expects values in the range **0 – 100 %**.

| Beam | Value meaning |
|------|---------------|
| Top beam | `0` = beam at top / fully retracted upward · `100` = beam fully down |
| Bottom beam | `0` = beam at bottom / fully retracted downward · `100` = beam fully up |

> Use `invert_top` / `invert_bottom: true` when your integration reports values in the opposite direction.

### Supported domains (dual-entity mode)

| Domain | Service called |
|--------|---------------|
| `cover` | `cover.set_cover_position` with `position:` |
| `number` | `number.set_value` with `value:` |
| `input_number` | `input_number.set_value` with `value:` |

### Services called (single-entity mode)

| Attribute wins | Service called |
|----------------|---------------|
| `position` | `cover.set_cover_position` with `position:` |
| `tilt_position` | `cover.set_cover_tilt_position` with `tilt_position:` |

---

## Visual layout

```
┌─────────────────────────┐
│                         │   ← outside view (sky gradient)
│─────────────────────────│   ← top beam  (draggable wooden rail)
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│▒▒▒▒  shade fabric  ▒▒▒▒│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   ← bottom beam (draggable wooden rail)
│─────────────────────────│
│                         │   ← outside view
└─────────────────────────┘

      [ Top Beam  ] [▲] 30% [▼]      ← optional controls (show_controls: true)
      [Bottom Beam] [▲] 20% [▼]
```

---

## Changelog

### v1.2.7
- Fixed card always showing fully-open state on load: `_ready` was set to `true` **after** `_renderCard()` returned, but `_paint()` guards on `_ready` and bailed out immediately — leaving beams at default position. Fix: `_ready = true` is now set before `_renderCard()` so the initial paint executes correctly.

### v1.2.6
- Replaced `ha-entity-picker` with a native `<input type="text">` + `<datalist>` for entity selection — guarantees the picker always renders regardless of HA load order or Lit upgrade timing
- Replaced `ha-textfield` with styled native `<input>` elements
- Replaced `ha-switch` with CSS-styled native checkboxes
- Entity datalists are pre-filtered by domain and populated from `hass.states`; updated in-place when HA state changes
- Re-renders when `hass` is first received so entity lists are always populated

### v1.2.5
- Fixed missing `Register` block and IIFE closure (`})()`) that were accidentally dropped during the v1.2.4 editor rewrite — the card and editor were not registered in HA in that build

### v1.2.4
- Completely rewrote the card editor UI to build all elements programmatically via `document.createElement` instead of via `innerHTML` strings
- This fixes `ha-entity-picker` elements never rendering: when created with `createElement` the element is upgraded immediately (already registered by HA) so `hass`, `includeDomains` and `value` can be set synchronously — no deferred `requestAnimationFrame` hacks needed
- Dual mode now shows two entity pickers (top beam + bottom beam), single mode shows one cover entity picker plus attribute selects
- `set hass()` now pushes `hass` directly to all pickers in the shadow root via `querySelectorAll`

### v1.2.3
- Fixed entity pickers not appearing after selecting an entity mode in the card editor
- Root cause: empty `entity: ''` is falsy — mode is now detected via `('entity' in config)` instead of `!!config.entity`
- Entity picker properties (`hass`, `includeDomains`, `value`) are now set after two animation frames to ensure Lit upgrade has completed
- No-op guard added: clicking the already-active mode tab no longer re-renders unnecessarily

### v1.2.2
- Fixed mode selector in the card editor not responding to user interaction (replaced `ha-select`/`mwc-list-item` with reliable `<button>` tabs)
- Entity pickers now filter by domain: dual-mode pickers show `cover`, `number` and `input_number`; single-mode picker shows `cover` only
- Replaced `ha-select` attribute dropdowns with native `<select>` elements — works in all HA versions
- Improved hidden-section handling using the native `hidden` attribute instead of a CSS class

### v1.2.0
- Added **visual configuration UI** (`getConfigElement`) — all card options can now be configured through the Lovelace card editor without editing YAML manually
- Entity mode switcher (Dual / Single) in the editor dynamically shows the relevant fields
- Native HA components used in the editor: `ha-entity-picker`, `ha-select`, `ha-switch`, `ha-textfield`

### v1.1.0
- Added **single cover entity mode** (`entity:`) — one entity controls both beams via `position` (top) and `tilt_position` (bottom)
- Added per-beam inversion flags (`invert_top`, `invert_bottom`) for integrations that report inverted values
- Added configurable attribute mapping (`top_attribute`, `bottom_attribute`) for single-entity mode
- Calls `cover.set_cover_tilt_position` when the bottom beam is mapped to `tilt_position`

### v1.0.0
- Initial release
- Draggable beams with mouse and touch support
- Animated transitions for external state updates
- Arrow-button controls with configurable step
- Percentage labels on beams
- Support for dual entities: `cover`, `number`, `input_number`

---

## License

MIT — free to use, modify, and distribute.
