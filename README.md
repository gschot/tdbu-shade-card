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

### Manual installation

1. Copy `tdbu-shade-card.js` to `config/www/tdbu-shade-card/`.
2. In **Settings → Dashboards → Resources**, add:
   ```
   /local/tdbu-shade-card/tdbu-shade-card.js   (type: JavaScript module)
   ```

---

## Configuration

```yaml
type: custom:tdbu-shade-card
name: Living Room Shade        # optional — card title
top_entity: input_number.shade_top_position
bottom_entity: input_number.shade_bottom_position
show_percentages: false        # optional — show % on each beam (default: false)
show_controls: false           # optional — show ▲/▼ arrow buttons (default: false)
step: 5                        # optional — % step size for arrow buttons (default: 5)
```

### Full example

```yaml
type: custom:tdbu-shade-card
name: Office Window
top_entity: number.office_shade_top
bottom_entity: number.office_shade_bottom
show_percentages: true
show_controls: true
step: 10
```

---

## Entity conventions

The card expects the entity **state** (or `current_position` attribute for `cover` entities) to hold a value in the range **0 – 100 %**.

| Entity | Value meaning |
|--------|---------------|
| `top_entity` | `0` = beam at top / fully retracted upward · `100` = beam fully down |
| `bottom_entity` | `0` = beam at bottom / fully retracted downward · `100` = beam fully up |

### Supported domains

| Domain | Service called |
|--------|---------------|
| `cover` | `cover.set_cover_position` with `position:` |
| `number` | `number.set_value` with `value:` |
| `input_number` | `input_number.set_value` with `value:` |

If your integration uses a different domain or inverted values, create a
[Template Number](https://www.home-assistant.io/integrations/template/#number) entity to adapt the values before passing them to this card.

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

### v1.0.0
- Initial release
- Draggable beams with mouse and touch support
- Animated transitions for external state updates
- Arrow-button controls with configurable step
- Percentage labels on beams
- Support for `cover`, `number`, `input_number` entities

---

## License

MIT — free to use, modify, and distribute.
