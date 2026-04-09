# TDBU Shade Card

![TDBU Shade Card animated overview](https://raw.githubusercontent.com/gschot/tdbu-shade-card/master/assets/overview.svg)

A custom Lovelace card for Home Assistant that provides a **visual, interactive representation** of a Top-Down Bottom-Up (TDBU) shade.

---

## Overview

A TDBU shade has two independently moveable beams:

| Beam | 0 % | 100 % |
|------|-----|-------|
| **Top beam** | Fully up (at top of window) | Fully down (at bottom of window) |
| **Bottom beam** | Fully down (at bottom of window) | Fully up (at top of window) |

The shade fabric occupies the space between the two beams.

The card supports **three entity modes**:

| Mode | When to use |
|------|-------------|
| **Dual entities** | Your integration exposes a separate entity per beam (most common) |
| **Single cover entity** | One cover entity uses `position` for the top beam and `tilt_position` for the bottom beam |
| **Hybrid** | Control (sending commands) and state feedback (reading position) use different entities |

The card shows a scaled window visualization with the two wooden rails and the shade fabric between them. You can **drag** either beam to change its position, use optional **arrow buttons** for precise stepping, and optionally show the **percentage** values on the beams.

---

## Features

- Scalable, responsive window visualization (CSS `aspect-ratio`)
- Draggable top and bottom beams (mouse & touch)
- Beams **cannot cross** each other — movement is constrained
- Smooth **CSS animation** when entity values change externally
- Optional **arrow-button controls** per beam (▲/▼)
- **Ghost slider** for interactive beam positioning (drag & arrow-button)
- Optional **percentage display** on each beam
- Works with `cover`, `number`, `input_number`, and `sensor` entities
- **Hybrid mode** — send commands to one entity set, read position feedback from a different entity set
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

### Mode C — Hybrid (separate control and state entities)

Use this when the entity you send commands to differs from the entity that reflects
the actual position (e.g. a KNX actuator address vs. a feedback sensor).

```yaml
type: custom:tdbu-shade-card
# Control — used for drag/button commands
top_entity: input_number.shade_top
bottom_entity: input_number.shade_bottom
# State — used to read the actual position (can be different entities)
top_state_entity: sensor.shade_top_position
bottom_state_entity: sensor.shade_bottom_position
```

You can also mix **single** control with **dual** state (or any combination):

```yaml
type: custom:tdbu-shade-card
# Single cover entity for control
entity: cover.my_tdbu_shade
# Single cover entity for state feedback (different entity)
state_entity: cover.my_tdbu_shade_feedback
```

State entity reading priority per beam:
1. `top_state_entity` / `bottom_state_entity` — individual sensors per beam
2. `state_entity` — one cover/sensor for both beams
3. Falls back to the control entity when no state entity is configured

---

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
| `state_entity` | — | Hybrid: single entity to *read* position for both beams (overrides control entity for state) |
| `top_state_entity` | — | Hybrid: entity to *read* top beam position |
| `bottom_state_entity` | — | Hybrid: entity to *read* bottom beam position |
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

> **Hybrid mode state entities** additionally support `sensor` (read-only; position is taken from the numeric state value).

### Services called (single-entity mode)

| Attribute wins | Service called |
|----------------|---------------|
| `position` | `cover.set_cover_position` with `position:` |
| `tilt_position` | `cover.set_cover_tilt_position` with `tilt_position:` |

---

## Visual themes

Four built-in themes, selectable via `theme:` or the visual editor:

![Natural Wood](https://raw.githubusercontent.com/gschot/tdbu-shade-card/master/assets/theme-wood.svg)
![Modern White](https://raw.githubusercontent.com/gschot/tdbu-shade-card/master/assets/theme-modern.svg)
![Minimal](https://raw.githubusercontent.com/gschot/tdbu-shade-card/master/assets/theme-minimal.svg)
![Dark](https://raw.githubusercontent.com/gschot/tdbu-shade-card/master/assets/theme-dark.svg)

| Key | Description |
|-----|-------------|
| `wood` *(default)* | Natural wood frame, sky-blue glass, golden woven fabric |
| `modern` | White aluminium frame, light-sky glass, beige linen fabric |
| `minimal` | Frameless grey-on-grey, blends into light HA themes |
| `dark` | Slate frame, night-sky glass, dark charcoal fabric |

---

## Changelog

### v1.5.1-beta.1
- **Bug fix:** `touchcancel` event (triggered by notifications, system gestures or scroll interruption) was not handled — the drag state became permanently stuck until the page was reloaded. A new `_handleCancel` handler now correctly clears the drag without sending a spurious position command.
- **Bug fix:** tapping a beam without moving it caused `_ghostTopSent` / `_ghostBottomSent` to remain `true` indefinitely (ghost was never allocated so `_applyHass` could never clear the flag). The sent-flag is now only written when a ghost position actually exists.
- **Optimisation:** in hybrid mode, when both beams share the same `state_entity` or `entity`, `_readSingleEntity` was called twice per update. The result is now cached within each `_applyHass` call via a local `Map`.
- **Refactor:** duplicated mode-detection ternary in the card editor is now a shared `_detectMode(cfg)` helper.

### v1.5.0
- **Ghost slider** — when dragging a beam or using the arrow buttons, a semi-transparent ghost beam appears at the target position while the actual beam keeps reflecting the current entity value
  - Ghost **pulses** (dashed outline animation) while the user is dragging, indicating the beam has not been released yet
  - Ghost **stops pulsing** (solid outline) after the command is sent, indicating the motor is on its way
  - Ghost **disappears** automatically once the entity reports that the actual beam has reached the target position (within 2 %)
  - When `show_percentages` is enabled, the target percentage is also shown on the ghost beam
- Version bump to **1.5.0**

### v1.4.0
- **Hybrid entity mode** — control (sending commands) and state feedback (reading position) can now use completely different entities
  - `state_entity` — single cover/sensor whose position is used for both beam display updates
  - `top_state_entity` / `bottom_state_entity` — individual sensors per beam for full flexibility
  - All combinations work: single-entity control + dual-sensor state, dual-entity control + single-sensor state, etc.
  - State entities support `cover`, `number`, `input_number`, and `sensor` domains
- New **Hybrid** tab in the visual card editor with separate sub-tabs for **Control** (Single / Dual) and **State** (Single / Dual)
- Version bump to **1.4.0**

### v1.3.1
- **Multi-language support** — all card UI strings (beam labels, aria-labels, trigger summary) and all editor UI strings (section headers, field labels, mode tabs, theme names) are now translated at runtime using Home Assistant's active language (`hass.language`)
- Supported languages: **English** (`en`) and **Dutch** (`nl`). Adding more languages requires only a new entry in the `TRANSLATIONS` constant.
- Falls back to English for unsupported languages or missing keys

### v1.3.0
- **Visual Themes** — choose from four built-in styles via `theme:` config or the UI editor:
  - `wood` (default) — natural wood frame, sky glass, golden fabric
  - `modern` — white aluminium frame, light linen fabric
  - `minimal` — borderless, grey-on-grey
  - `dark` — slate frame, night sky, dark fabric
- **Resizable** — set `card_height:` (px) to fix the window height; leave empty for the default responsive 3:4 aspect ratio
- **Pop-up mode** — set `popup: true` to collapse the card into a small trigger button; clicking it opens a floating overlay with the full shade control. Closes on ✕ button, backdrop click, or Escape key.
- All three new options are available in the visual card editor (Appearance and Pop-up sections)

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
