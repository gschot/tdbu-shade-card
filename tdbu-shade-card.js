/**
 * TDBU Shade Card for Home Assistant Lovelace
 * Visual representation of a Top-Down Bottom-Up shade with two independently
 * controllable beams. Supports dragging, arrow controls and percentage display.
 *
 * Top beam   : entity value 0 % = beam fully up, 100 % = beam fully down
 * Bottom beam: entity value 0 % = beam fully down, 100 % = beam fully up
 *
 * Entity modes:
 *   Dual   : top_entity + bottom_entity  (cover / number / input_number)
 *   Single : entity  — one cover with position (top beam) and tilt (bottom beam)
 *
 * Supported entity domains: cover, number, input_number
 */
(function () {
  'use strict';

  const VERSION = '1.5.0-beta.2';
  const TAG     = 'tdbu-shade-card';

  /* ---- Theme definitions ------------------------------------------- */
  /*
   * Each theme provides CSS variables injected into the shadow root.
   * Keys:
   *   --frame-color        window frame / border colour
   *   --frame-bg           sky / glass background (gradient or solid)
   *   --divider-color-     centre mullion override (falls back to --frame-color)
   *   --beam-bg            beam rail gradient
   *   --beam-shadow        beam box-shadow
   *   --fabric-bg          fabric CSS background (layered gradients)
   *   --fabric-shadow      fabric box-shadow
   */
  const THEMES = {
    /* Natural wood — original look */
    wood: {
      label: 'Natural Wood',
      vars: `
        --t-frame:   #6b5a3e;
        --t-glass:   linear-gradient(180deg, rgba(173,216,240,.75) 0%, rgba(230,248,255,.55) 100%);
        --t-mullion: #6b5a3e;
        --t-beam:    linear-gradient(180deg,#7c5530 0%,#a97840 35%,#8a6030 65%,#5d3d18 100%);
        --t-beam-sh: 0 3px 9px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.22);
        --t-fabric:  repeating-linear-gradient(0deg,transparent 0px,transparent 7px,rgba(100,65,15,.13) 7px,rgba(100,65,15,.13) 8px),
                     repeating-linear-gradient(90deg,transparent 0px,transparent 9px,rgba(100,65,15,.10) 9px,rgba(100,65,15,.10) 10px),
                     linear-gradient(180deg,rgba(215,175,100,.92) 0%,rgba(190,148,72,.92) 100%);
        --t-fab-sh:  0 -3px 8px rgba(0,0,0,.28),0 3px 8px rgba(0,0,0,.28);`,
    },
    /* Modern white frame with light-grey linen shade */
    modern: {
      label: 'Modern White',
      vars: `
        --t-frame:   #d0d0d0;
        --t-glass:   linear-gradient(180deg,rgba(200,230,255,.80) 0%,rgba(235,250,255,.60) 100%);
        --t-mullion: #c0c0c0;
        --t-beam:    linear-gradient(180deg,#e8e8e8 0%,#ffffff 35%,#e0e0e0 65%,#c8c8c8 100%);
        --t-beam-sh: 0 2px 7px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.80);
        --t-fabric:  repeating-linear-gradient(0deg,transparent 0px,transparent 8px,rgba(160,150,135,.10) 8px,rgba(160,150,135,.10) 9px),
                     repeating-linear-gradient(90deg,transparent 0px,transparent 10px,rgba(160,150,135,.08) 10px,rgba(160,150,135,.08) 11px),
                     linear-gradient(180deg,rgba(220,215,205,.95) 0%,rgba(200,195,182,.95) 100%);
        --t-fab-sh:  0 -2px 6px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.18);`,
    },
    /* Minimalist — frameless, white-on-white with soft shadow */
    minimal: {
      label: 'Minimal',
      vars: `
        --t-frame:   var(--divider-color,#e0e0e0);
        --t-glass:   var(--secondary-background-color,#f5f5f5);
        --t-mullion: var(--divider-color,#e0e0e0);
        --t-beam:    linear-gradient(180deg,#bdbdbd 0%,#e0e0e0 50%,#bdbdbd 100%);
        --t-beam-sh: 0 2px 6px rgba(0,0,0,.15);
        --t-fabric:  linear-gradient(180deg,rgba(189,189,189,.85) 0%,rgba(158,158,158,.85) 100%);
        --t-fab-sh:  0 -2px 5px rgba(0,0,0,.12),0 2px 5px rgba(0,0,0,.12);`,
    },
    /* Dark — slate frame, night sky, dark fabric */
    dark: {
      label: 'Dark',
      vars: `
        --t-frame:   #2a2a2a;
        --t-glass:   linear-gradient(180deg,rgba(10,20,50,.90) 0%,rgba(20,35,70,.80) 100%);
        --t-mullion: #1a1a1a;
        --t-beam:    linear-gradient(180deg,#3a3a3a 0%,#555 35%,#3a3a3a 65%,#222 100%);
        --t-beam-sh: 0 3px 9px rgba(0,0,0,.70),inset 0 1px 0 rgba(255,255,255,.10);
        --t-fabric:  repeating-linear-gradient(0deg,transparent 0px,transparent 7px,rgba(255,255,255,.04) 7px,rgba(255,255,255,.04) 8px),
                     repeating-linear-gradient(90deg,transparent 0px,transparent 9px,rgba(255,255,255,.03) 9px,rgba(255,255,255,.03) 10px),
                     linear-gradient(180deg,rgba(60,65,75,.95) 0%,rgba(40,45,55,.95) 100%);
        --t-fab-sh:  0 -3px 8px rgba(0,0,0,.60),0 3px 8px rgba(0,0,0,.60);`,
    },
  };

  /* ------------------------------------------------------------------ */
  /*  Translations                                                        */
  /* ------------------------------------------------------------------ */
  /*
   * Add a new language by copying the 'en' block and translating the values.
   * The key format is <scope>.<id>. Scope 'ui' = card runtime, 'editor' = config UI.
   * HA exposes the active language via hass.language (BCP-47, e.g. 'en', 'nl', 'de').
   */
  const TRANSLATIONS = {
    en: {
      // ── Card runtime ─────────────────────────────────────────────────
      'ui.default_name'  : 'Window Shade',
      'ui.top_beam'      : 'Top Beam',
      'ui.bottom_beam'   : 'Bottom Beam',
      'ui.top_up'        : 'Top beam up',
      'ui.top_down'      : 'Top beam down',
      'ui.bot_up'        : 'Bottom beam up',
      'ui.bot_down'      : 'Bottom beam down',
      'ui.close'         : 'Close',
      'ui.open'          : 'Open',
      'ui.top_summary'   : 'Top',
      'ui.bottom_summary': 'Bottom',
      // ── Card editor ──────────────────────────────────────────────────
      'editor.general'           : 'General',
      'editor.card_title'        : 'Card Title',
      'editor.entity_mode'       : 'Entity Mode',
      'editor.mode_dual'         : 'Dual entities<br>(top + bottom)',
      'editor.mode_single'       : 'Single cover<br>entity',
      'editor.top_entity'        : 'Top Beam Entity',
      'editor.bottom_entity'     : 'Bottom Beam Entity',
      'editor.cover_entity'      : 'Cover Entity',
      'editor.top_attribute'     : 'Top Beam Attribute',
      'editor.bottom_attribute'  : 'Bottom Beam Attribute',
      'editor.attr_position'     : 'position (current_position)',
      'editor.attr_tilt'         : 'tilt_position (current_tilt_position)',
      'editor.display'           : 'Display',
      'editor.show_percentages'  : 'Show percentages on beams',
      'editor.show_controls'     : 'Show arrow controls',
      'editor.step'              : 'Step size for arrow controls (%)',
      'editor.appearance'        : 'Appearance',
      'editor.theme'             : 'Visual Theme',
      'editor.card_height'       : 'Window height (px, leave empty for auto)',
      'editor.popup_mode'        : 'Pop-up Mode',
      'editor.popup'             : 'Show as pop-up overlay (triggered by button in card)',
      'editor.direction'         : 'Direction',
      'editor.invert_top'        : 'Invert top beam direction',
      'editor.invert_bottom'     : 'Invert bottom beam direction',
      'editor.mode_hybrid'         : 'Hybrid<br>(split control / state)',
      'editor.control_entities'    : 'Control Entities',
      'editor.state_entities'      : 'State Entities',
      'editor.state_entity'        : 'State Entity (single)',
      'editor.top_state_entity'    : 'Top Beam State Entity',
      'editor.bottom_state_entity' : 'Bottom Beam State Entity',
      'editor.sub_single'          : 'Single',
      'editor.sub_dual'            : 'Dual',
      // ── Theme labels ─────────────────────────────────────────────────
      'theme.wood'   : '🪵 Natural Wood',
      'theme.modern' : '🤍 Modern White',
      'theme.minimal': '⬜ Minimal',
      'theme.dark'   : '🌑 Dark',
    },
    nl: {
      // ── Kaartweergave ────────────────────────────────────────────────
      'ui.default_name'  : 'Raamdoek',
      'ui.top_beam'      : 'Bovenste rail',
      'ui.bottom_beam'   : 'Onderste rail',
      'ui.top_up'        : 'Bovenste rail omhoog',
      'ui.top_down'      : 'Bovenste rail omlaag',
      'ui.bot_up'        : 'Onderste rail omhoog',
      'ui.bot_down'      : 'Onderste rail omlaag',
      'ui.close'         : 'Sluiten',
      'ui.open'          : 'Openen',
      'ui.top_summary'   : 'Boven',
      'ui.bottom_summary': 'Onder',
      // ── Kaarteditor ──────────────────────────────────────────────────
      'editor.general'           : 'Algemeen',
      'editor.card_title'        : 'Kaarttitel',
      'editor.entity_mode'       : 'Entiteitsmodus',
      'editor.mode_dual'         : 'Twee entiteiten<br>(boven + onder)',
      'editor.mode_single'       : 'Enkele cover-<br>entiteit',
      'editor.top_entity'        : 'Entiteit bovenste rail',
      'editor.bottom_entity'     : 'Entiteit onderste rail',
      'editor.cover_entity'      : 'Cover-entiteit',
      'editor.top_attribute'     : 'Attribuut bovenste rail',
      'editor.bottom_attribute'  : 'Attribuut onderste rail',
      'editor.attr_position'     : 'position (current_position)',
      'editor.attr_tilt'         : 'tilt_position (current_tilt_position)',
      'editor.display'           : 'Weergave',
      'editor.show_percentages'  : 'Toon percentages op rails',
      'editor.show_controls'     : 'Toon pijlknoppen',
      'editor.step'              : 'Stapgrootte pijlknoppen (%)',
      'editor.appearance'        : 'Uiterlijk',
      'editor.theme'             : 'Visueel thema',
      'editor.card_height'       : 'Vensterhoogte (px, leeg = automatisch)',
      'editor.popup_mode'        : 'Pop-upvenster',
      'editor.popup'             : 'Toon als pop-upvenster (geactiveerd via knop in kaart)',
      'editor.direction'         : 'Richting',
      'editor.invert_top'        : 'Richting bovenste rail omkeren',
      'editor.invert_bottom'     : 'Richting onderste rail omkeren',
      'editor.mode_hybrid'         : 'Hybride<br>(gesplitst besturen/status)',
      'editor.control_entities'    : 'Besturingsentiteiten',
      'editor.state_entities'      : 'Statusentiteiten',
      'editor.state_entity'        : 'Statusentiteit (enkel)',
      'editor.top_state_entity'    : 'Statusentiteit bovenste rail',
      'editor.bottom_state_entity' : 'Statusentiteit onderste rail',
      'editor.sub_single'          : 'Enkel',
      'editor.sub_dual'            : 'Dubbel',
      // ── Thema-labels ─────────────────────────────────────────────────
      'theme.wood'   : '🪵 Natuurlijk hout',
      'theme.modern' : '🤍 Modern wit',
      'theme.minimal': '⬜ Minimaal',
      'theme.dark'   : '🌑 Donker',
    },
  };

  /**
   * Translate a key using the active HA language.
   * Falls back to English if the language is not supported or the key is missing.
   * @param {object|null} hass  HA hass object (may be null during initial config)
   * @param {string}      key   Dot-separated translation key
   */
  function t (hass, key) {
    const lang = hass?.language ?? 'en';
    const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
    return dict[key] ?? TRANSLATIONS.en[key] ?? key;
  }

  /* ------------------------------------------------------------------ */
  /*  Card class                                                          */
  /* ------------------------------------------------------------------ */
  class TDBUShadeCard extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({ mode: 'open' });

      // Internal state — coordinate system:
      //   _top    : number 0-100  (0 = beam at visual top,    100 = beam at visual bottom)
      //   _bottom : number 0-100  (0 = beam at visual bottom, 100 = beam at visual top)
      this._top    = 0;
      this._bottom = 0;
      this._ready  = false;
      this._drag        = null;   // null | { beam: 'top'|'bottom', rect: DOMRect }
      this._ghostTop        = null;   // null | 0-100  target position for top beam ghost
      this._ghostBottom     = null;   // null | 0-100  target position for bottom beam ghost
      this._ghostTopSent    = false;  // true after drag-end/step: command sent, waiting for motor
      this._ghostBottomSent = false;

      // Bound handlers kept so we can remove them later
      this._onMove = this._handleMove.bind(this);
      this._onEnd  = this._handleEnd.bind(this);
    }

    /* ---- Lovelace helpers ------------------------------------------ */

    static getStubConfig () {
      return {
        // --- Option A: single cover entity (position = top beam, tilt = bottom beam)
        // entity        : 'cover.my_tdbu_shade',

        // --- Option B: separate entity per beam
        top_entity    : 'input_number.shade_top',
        bottom_entity : 'input_number.shade_bottom',

        // --- Option C: hybrid — separate entities for control vs. state feedback
        // Control (sends commands):
        //   top_entity      : 'input_number.shade_top',
        //   bottom_entity   : 'input_number.shade_bottom',
        //     OR
        //   entity          : 'cover.my_tdbu_shade',
        //
        // State (reads position — can be different entities):
        //   top_state_entity    : 'sensor.shade_top_position',
        //   bottom_state_entity : 'sensor.shade_bottom_position',
        //     OR
        //   state_entity        : 'cover.my_tdbu_shade_feedback',

        name             : 'Window Shade',
        show_percentages : false,
        show_controls    : false,
        step             : 5,
        theme            : 'wood',   // 'wood' | 'modern' | 'minimal' | 'dark'
        card_height      : null,     // null = auto | number = fixed px height of window area
        popup            : false,    // true = floating overlay / pop-up card

        // Invert a beam's percentage direction if your integration is reversed:
        // invert_top   : false,
        // invert_bottom: false,
      };
    }

    static getConfigElement () {
      return document.createElement('tdbu-shade-card-editor');
    }

    getCardSize () {
      return this._config?.show_controls ? 12 : 10;
    }

    /* ---- Configuration --------------------------------------------- */

    setConfig (config) {
      const hasSingle = !!config.entity;
      const hasDual   = !!(config.top_entity && config.bottom_entity);
      if (!hasSingle && !hasDual) {
        throw new Error(
          '[tdbu-shade-card] Provide either "entity" (single cover) ' +
          'or both "top_entity" and "bottom_entity"'
        );
      }

      this._config = {
        name             : 'Window Shade',
        show_percentages : false,
        show_controls    : false,
        step             : 5,
        theme            : 'wood',      // 'wood' | 'modern' | 'minimal' | 'dark'
        card_height      : null,        // null = auto aspect-ratio 3:4 | number = px height of window area
        popup            : false,       // when true: card acts as a pop-up trigger/overlay
        // Single-entity attribute mapping (override if your integration differs)
        top_attribute    : 'position',       // reads current_position
        bottom_attribute : 'tilt_position',  // reads current_tilt_position
        invert_top       : false,
        invert_bottom    : false,
        ...config,
      };

      // Re-render when config is updated after first render
      if (this._ready) {
        this._ready = false;
        if (this._hass) this._applyHass();
      }
    }

    /* ---- Home Assistant state updates -------------------------------- */

    set hass (hass) {
      this._hass = hass;
      this._applyHass();
    }

    _applyHass () {
      if (!this._config || !this._hass) return;

      const [newTop, newBottom] = this._readState();

      if (!this._ready) {
        this._top    = newTop;
        this._bottom = newBottom;
        this._ready  = true;    // must be true before _renderCard so _paint() doesn't bail out
        this._renderCard();
        return;
      }

      // Always track actual entity positions
      const changed =
        Math.abs(newTop    - this._top)    > 0.01 ||
        Math.abs(newBottom - this._bottom) > 0.01;

      this._top    = newTop;
      this._bottom = newBottom;

      // Clear ghost when actual position has reached the ghost target (not during drag)
      if (!this._drag) {
        const tol = 2;
        let ghostCleared = false;
        if (this._ghostTop !== null && Math.abs(newTop - this._ghostTop) <= tol) {
          this._ghostTop    = null;
          this._ghostTopSent = false;
          ghostCleared = true;
        }
        if (this._ghostBottom !== null && Math.abs(newBottom - this._ghostBottom) <= tol) {
          this._ghostBottom     = null;
          this._ghostBottomSent = false;
          ghostCleared = true;
        }
        if (changed || ghostCleared) {
          this._paint(changed);
        }
      }
    }

    /* ---- Read state (with optional hybrid overrides) ----------------- */

    /**
     * Return [topVal, bottomVal] by reading from state entities when configured
     * (hybrid mode), otherwise falling back to the control entities.
     *
     * State entity precedence (per beam):
     *   1. top_state_entity / bottom_state_entity  — individual dual sensors
     *   2. state_entity                            — single cover/sensor for both beams
     *   3. control entity/entities                 — existing behaviour (non-hybrid)
     */
    _readState () {
      const c = this._config;
      const h = this._hass;
      const hasStateOverride = !!(c.state_entity || c.top_state_entity || c.bottom_state_entity);

      if (hasStateOverride) {
        // ── Top beam ──────────────────────────────────────────────────
        let topVal;
        if (c.top_state_entity) {
          topVal = this._readPosition(h.states[c.top_state_entity], c.invert_top);
        } else if (c.state_entity) {
          [topVal] = this._readSingleEntity(h.states[c.state_entity]);
        } else if (c.entity) {
          [topVal] = this._readSingleEntity(h.states[c.entity]);
        } else {
          topVal = this._readPosition(h.states[c.top_entity], c.invert_top);
        }

        // ── Bottom beam ───────────────────────────────────────────────
        let botVal;
        if (c.bottom_state_entity) {
          botVal = this._readPosition(h.states[c.bottom_state_entity], c.invert_bottom);
        } else if (c.state_entity) {
          [, botVal] = this._readSingleEntity(h.states[c.state_entity]);
        } else if (c.entity) {
          [, botVal] = this._readSingleEntity(h.states[c.entity]);
        } else {
          botVal = this._readPosition(h.states[c.bottom_entity], c.invert_bottom);
        }

        return [topVal ?? 0, botVal ?? 0];
      }

      // ── Non-hybrid: state == control entities (original behaviour) ──
      if (c.entity) {
        return this._readSingleEntity(h.states[c.entity]);
      }
      return [
        this._readPosition(h.states[c.top_entity],    c.invert_top),
        this._readPosition(h.states[c.bottom_entity], c.invert_bottom),
      ];
    }

    /* ---- Read entity values ------------------------------------------ */

    /**
     * Read a numeric 0-100 position from a state object.
     * Works for cover (current_position attribute), number, and input_number.
     * @param {object}  stateObj  HA state object
     * @param {boolean} invert    When true, returns (100 - value)
     */
    _readPosition (stateObj, invert = false) {
      if (!stateObj) return 0;
      let v;
      if (stateObj.attributes && stateObj.attributes.current_position != null) {
        v = Number(stateObj.attributes.current_position);
      } else {
        v = parseFloat(stateObj.state);
      }
      v = isNaN(v) ? 0 : Math.min(100, Math.max(0, v));
      return invert ? (100 - v) : v;
    }

    /**
     * Read both beam values from a single cover entity.
     * Returns [topValue, bottomValue] in internal 0-100 coordinates.
     */
    _readSingleEntity (stateObj) {
      const c = this._config;
      if (!stateObj) return [0, 0];

      const rawTop = (c.top_attribute === 'tilt_position')
        ? (stateObj.attributes?.current_tilt_position ?? 0)
        : (stateObj.attributes?.current_position     ?? 0);

      const rawBot = (c.bottom_attribute === 'tilt_position')
        ? (stateObj.attributes?.current_tilt_position ?? 0)
        : (stateObj.attributes?.current_position     ?? 0);

      const topVal = Math.min(100, Math.max(0, Number(rawTop)));
      const botVal = Math.min(100, Math.max(0, Number(rawBot)));

      return [
        c.invert_top    ? (100 - topVal) : topVal,
        c.invert_bottom ? (100 - botVal) : botVal,
      ];
    }

    /* ---- Send value to Home Assistant --------------------------------- */

    /**
     * Send an updated beam value to Home Assistant.
     * @param {'top'|'bottom'} beam         Which beam changed
     * @param {number}         internalVal  Internal 0-100 value
     */
    _sendToHA (beam, internalVal) {
      if (!this._hass) return;
      const c = this._config;
      const v = Math.round(internalVal);

      if (c.entity) {
        // ---- Single cover entity mode --------------------------------
        const isBottom = (beam === 'bottom');
        const attribute = isBottom ? c.bottom_attribute : c.top_attribute;
        const invert    = isBottom ? c.invert_bottom    : c.invert_top;
        const haVal     = invert ? (100 - v) : v;

        if (attribute === 'tilt_position') {
          this._hass.callService('cover', 'set_cover_tilt_position', {
            entity_id    : c.entity,
            tilt_position: haVal,
          });
        } else {
          this._hass.callService('cover', 'set_cover_position', {
            entity_id: c.entity,
            position : haVal,
          });
        }
      } else {
        // ---- Dual entity mode ----------------------------------------
        const entityId = (beam === 'top') ? c.top_entity : c.bottom_entity;
        const invert   = (beam === 'top') ? c.invert_top : c.invert_bottom;
        const haVal    = invert ? (100 - v) : v;
        const domain   = entityId.split('.')[0];

        if (domain === 'cover') {
          this._hass.callService('cover', 'set_cover_position', {
            entity_id: entityId,
            position : haVal,
          });
        } else if (domain === 'number' || domain === 'input_number') {
          this._hass.callService(domain, 'set_value', {
            entity_id: entityId,
            value    : haVal,
          });
        } else {
          this._hass.callService('input_number', 'set_value', {
            entity_id: entityId,
            value    : haVal,
          });
        }
      }
    }

    /* ---- Visual update ---------------------------------------------- */

    /**
     * Re-positions beams and fabric to match _top / _bottom.
     * @param {boolean} animate  When true, uses CSS transitions.
     */
    _paint (animate = false) {
      const sr = this.shadowRoot;
      if (!sr || !this._ready) return;

      const topBeam = sr.getElementById('top-beam');
      const botBeam = sr.getElementById('bot-beam');
      const fabric  = sr.getElementById('fabric');
      if (!topBeam) return;

      // Visual Y positions (% from top of window)
      const topY  = this._top;            // 0 = top,    100 = bottom
      const botY  = 100 - this._bottom;   // 0 = top,    100 = bottom
      const fabH  = Math.max(0, botY - topY);

      const dur = animate ? '0.45s' : '0s';
      const ease = 'ease';

      topBeam.style.transition = `top ${dur} ${ease}`;
      botBeam.style.transition = `top ${dur} ${ease}`;
      fabric.style.transition  = `top ${dur} ${ease}, height ${dur} ${ease}`;

      topBeam.style.top    = `${topY}%`;
      botBeam.style.top    = `${botY}%`;
      fabric.style.top     = `${topY}%`;
      fabric.style.height  = `${fabH}%`;

      // Ghost beams (drag / step target indicators)
      const topGhost = sr.getElementById('top-beam-ghost');
      const botGhost = sr.getElementById('bot-beam-ghost');
      if (topGhost) {
        if (this._ghostTop !== null) {
          topGhost.style.display = 'block';
          topGhost.style.top     = `${this._ghostTop}%`;
          topGhost.classList.toggle('sent', this._ghostTopSent);
        } else {
          topGhost.style.display = 'none';
        }
      }
      if (botGhost) {
        if (this._ghostBottom !== null) {
          botGhost.style.display = 'block';
          botGhost.style.top     = `${100 - this._ghostBottom}%`;
          botGhost.classList.toggle('sent', this._ghostBottomSent);
        } else {
          botGhost.style.display = 'none';
        }
      }

      // Percentage labels on beams (show_percentages)
      const lblTop = sr.getElementById('lbl-top');
      const lblBot = sr.getElementById('lbl-bot');
      if (lblTop) lblTop.textContent = `${Math.round(this._top)}%`;
      if (lblBot) lblBot.textContent = `${Math.round(this._bottom)}%`;

      // Percentages in the controls section
      const pctTop = sr.getElementById('pct-top');
      const pctBot = sr.getElementById('pct-bot');
      if (pctTop) pctTop.textContent = `${Math.round(this._top)}%`;
      if (pctBot) pctBot.textContent = `${Math.round(this._bottom)}%`;

      // Popup trigger bar summary
      const trigPct = sr.getElementById('trigger-pct');
      if (trigPct) trigPct.textContent = `${this._t('ui.top_summary')}: ${Math.round(this._top)}%  ·  ${this._t('ui.bottom_summary')}: ${Math.round(this._bottom)}%`;
    }

    /* ---- Arrow button step ------------------------------------------ */

    /**
     * Move a beam by a fixed step.
     * For the top beam  : positive delta = moves down (top value increases).
     * For the bottom beam: positive delta = moves up (bottom value increases).
     */
    _step (beam, delta) {
      if (beam === 'top') {
        const cur = this._ghostTop ?? this._top;
        this._ghostTop     = Math.max(0, Math.min(cur + delta, 100 - (this._ghostBottom ?? this._bottom)));
        this._ghostTopSent = true;   // command sent immediately on click
        this._paint(false);
        this._sendToHA('top', this._ghostTop);
      } else {
        const cur = this._ghostBottom ?? this._bottom;
        this._ghostBottom     = Math.max(0, Math.min(cur + delta, 100 - (this._ghostTop ?? this._top)));
        this._ghostBottomSent = true;   // command sent immediately on click
        this._paint(false);
        this._sendToHA('bottom', this._ghostBottom);
      }
    }

    /* ---- Drag handling ---------------------------------------------- */

    _handleMove (e) {
      if (!this._drag) return;
      e.preventDefault();

      const clientY        = e.touches ? e.touches[0].clientY : e.clientY;
      const { rect, beam } = this._drag;
      const yPct           = ((clientY - rect.top) / rect.height) * 100;

      if (beam === 'top') {
        // Ghost top clamped to [0, visual-bottom of bottom beam]
        const botLimit = this._ghostBottom !== null ? this._ghostBottom : this._bottom;
        this._ghostTop     = Math.max(0, Math.min(yPct, 100 - botLimit));
        this._ghostTopSent = false;   // actively dragging — keep pulsing
      } else {
        // Ghost bottom: visual Y must stay in [visual-top of top beam, 100]
        const topLimit = this._ghostTop !== null ? this._ghostTop : this._top;
        const clampedY = Math.max(topLimit, Math.min(yPct, 100));
        this._ghostBottom     = Math.max(0, 100 - clampedY);
        this._ghostBottomSent = false;   // actively dragging — keep pulsing
      }

      this._paint(false);
    }

    _handleEnd () {
      if (!this._drag) return;

      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup',   this._onEnd);
      document.removeEventListener('touchmove', this._onMove);
      document.removeEventListener('touchend',  this._onEnd);

      const beam  = this._drag.beam;
      // Send the ghost (target) position; fall back to actual if ghost was never set
      const value = (beam === 'top')
        ? (this._ghostTop    ?? this._top)
        : (this._ghostBottom ?? this._bottom);

      // Mark ghost as sent: stop pulsing, beam is on its way
      if (beam === 'top')    this._ghostTopSent    = true;
      else                   this._ghostBottomSent = true;

      this._sendToHA(beam, value);
      this._drag = null;
      this._paint(false);   // immediately show non-pulsing ghost
    }

    disconnectedCallback () {
      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup',   this._onEnd);
      document.removeEventListener('touchmove', this._onMove);
      document.removeEventListener('touchend',  this._onEnd);
      if (this._onEsc) document.removeEventListener('keydown', this._onEsc);
    }

    /* ---- Rendering -------------------------------------------------- */

    _renderCard () {
      const c  = this._config;
      const sp = c.show_percentages;
      const sc = c.show_controls;

      // Resolve theme CSS variables (fall back to 'wood' for unknown themes)
      const themeVars = (THEMES[c.theme] ?? THEMES.wood).vars;

      // Window height: either fixed px (card_height) or responsive aspect-ratio
      const winHeightStyle = c.card_height
        ? `height:${Number(c.card_height)}px; aspect-ratio:unset;`
        : `aspect-ratio:3/4;`;

      this.shadowRoot.innerHTML = `
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          :host { display: block; }

          /* ---- Theme variables ---- */
          :host {
            ${themeVars}
          }

          ha-card { padding: 16px; }

          /* ---- Card title ---- */
          .title {
            font-size    : var(--ha-card-header-font-size, 1.2em);
            font-weight  : 500;
            margin       : 0 0 14px;
            color        : var(--primary-text-color);
            overflow     : hidden;
            text-overflow: ellipsis;
            white-space  : nowrap;
            ${c.popup ? 'cursor:pointer; user-select:none;' : ''}
          }
          ${c.popup ? '.title:hover { opacity: 0.75; }' : ''}

          /* ---- Popup overlay ---- */
          .popup-backdrop {
            position  : fixed;
            inset     : 0;
            background: rgba(0,0,0,0.55);
            z-index   : 1000;
            display   : flex;
            align-items: center;
            justify-content: center;
            opacity   : 0;
            pointer-events: none;
            transition: opacity 0.2s;
          }
          .popup-backdrop.open {
            opacity       : 1;
            pointer-events: all;
          }
          .popup-box {
            background   : var(--ha-card-background, var(--card-background-color, #fff));
            border-radius: var(--ha-card-border-radius, 12px);
            box-shadow   : 0 8px 32px rgba(0,0,0,0.4);
            padding      : 20px;
            width        : min(420px, 92vw);
            max-height   : 90vh;
            overflow-y   : auto;
            position     : relative;
          }
          .popup-close {
            position    : absolute;
            top         : 10px;
            right       : 12px;
            background  : transparent;
            border      : none;
            font-size   : 1.3em;
            cursor      : pointer;
            color       : var(--secondary-text-color);
            line-height : 1;
            padding     : 4px 8px;
            border-radius: 4px;
          }
          .popup-close:hover { background: var(--secondary-background-color,#eee); }
          .popup-title {
            font-size  : 1.1em;
            font-weight: 600;
            margin     : 0 0 14px;
            color      : var(--primary-text-color);
            padding-right: 32px;
          }

          /* ---- Trigger button (shown in card when popup:true) ---- */
          .popup-trigger {
            display    : flex;
            align-items: center;
            gap        : 10px;
            padding    : 12px 16px;
            border     : 1px solid var(--divider-color, #ddd);
            border-radius: 8px;
            cursor     : pointer;
            background : transparent;
            width      : 100%;
            font-size  : 0.95em;
            color      : var(--primary-text-color);
            font-family: inherit;
            transition : background 0.15s;
          }
          .popup-trigger:hover { background: var(--secondary-background-color,#f5f5f5); }
          .popup-trigger-icon { font-size: 1.4em; }
          .popup-trigger-info { text-align: left; }
          .popup-trigger-name { font-weight: 600; }
          .popup-trigger-pct  { font-size: 0.82em; color: var(--secondary-text-color); }

          /* ---- Window container ---- */
          .shade-window {
            position    : relative;
            width       : 100%;
            ${winHeightStyle}
            border      : 3px solid var(--t-frame, #777);
            border-bottom-width: 6px;
            border-radius: 4px 4px 3px 3px;
            overflow    : hidden;
            user-select : none;
            touch-action: none;
            background  : var(--t-glass, linear-gradient(180deg,rgba(173,216,240,.75) 0%,rgba(230,248,255,.55) 100%));
            box-shadow  : inset 0 0 14px rgba(0,0,0,0.08);
          }

          /* Centre mullion */
          .shade-window::after {
            content   : '';
            position  : absolute;
            top       : 0; bottom: 0;
            left      : 50%;
            width     : 3px;
            background: var(--t-mullion, var(--t-frame, #777));
            pointer-events: none;
            z-index   : 5;
          }

          /* ---- Shade fabric ---- */
          .fabric {
            position      : absolute;
            left : 0; right: 0;
            pointer-events: none;
            z-index       : 2;
            background    : var(--t-fabric);
            box-shadow    : var(--t-fab-sh);
          }

          /* ---- Beam (rail) ---- */
          .beam {
            position     : absolute;
            left: 0; right: 0;
            height       : 14px;
            transform    : translateY(-50%);
            background   : var(--t-beam);
            border-radius: 3px;
            box-shadow   : var(--t-beam-sh);
            cursor       : ns-resize;
            z-index      : 10;
            touch-action : none;
          }
          .beam::before {
            content  : '';
            position : absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width    : 44%;
            height   : 2px;
            background: rgba(255,255,255,0.30);
            border-radius: 1px;
            box-shadow: 0 -5px 0 rgba(255,255,255,.15), 0 5px 0 rgba(255,255,255,.15);
          }

          /* Percentage label on beam */
          .beam-label {
            position      : absolute;
            right         : 10px;
            top           : 50%;
            transform     : translateY(-50%);
            font-size     : 0.68em;
            font-weight   : 700;
            color         : rgba(255,255,255,0.95);
            pointer-events: none;
            text-shadow   : 0 1px 3px rgba(0,0,0,0.6);
            white-space   : nowrap;
          }

          /* ---- Arrow controls ---- */
          .controls {
            display              : grid;
            grid-template-columns: 1fr 1fr;
            gap                  : 12px;
            margin-top           : 12px;
          }
          .beam-ctrl { display: flex; flex-direction: column; align-items: center; gap: 5px; }
          .ctrl-label { font-size: 0.78em; font-weight: 500; color: var(--secondary-text-color); }
          .btn-row { display: flex; align-items: center; gap: 8px; }
          .ctrl-btn {
            width: 34px; height: 34px;
            border: none; border-radius: 50%;
            background: var(--primary-color, #03a9f4);
            color: #fff; font-size: 14px; line-height: 1;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,.22);
            transition: filter 0.15s, transform 0.1s;
            -webkit-tap-highlight-color: transparent;
          }
          .ctrl-btn:hover  { filter: brightness(1.18); }
          .ctrl-btn:active { transform: scale(0.90); filter: brightness(0.88); }
          .ctrl-pct { font-size: 0.82em; font-weight: 500; color: var(--primary-text-color); min-width: 38px; text-align: center; }

          /* ---- Ghost beam (drag / step target indicator) ---- */
          .ghost-beam {
            display        : none;
            pointer-events : none;
            cursor         : default;
            z-index        : 8;
            opacity        : 0.50;
            outline        : 2px dashed rgba(255,255,255,0.80);
            outline-offset : 3px;
            animation      : ghost-pulse 1.5s ease-in-out infinite;
          }
          @keyframes ghost-pulse {
            0%, 100% { opacity: 0.50; }
            50%       { opacity: 0.25; }
          }
          /* Sent state: command transmitted, motor moving — no pulse, solid outline */
          .ghost-beam.sent {
            animation    : none;
            opacity      : 0.40;
            outline-style: solid;
          }
        </style>

        ${c.popup ? `
        <!-- ═══ Pop-up overlay (hidden until opened) ═══ -->
        <div class="popup-backdrop" id="popup-backdrop">
          <div class="popup-box">
            <button class="popup-close" id="popup-close" aria-label="${this._t('ui.close')}">✕</button>
            ${c.name ? `<div class="popup-title">${this._esc(c.name)}</div>` : ''}
            <div class="shade-window" id="win">
              <div class="fabric" id="fabric"></div>
              <div class="beam ghost-beam" id="top-beam-ghost"></div>
              <div class="beam ghost-beam" id="bot-beam-ghost"></div>
              <div class="beam" id="top-beam">${sp ? `<span class="beam-label" id="lbl-top"></span>` : ''}</div>
              <div class="beam" id="bot-beam">${sp ? `<span class="beam-label" id="lbl-bot"></span>` : ''}</div>
            </div>
            ${sc ? `
            <div class="controls">
              <div class="beam-ctrl">
                <div class="ctrl-label">${this._t('ui.top_beam')}</div>
                <div class="btn-row">
                  <button class="ctrl-btn" id="top-up"   aria-label="${this._t('ui.top_up')}">▲</button>
                  <span   class="ctrl-pct" id="pct-top"></span>
                  <button class="ctrl-btn" id="top-down" aria-label="${this._t('ui.top_down')}">▼</button>
                </div>
              </div>
              <div class="beam-ctrl">
                <div class="ctrl-label">${this._t('ui.bottom_beam')}</div>
                <div class="btn-row">
                  <button class="ctrl-btn" id="bot-up"   aria-label="${this._t('ui.bot_up')}">▲</button>
                  <span   class="ctrl-pct" id="pct-bot"></span>
                  <button class="ctrl-btn" id="bot-down" aria-label="${this._t('ui.bot_down')}">▼</button>
                </div>
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- ═══ Trigger button shown in the card ════ -->
        <ha-card>
          <button class="popup-trigger" id="popup-open" aria-label="${this._t('ui.open')} ${this._esc(c.name || this._t('ui.default_name'))}">
            <span class="popup-trigger-icon">🪟</span>
            <span class="popup-trigger-info">
              <span class="popup-trigger-name">${this._esc(c.name || this._t('ui.default_name'))}</span><br>
              <span class="popup-trigger-pct" id="trigger-pct">${this._t('ui.top_summary')}: —  ${this._t('ui.bottom_summary')}: —</span>
            </span>
          </button>
        </ha-card>
        ` : `
        <!-- ═══ Normal inline card ═══ -->
        <ha-card>
          ${c.name ? `<div class="title">${this._esc(c.name)}</div>` : ''}
          <div class="shade-window" id="win">
            <div class="fabric" id="fabric"></div>
            <div class="beam ghost-beam" id="top-beam-ghost"></div>
            <div class="beam ghost-beam" id="bot-beam-ghost"></div>
            <div class="beam" id="top-beam">${sp ? `<span class="beam-label" id="lbl-top"></span>` : ''}</div>
            <div class="beam" id="bot-beam">${sp ? `<span class="beam-label" id="lbl-bot"></span>` : ''}</div>
          </div>
          ${sc ? `
          <div class="controls">
            <div class="beam-ctrl">
              <div class="ctrl-label">${this._t('ui.top_beam')}</div>
              <div class="btn-row">
                <button class="ctrl-btn" id="top-up"   aria-label="${this._t('ui.top_up')}">▲</button>
                <span   class="ctrl-pct" id="pct-top"></span>
                <button class="ctrl-btn" id="top-down" aria-label="${this._t('ui.top_down')}">▼</button>
              </div>
            </div>
            <div class="beam-ctrl">
              <div class="ctrl-label">${this._t('ui.bottom_beam')}</div>
              <div class="btn-row">
                <button class="ctrl-btn" id="bot-up"   aria-label="${this._t('ui.bot_up')}">▲</button>
                <span   class="ctrl-pct" id="pct-bot"></span>
                <button class="ctrl-btn" id="bot-down" aria-label="${this._t('ui.bot_down')}">▼</button>
              </div>
            </div>
          </div>` : ''}
        </ha-card>
        `}
      `;

      this._wire();
      this._paint(false);
    }

    /* ---- Attach event listeners after render ----------------------- */

    _wire () {
      const sr  = this.shadowRoot;
      const win = sr.getElementById('win');
      const tb  = sr.getElementById('top-beam');
      const bb  = sr.getElementById('bot-beam');
      if (!win || !tb || !bb) return;

      const startDrag = (beam) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._drag = { beam, rect: win.getBoundingClientRect() };
        document.addEventListener('mousemove', this._onMove);
        document.addEventListener('mouseup',   this._onEnd);
        document.addEventListener('touchmove', this._onMove, { passive: false });
        document.addEventListener('touchend',  this._onEnd);
      };

      tb.addEventListener('mousedown',  startDrag('top'));
      tb.addEventListener('touchstart', startDrag('top'),    { passive: false });
      bb.addEventListener('mousedown',  startDrag('bottom'));
      bb.addEventListener('touchstart', startDrag('bottom'), { passive: false });

      if (this._config.show_controls) {
        const step = Number(this._config.step) || 5;
        sr.getElementById('top-up')  ?.addEventListener('click', () => this._step('top',    -step));
        sr.getElementById('top-down')?.addEventListener('click', () => this._step('top',    +step));
        sr.getElementById('bot-up')  ?.addEventListener('click', () => this._step('bottom', +step));
        sr.getElementById('bot-down')?.addEventListener('click', () => this._step('bottom', -step));
      }

      // ── Popup wiring ──────────────────────────────────────────────────
      if (this._config.popup) {
        const backdrop = sr.getElementById('popup-backdrop');
        const openBtn  = sr.getElementById('popup-open');
        const closeBtn = sr.getElementById('popup-close');

        const openPopup = () => {
          backdrop?.classList.add('open');
          // Recalculate drag rect after popup layout is painted
          requestAnimationFrame(() => { this._drag = null; });
        };
        const closePopup = (e) => {
          // Close when clicking the backdrop itself (not the box inside)
          if (e && e.target !== backdrop) return;
          backdrop?.classList.remove('open');
        };
        const closePopupDirect = () => backdrop?.classList.remove('open');

        openBtn?.addEventListener('click',  openPopup);
        closeBtn?.addEventListener('click', closePopupDirect);
        backdrop?.addEventListener('click', closePopup);

        // Close on Escape key
        this._onEsc = (e) => { if (e.key === 'Escape') closePopupDirect(); };
        document.addEventListener('keydown', this._onEsc);
      }
    }

    /* ---- Utilities -------------------------------------------------- */

    _esc (s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
      return String(s).replace(/[&<>"]/g, c => map[c]);
    }

    _t (key) { return t(this._hass, key); }
  }

  /* ------------------------------------------------------------------ */
  /*  Editor class                                                        */
  /* ------------------------------------------------------------------ */

  const EDITOR_TAG = 'tdbu-shade-card-editor';

  class TDBUShadeCardEditor extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = {};
      this._hass   = null;
    }

    setConfig (config) {
      this._config = { ...config };
      this._render();
    }

    set hass (hass) {
      const wasNull = !this._hass;
      this._hass = hass;
      if (wasNull) {
        // First time hass arrives: re-render so entity datalists are populated
        this._render();
      } else {
        // Subsequent HA state updates: refresh datalists in-place (no full re-render)
        this._refreshDataLists();
      }
    }

    _t (key) { return t(this._hass, key); }

    _fire () {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this._config } }, bubbles: true, composed: true,
      }));
    }

    _update (patch) {
      this._config = { ...this._config, ...patch };
      this._fire();
    }

    /* ---- Entity picker: native <input list="..."> + <datalist> -------
     * Avoids ha-entity-picker entirely — that Lit component can silently
     * render as nothing when its async upgrade hasn't completed yet.
     * Native HTML always works, regardless of HA version or load order.
     * ------------------------------------------------------------------ */
    _makePickerRow (id, label, domains, currentValue) {
      const wrap   = document.createElement('div');
      wrap.className = 'field-row';

      const lbl   = document.createElement('label');
      lbl.className   = 'field-label';
      lbl.htmlFor     = id;
      lbl.textContent = label;

      const listId = `${id}-list`;
      const input  = document.createElement('input');
      input.type        = 'text';
      input.id          = id;
      input.className   = 'entity-input';
      input.value       = currentValue ?? '';
      input.placeholder = 'domain.entity_id';
      input.setAttribute('list', listId);
      input.setAttribute('autocomplete', 'off');
      input.dataset.domains = JSON.stringify(domains);
      input.addEventListener('change', e => {
        this._update({ [id]: e.target.value.trim() });
      });

      const dl = document.createElement('datalist');
      dl.id = listId;
      this._fillDataList(dl, domains);

      wrap.appendChild(lbl);
      wrap.appendChild(input);
      wrap.appendChild(dl);
      return wrap;
    }

    _fillDataList (dl, domains) {
      dl.innerHTML = '';
      if (!this._hass) return;
      Object.keys(this._hass.states)
        .filter(id => domains.some(d => id.startsWith(d + '.')))
        .sort()
        .forEach(entityId => {
          const opt  = document.createElement('option');
          opt.value  = entityId;
          const name = this._hass.states[entityId]?.attributes?.friendly_name;
          if (name) opt.label = name;
          dl.appendChild(opt);
        });
    }

    _refreshDataLists () {
      this.shadowRoot.querySelectorAll('input[data-domains]').forEach(input => {
        const dl = this.shadowRoot.getElementById(`${input.id}-list`);
        if (dl) this._fillDataList(dl, JSON.parse(input.dataset.domains));
      });
    }

    /* ---- Text / number input row ------------------------------------- */

    _makeTextField (id, label, type, currentValue, opts) {
      const o    = opts ?? {};
      const wrap = document.createElement('div');
      wrap.className = 'field-row';

      const lbl = document.createElement('label');
      lbl.className   = 'field-label';
      lbl.htmlFor     = id;
      lbl.textContent = label;

      const input = document.createElement('input');
      input.type      = type ?? 'text';
      input.id        = id;
      input.className = 'text-input';
      input.value     = String(currentValue ?? '');
      if (o.placeholder !== undefined) input.placeholder = o.placeholder;
      if (o.min         !== undefined) input.min         = String(o.min);
      if (o.max         !== undefined) input.max         = String(o.max);
      input.addEventListener('change', e => {
        if (type === 'number') {
          const raw = e.target.value.trim();
          if (raw === '') {
            // Empty means "use default / null"
            const next = { ...this._config };
            delete next[id];
            this._config = next;
            this._fire();
          } else {
            const v = parseInt(raw, 10);
            if (!isNaN(v) && v >= (o.min ?? -Infinity)) this._update({ [id]: v });
          }
        } else {
          this._update({ [id]: e.target.value.trim() || (o.fallback ?? '') });
        }
      });

      wrap.appendChild(lbl);
      wrap.appendChild(input);
      return wrap;
    }

    /* ---- Native <select> row ----------------------------------------- */

    _makeSelectRow (id, label, options, currentValue) {
      const wrap = document.createElement('div');
      wrap.className = 'field-row';

      const lbl = document.createElement('label');
      lbl.className   = 'field-label';
      lbl.htmlFor     = id;
      lbl.textContent = label;

      const sel = document.createElement('select');
      sel.id        = id;
      sel.className = 'native-select';
      options.forEach(([val, txt]) => {
        const opt    = document.createElement('option');
        opt.value    = val;
        opt.text     = txt;
        opt.selected = (val === currentValue);
        sel.appendChild(opt);
      });
      sel.addEventListener('change', e => { this._update({ [id]: e.target.value }); });

      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      return wrap;
    }

    /* ---- Toggle row (CSS-styled native checkbox) --------------------- */

    _makeToggleRow (id, label, checked) {
      // Wrapping label makes the whole row clickable — no JS needed for toggle
      const row  = document.createElement('label');
      row.className = 'toggle-row';

      const span = document.createElement('span');
      span.className   = 'toggle-label';
      span.textContent = label;

      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.id        = id;
      cb.className = 'toggle-cb';
      cb.checked   = !!checked;
      cb.addEventListener('change', e => { this._update({ [id]: e.target.checked }); });

      const track = document.createElement('span');
      track.className = 'toggle-track';

      row.appendChild(span);
      row.appendChild(cb);
      row.appendChild(track);
      return row;
    }

    /* ---- Sub-tabs (smaller variant for use inside sections) ---------- */

    /**
     * @param {Array<[string, string]>} items    [[value, label], ...]
     * @param {string}                  active   Currently active value
     * @param {function}                onChange Called with the new value when a tab is clicked
     */
    _makeSubTabs (items, active, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'sub-tabs';
      items.forEach(([val, label]) => {
        const btn       = document.createElement('button');
        btn.className   = 'sub-tab' + (active === val ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => { if (active !== val) onChange(val); });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    /* ---- Section heading --------------------------------------------- */

    _makeSection (title) {
      const div = document.createElement('div');
      div.className   = 'section';
      div.textContent = title;
      return div;
    }

    /* ---- Render ------------------------------------------------------ */

    _render () {
      const c    = this._config;
      // Mode detection:
      //   hybrid  — state entities are explicitly configured (separate from control)
      //   single  — one cover entity handles both control and state
      //   dual    — two entities handle both control and state
      const mode = (c.state_entity !== undefined || c.top_state_entity !== undefined || c.bottom_state_entity !== undefined)
        ? 'hybrid'
        : (('entity' in c) ? 'single' : 'dual');
      const sr   = this.shadowRoot;

      sr.innerHTML = `<style>
        :host { display: block; }
        .form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
        .section {
          font-size: 0.72em; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--secondary-text-color);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          padding-bottom: 4px; margin-top: 4px;
        }
        /* Mode tabs */
        .mode-tabs { display: flex; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; overflow: hidden; }
        .mode-tab {
          flex: 1; padding: 9px 6px; border: none; background: transparent;
          cursor: pointer; font-size: 0.85em; font-family: inherit;
          color: var(--secondary-text-color);
          transition: background 0.15s, color 0.15s; line-height: 1.3;
        }
        .mode-tab + .mode-tab { border-left: 1px solid var(--divider-color, #ccc); }
        .mode-tab.active { background: var(--primary-color, #03a9f4); color: #fff; font-weight: 600; }
        .mode-tab:hover:not(.active) { background: var(--secondary-background-color, #f0f0f0); }
        /* Sub-tabs (control/state within hybrid mode) */
        .sub-tabs { display: flex; border: 1px solid var(--divider-color, #ccc); border-radius: 4px; overflow: hidden; margin-top: 2px; }
        .sub-tab {
          flex: 1; padding: 6px 4px; border: none; background: transparent;
          cursor: pointer; font-size: 0.78em; font-family: inherit;
          color: var(--secondary-text-color);
          transition: background 0.15s, color 0.15s;
        }
        .sub-tab + .sub-tab { border-left: 1px solid var(--divider-color, #ccc); }
        .sub-tab.active { background: var(--accent-color, var(--primary-color, #03a9f4)); color: #fff; font-weight: 600; opacity: 0.85; }
        .sub-tab:hover:not(.active) { background: var(--secondary-background-color, #f0f0f0); }
        /* Field rows */
        .field-row { display: flex; flex-direction: column; gap: 4px; }
        .field-label { font-size: 0.78em; color: var(--secondary-text-color); padding-left: 2px; }
        .entity-input, .text-input, .native-select {
          width: 100%; padding: 10px 12px; box-sizing: border-box;
          border: 1px solid var(--divider-color, #ccc); border-radius: 4px;
          background: var(--card-background-color, #fff); color: var(--primary-text-color);
          font-size: 0.9em; font-family: inherit;
        }
        .entity-input, .text-input { cursor: text; }
        .native-select { cursor: pointer; }
        .entity-input:focus, .text-input:focus, .native-select:focus {
          outline: none; border-color: var(--primary-color, #03a9f4);
        }
        /* Toggle (CSS checkbox) */
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          min-height: 40px; cursor: pointer; user-select: none;
        }
        .toggle-label { font-size: 0.9em; color: var(--primary-text-color); flex: 1; }
        .toggle-cb { display: none; }
        .toggle-track {
          width: 36px; height: 20px; border-radius: 10px; flex-shrink: 0;
          background: var(--disabled-color, #bbb); position: relative;
          transition: background 0.2s;
        }
        .toggle-track::after {
          content: ''; position: absolute; top: 2px; left: 2px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .toggle-cb:checked ~ .toggle-track { background: var(--primary-color, #03a9f4); }
        .toggle-cb:checked ~ .toggle-track::after { transform: translateX(16px); }
      </style>`;

      const form = document.createElement('div');
      form.className = 'form';

      // ── General ──────────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.general')));
      form.appendChild(this._makeTextField('name', this._t('editor.card_title'), 'text',
        c.name ?? 'Window Shade',
        { placeholder: 'Window Shade', fallback: 'Window Shade' }));

      // ── Entity Mode ───────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.entity_mode')));
      const tabs = document.createElement('div');
      tabs.className = 'mode-tabs';
      [
        ['dual',   this._t('editor.mode_dual')],
        ['single', this._t('editor.mode_single')],
        ['hybrid', this._t('editor.mode_hybrid')],
      ].forEach(([val, html]) => {
        const btn        = document.createElement('button');
        btn.className    = 'mode-tab' + (mode === val ? ' active' : '');
        btn.dataset.mode = val;
        btn.innerHTML    = html;
        btn.addEventListener('click', () => {
          const currentMode = (this._config.state_entity !== undefined ||
                               this._config.top_state_entity !== undefined ||
                               this._config.bottom_state_entity !== undefined)
            ? 'hybrid'
            : (('entity' in this._config) ? 'single' : 'dual');
          if (val === currentMode) return;
          const next = { ...this._config };
          // Strip all entity-related keys; rebuild for chosen mode
          delete next.entity; delete next.top_entity; delete next.bottom_entity;
          delete next.top_attribute; delete next.bottom_attribute;
          delete next.state_entity; delete next.top_state_entity; delete next.bottom_state_entity;
          if (val === 'single') {
            next.entity           = this._config.entity           ?? '';
            next.top_attribute    = this._config.top_attribute    ?? 'position';
            next.bottom_attribute = this._config.bottom_attribute ?? 'tilt_position';
          } else if (val === 'dual') {
            next.top_entity    = this._config.top_entity    ?? '';
            next.bottom_entity = this._config.bottom_entity ?? '';
          } else {
            // hybrid — restore control entities, add empty state entities
            if ('entity' in this._config || currentMode === 'single') {
              next.entity           = this._config.entity           ?? '';
              next.top_attribute    = this._config.top_attribute    ?? 'position';
              next.bottom_attribute = this._config.bottom_attribute ?? 'tilt_position';
              next.state_entity     = '';
            } else {
              next.top_entity          = this._config.top_entity    ?? '';
              next.bottom_entity       = this._config.bottom_entity ?? '';
              next.top_state_entity    = '';
              next.bottom_state_entity = '';
            }
          }
          this._config = next; this._fire(); this._render();
        });
        tabs.appendChild(btn);
      });
      form.appendChild(tabs);

      // ── Entity picker(s) ─────────────────────────────────────────────
      if (mode === 'dual') {
        form.appendChild(this._makePickerRow('top_entity',    this._t('editor.top_entity'),
          ['cover', 'number', 'input_number'], c.top_entity));
        form.appendChild(this._makePickerRow('bottom_entity', this._t('editor.bottom_entity'),
          ['cover', 'number', 'input_number'], c.bottom_entity));
      } else if (mode === 'single') {
        form.appendChild(this._makePickerRow('entity', this._t('editor.cover_entity'), ['cover'], c.entity));
        form.appendChild(this._makeSelectRow('top_attribute', this._t('editor.top_attribute'),
          [['position',      this._t('editor.attr_position')],
           ['tilt_position', this._t('editor.attr_tilt')]],
          c.top_attribute ?? 'position'));
        form.appendChild(this._makeSelectRow('bottom_attribute', this._t('editor.bottom_attribute'),
          [['position',      this._t('editor.attr_position')],
           ['tilt_position', this._t('editor.attr_tilt')]],
          c.bottom_attribute ?? 'tilt_position'));
      } else {
        // ── Hybrid mode ───────────────────────────────────────────────
        const ctrlMode  = ('entity' in c) ? 'single' : 'dual';
        const stateMode = ('state_entity' in c) ? 'single' : 'dual';

        // — Control sub-section —
        form.appendChild(this._makeSection(this._t('editor.control_entities')));
        form.appendChild(this._makeSubTabs(
          [['single', this._t('editor.sub_single')], ['dual', this._t('editor.sub_dual')]],
          ctrlMode,
          (newCtrl) => {
            const next = { ...this._config };
            if (newCtrl === 'single') {
              delete next.top_entity; delete next.bottom_entity;
              next.entity           = next.entity           ?? '';
              next.top_attribute    = next.top_attribute    ?? 'position';
              next.bottom_attribute = next.bottom_attribute ?? 'tilt_position';
            } else {
              delete next.entity; delete next.top_attribute; delete next.bottom_attribute;
              next.top_entity    = next.top_entity    ?? '';
              next.bottom_entity = next.bottom_entity ?? '';
            }
            this._config = next; this._fire(); this._render();
          },
        ));

        if (ctrlMode === 'single') {
          form.appendChild(this._makePickerRow('entity', this._t('editor.cover_entity'), ['cover'], c.entity));
          form.appendChild(this._makeSelectRow('top_attribute', this._t('editor.top_attribute'),
            [['position',      this._t('editor.attr_position')],
             ['tilt_position', this._t('editor.attr_tilt')]],
            c.top_attribute ?? 'position'));
          form.appendChild(this._makeSelectRow('bottom_attribute', this._t('editor.bottom_attribute'),
            [['position',      this._t('editor.attr_position')],
             ['tilt_position', this._t('editor.attr_tilt')]],
            c.bottom_attribute ?? 'tilt_position'));
        } else {
          form.appendChild(this._makePickerRow('top_entity',    this._t('editor.top_entity'),
            ['cover', 'number', 'input_number'], c.top_entity));
          form.appendChild(this._makePickerRow('bottom_entity', this._t('editor.bottom_entity'),
            ['cover', 'number', 'input_number'], c.bottom_entity));
        }

        // — State sub-section —
        form.appendChild(this._makeSection(this._t('editor.state_entities')));
        form.appendChild(this._makeSubTabs(
          [['single', this._t('editor.sub_single')], ['dual', this._t('editor.sub_dual')]],
          stateMode,
          (newState) => {
            const next = { ...this._config };
            if (newState === 'single') {
              delete next.top_state_entity; delete next.bottom_state_entity;
              next.state_entity = next.state_entity ?? '';
            } else {
              delete next.state_entity;
              next.top_state_entity    = next.top_state_entity    ?? '';
              next.bottom_state_entity = next.bottom_state_entity ?? '';
            }
            this._config = next; this._fire(); this._render();
          },
        ));

        if (stateMode === 'single') {
          form.appendChild(this._makePickerRow('state_entity', this._t('editor.state_entity'),
            ['cover', 'number', 'input_number', 'sensor'], c.state_entity));
        } else {
          form.appendChild(this._makePickerRow('top_state_entity', this._t('editor.top_state_entity'),
            ['cover', 'number', 'input_number', 'sensor'], c.top_state_entity));
          form.appendChild(this._makePickerRow('bottom_state_entity', this._t('editor.bottom_state_entity'),
            ['cover', 'number', 'input_number', 'sensor'], c.bottom_state_entity));
        }
      }

      // ── Display ───────────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.display')));
      form.appendChild(this._makeToggleRow('show_percentages', this._t('editor.show_percentages'), c.show_percentages));
      form.appendChild(this._makeToggleRow('show_controls',    this._t('editor.show_controls'),    c.show_controls));
      form.appendChild(this._makeTextField('step', this._t('editor.step'), 'number',
        c.step ?? 5, { min: 1, max: 50 }));

      // ── Appearance ────────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.appearance')));
      form.appendChild(this._makeSelectRow('theme', this._t('editor.theme'),
        [['wood',    this._t('theme.wood')],
         ['modern',  this._t('theme.modern')],
         ['minimal', this._t('theme.minimal')],
         ['dark',    this._t('theme.dark')]],
        c.theme ?? 'wood'));
      form.appendChild(this._makeTextField('card_height', this._t('editor.card_height'), 'number',
        c.card_height ?? '', { min: 80, max: 1200, placeholder: 'auto' }));

      // ── Pop-up ────────────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.popup_mode')));
      form.appendChild(this._makeToggleRow('popup', this._t('editor.popup'), c.popup));

      // ── Direction ─────────────────────────────────────────────────────
      form.appendChild(this._makeSection(this._t('editor.direction')));
      form.appendChild(this._makeToggleRow('invert_top',    this._t('editor.invert_top'),    c.invert_top));
      form.appendChild(this._makeToggleRow('invert_bottom', this._t('editor.invert_bottom'), c.invert_bottom));

      sr.appendChild(form);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Register                                                            */
  /* ------------------------------------------------------------------ */

  if (!customElements.get(EDITOR_TAG)) {
    customElements.define(EDITOR_TAG, TDBUShadeCardEditor);
  }

  if (!customElements.get(TAG)) {
    customElements.define(TAG, TDBUShadeCard);
    console.info(
      `%c TDBU-SHADE-CARD %c v${VERSION} `,
      'color: orange; font-weight: bold; background: #000',
      'color: #fff;    font-weight: bold; background: #555',
    );
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.some(c => c.type === TAG)) {
    window.customCards.push({
      type            : TAG,
      name            : 'TDBU Shade Card',
      description     : 'Visual card for Top-Down Bottom-Up (TDBU) shades with interactive draggable beams',
      preview         : true,
      documentationURL: 'https://github.com/gschot/tdbu-shade-card',
    });
  }
})();
