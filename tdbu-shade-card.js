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

  const VERSION = '1.2.4';
  const TAG     = 'tdbu-shade-card';

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
      this._drag   = null;   // null | { beam: 'top'|'bottom', rect: DOMRect }

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

        name             : 'Window Shade',
        show_percentages : false,
        show_controls    : false,
        step             : 5,

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

      let newTop, newBottom;

      if (this._config.entity) {
        // Single cover entity mode
        const stateObj = this._hass.states[this._config.entity];
        [newTop, newBottom] = this._readSingleEntity(stateObj);
      } else {
        // Dual entity mode
        const topState    = this._hass.states[this._config.top_entity];
        const bottomState = this._hass.states[this._config.bottom_entity];
        newTop    = this._readPosition(topState,    this._config.invert_top);
        newBottom = this._readPosition(bottomState, this._config.invert_bottom);
      }

      if (!this._ready) {
        this._top    = newTop;
        this._bottom = newBottom;
        this._renderCard();
        this._ready = true;
        return;
      }

      // Animate only when values change externally (not while user is dragging)
      if (!this._drag) {
        const changed =
          Math.abs(newTop    - this._top)    > 0.01 ||
          Math.abs(newBottom - this._bottom) > 0.01;
        if (changed) {
          this._top    = newTop;
          this._bottom = newBottom;
          this._paint(true);
        }
      }
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
    }

    /* ---- Arrow button step ------------------------------------------ */

    /**
     * Move a beam by a fixed step.
     * For the top beam  : positive delta = moves down (top value increases).
     * For the bottom beam: positive delta = moves up (bottom value increases).
     */
    _step (beam, delta) {
      if (beam === 'top') {
        this._top = Math.max(0, Math.min(this._top + delta, 100 - this._bottom));
        this._paint(true);
        this._sendToHA('top', this._top);
      } else {
        this._bottom = Math.max(0, Math.min(this._bottom + delta, 100 - this._top));
        this._paint(true);
        this._sendToHA('bottom', this._bottom);
      }
    }

    /* ---- Drag handling ---------------------------------------------- */

    _handleMove (e) {
      if (!this._drag) return;
      e.preventDefault();

      const clientY          = e.touches ? e.touches[0].clientY : e.clientY;
      const { rect, beam }   = this._drag;
      const yPct             = ((clientY - rect.top) / rect.height) * 100;

      if (beam === 'top') {
        // topValue  = yPct, clamped to [0, 100 - bottomValue]
        this._top = Math.max(0, Math.min(yPct, 100 - this._bottom));
      } else {
        // bottomBeam visual Y must stay in [topValue, 100]
        const clampedY   = Math.max(this._top, Math.min(yPct, 100));
        this._bottom     = Math.max(0, 100 - clampedY);
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
      const value = (beam === 'top') ? this._top : this._bottom;

      this._sendToHA(beam, value);
      this._drag = null;
    }

    disconnectedCallback () {
      // Always clean up global listeners
      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup',   this._onEnd);
      document.removeEventListener('touchmove', this._onMove);
      document.removeEventListener('touchend',  this._onEnd);
    }

    /* ---- Rendering -------------------------------------------------- */

    _renderCard () {
      const c  = this._config;
      const sp = c.show_percentages;
      const sc = c.show_controls;

      this.shadowRoot.innerHTML = `
        <style>
          *, *::before, *::after { box-sizing: border-box; }

          :host { display: block; }

          ha-card { padding: 16px; }

          /* ---- Card title ---- */
          .title {
            font-size  : var(--ha-card-header-font-size, 1.2em);
            font-weight: 500;
            margin     : 0 0 14px;
            color      : var(--primary-text-color);
            overflow   : hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* ---- Window container ---- */
          .shade-window {
            position    : relative;
            width       : 100%;
            aspect-ratio: 3 / 4;
            border      : 3px solid var(--divider-color, #777);
            border-bottom-width: 6px;            /* window sill */
            border-radius: 4px 4px 3px 3px;
            overflow    : hidden;
            user-select : none;
            touch-action: none;
            background  : linear-gradient(180deg,
              rgba(173, 216, 240, 0.75) 0%,
              rgba(230, 248, 255, 0.55) 100%);
            box-shadow  : inset 0 0 14px rgba(0, 0, 0, 0.08);
          }

          /* Subtle vertical window frame divider */
          .shade-window::after {
            content : '';
            position: absolute;
            top     : 0;
            bottom  : 0;
            left    : 50%;
            width   : 3px;
            background: var(--divider-color, #777);
            pointer-events: none;
            z-index : 5;
          }

          /* ---- Shade fabric ---- */
          .fabric {
            position  : absolute;
            left      : 0;
            right     : 0;
            pointer-events: none;
            z-index   : 2;
            background:
              /* horizontal weave lines */
              repeating-linear-gradient(
                0deg,
                transparent 0px, transparent 7px,
                rgba(100, 65, 15, 0.13) 7px, rgba(100, 65, 15, 0.13) 8px
              ),
              /* vertical weave lines */
              repeating-linear-gradient(
                90deg,
                transparent 0px, transparent 9px,
                rgba(100, 65, 15, 0.10) 9px, rgba(100, 65, 15, 0.10) 10px
              ),
              /* base fabric color */
              linear-gradient(180deg,
                rgba(215, 175, 100, 0.92) 0%,
                rgba(190, 148, 72, 0.92) 100%);
            box-shadow:
              0 -3px 8px rgba(0, 0, 0, 0.28),
               0  3px 8px rgba(0, 0, 0, 0.28);
          }

          /* ---- Beam (rail) ---- */
          .beam {
            position     : absolute;
            left         : 0;
            right        : 0;
            height       : 14px;
            transform    : translateY(-50%);
            background   : linear-gradient(180deg,
              #7c5530 0%,
              #a97840 35%,
              #8a6030 65%,
              #5d3d18 100%);
            border-radius: 3px;
            box-shadow   :
              0 3px 9px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.22);
            cursor       : ns-resize;
            z-index      : 10;
            touch-action : none;
          }

          /* Grip marks */
          .beam::before {
            content  : '';
            position : absolute;
            top      : 50%;
            left     : 50%;
            transform: translate(-50%, -50%);
            width    : 44%;
            height   : 2px;
            background: rgba(255, 255, 255, 0.30);
            border-radius: 1px;
            box-shadow:
              0 -5px 0 rgba(255, 255, 255, 0.15),
               0  5px 0 rgba(255, 255, 255, 0.15);
          }

          /* Percentage label on beam */
          .beam-label {
            position     : absolute;
            right        : 10px;
            top          : 50%;
            transform    : translateY(-50%);
            font-size    : 0.68em;
            font-weight  : 700;
            color        : rgba(255, 255, 255, 0.95);
            pointer-events: none;
            text-shadow  : 0 1px 3px rgba(0, 0, 0, 0.6);
            white-space  : nowrap;
          }

          /* ---- Arrow controls ---- */
          .controls {
            display              : grid;
            grid-template-columns: 1fr 1fr;
            gap                  : 12px;
            margin-top           : 12px;
          }

          .beam-ctrl {
            display       : flex;
            flex-direction: column;
            align-items   : center;
            gap           : 5px;
          }

          .ctrl-label {
            font-size  : 0.78em;
            font-weight: 500;
            color      : var(--secondary-text-color);
          }

          .btn-row {
            display    : flex;
            align-items: center;
            gap        : 8px;
          }

          .ctrl-btn {
            width      : 34px;
            height     : 34px;
            border     : none;
            border-radius: 50%;
            background : var(--primary-color, #03a9f4);
            color      : #fff;
            font-size  : 14px;
            line-height: 1;
            cursor     : pointer;
            display    : flex;
            align-items: center;
            justify-content: center;
            box-shadow : 0 2px 5px rgba(0, 0, 0, 0.22);
            transition : filter 0.15s, transform 0.1s;
            -webkit-tap-highlight-color: transparent;
          }

          .ctrl-btn:hover  { filter: brightness(1.18); }
          .ctrl-btn:active { transform: scale(0.90); filter: brightness(0.88); }

          .ctrl-pct {
            font-size  : 0.82em;
            font-weight: 500;
            color      : var(--primary-text-color);
            min-width  : 38px;
            text-align : center;
          }
        </style>

        <ha-card>
          ${c.name ? `<div class="title">${this._esc(c.name)}</div>` : ''}

          <div class="shade-window" id="win">
            <div class="fabric" id="fabric"></div>

            <div class="beam" id="top-beam">
              ${sp ? `<span class="beam-label" id="lbl-top"></span>` : ''}
            </div>

            <div class="beam" id="bot-beam">
              ${sp ? `<span class="beam-label" id="lbl-bot"></span>` : ''}
            </div>
          </div>

          ${sc ? `
          <div class="controls">
            <div class="beam-ctrl">
              <div class="ctrl-label">Top Beam</div>
              <div class="btn-row">
                <button class="ctrl-btn" id="top-up"   aria-label="Top beam up">▲</button>
                <span   class="ctrl-pct" id="pct-top"></span>
                <button class="ctrl-btn" id="top-down" aria-label="Top beam down">▼</button>
              </div>
            </div>
            <div class="beam-ctrl">
              <div class="ctrl-label">Bottom Beam</div>
              <div class="btn-row">
                <button class="ctrl-btn" id="bot-up"   aria-label="Bottom beam up">▲</button>
                <span   class="ctrl-pct" id="pct-bot"></span>
                <button class="ctrl-btn" id="bot-down" aria-label="Bottom beam down">▼</button>
              </div>
            </div>
          </div>
          ` : ''}
        </ha-card>
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
        // Top beam: ▲ = move up (topValue decreases), ▼ = move down (topValue increases)
        sr.getElementById('top-up')  ?.addEventListener('click', () => this._step('top',    -step));
        sr.getElementById('top-down')?.addEventListener('click', () => this._step('top',    +step));
        // Bottom beam: ▲ = move up (bottomValue increases), ▼ = move down (bottomValue decreases)
        sr.getElementById('bot-up')  ?.addEventListener('click', () => this._step('bottom', +step));
        sr.getElementById('bot-down')?.addEventListener('click', () => this._step('bottom', -step));
      }
    }

    /* ---- Utilities -------------------------------------------------- */

    _esc (s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
      return String(s).replace(/[&<>"]/g, c => map[c]);
    }
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
      this._hass = hass;
      this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(el => { el.hass = hass; });
    }

    _fire () {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this._config } }, bubbles: true, composed: true,
      }));
    }

    _update (patch) {
      this._config = { ...this._config, ...patch };
      this._fire();
    }

    // Creates a ha-entity-picker via document.createElement so the custom element
    // is upgraded immediately (it is already registered by HA) and properties can
    // be set synchronously before DOM insertion  no rAF timing hacks needed.
    _makePicker (id, label, domains, currentValue) {
      const el = document.createElement('ha-entity-picker');
      el.id                = id;
      el.label             = label;
      el.includeDomains    = domains;
      el.allowCustomEntity = true;
      el.value             = currentValue ?? '';
      if (this._hass) el.hass = this._hass;
      el.style.cssText = 'display:block;width:100%;margin-bottom:12px;';
      el.addEventListener('value-changed', e => {
        const val = e.detail?.value;
        if (val !== undefined) this._update({ [id]: val });
      });
      return el;
    }

    _makeSelectRow (id, label, options, currentValue) {
      const wrap = document.createElement('div');
      wrap.className = 'select-row';
      const lbl = document.createElement('span');
      lbl.className = 'select-label';
      lbl.textContent = label;
      const sel = document.createElement('select');
      sel.id = id;
      sel.className = 'native-select';
      options.forEach(([val, txt]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.text = txt; opt.selected = (val === currentValue);
        sel.appendChild(opt);
      });
      sel.addEventListener('change', e => { this._update({ [id]: e.target.value }); });
      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      return wrap;
    }

    _makeToggleRow (id, label, checked) {
      const row = document.createElement('div');
      row.className = 'toggle-row';
      const span = document.createElement('span');
      span.className = 'toggle-label';
      span.textContent = label;
      const sw = document.createElement('ha-switch');
      sw.id = id; sw.checked = !!checked;
      sw.addEventListener('change', e => { this._update({ [id]: e.target.checked }); });
      row.appendChild(span);
      row.appendChild(sw);
      return row;
    }

    _makeSection (title) {
      const div = document.createElement('div');
      div.className = 'section';
      div.textContent = title;
      return div;
    }

    _render () {
      const c    = this._config;
      const mode = ('entity' in c) ? 'single' : 'dual';
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
        .mode-tabs {
          display: flex;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px; overflow: hidden;
        }
        .mode-tab {
          flex: 1; padding: 9px 6px; border: none; background: transparent;
          cursor: pointer; font-size: 0.85em; font-family: inherit;
          color: var(--secondary-text-color);
          transition: background 0.15s, color 0.15s; line-height: 1.3;
        }
        .mode-tab + .mode-tab { border-left: 1px solid var(--divider-color, #ccc); }
        .mode-tab.active { background: var(--primary-color, #03a9f4); color: #fff; font-weight: 600; }
        .mode-tab:hover:not(.active) { background: var(--secondary-background-color, #f0f0f0); }
        .select-row { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
        .select-label { font-size: 0.78em; color: var(--secondary-text-color); padding-left: 2px; }
        .native-select {
          width: 100%; padding: 10px 12px;
          border: 1px solid var(--divider-color, #ccc); border-radius: 4px;
          background: var(--card-background-color, #fff); color: var(--primary-text-color);
          font-size: 0.9em; font-family: inherit; cursor: pointer;
        }
        .native-select:focus { outline: none; border-color: var(--primary-color, #03a9f4); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; min-height: 40px; }
        .toggle-label { font-size: 0.9em; color: var(--primary-text-color); }
        ha-textfield { display: block; width: 100%; }
      </style>`;

      const form = document.createElement('div');
      form.className = 'form';

      //  General 
      form.appendChild(this._makeSection('General'));
      const nameField = document.createElement('ha-textfield');
      nameField.id = 'name'; nameField.label = 'Card Title';
      nameField.placeholder = 'Window Shade'; nameField.value = c.name ?? 'Window Shade';
      nameField.style.cssText = 'display:block;width:100%;';
      nameField.addEventListener('change', e => {
        this._update({ name: e.target.value.trim() || 'Window Shade' });
      });
      form.appendChild(nameField);

      //  Entity Mode 
      form.appendChild(this._makeSection('Entity Mode'));
      const tabs = document.createElement('div');
      tabs.className = 'mode-tabs';
      [['dual', 'Dual entities<br>(top + bottom)'], ['single', 'Single cover<br>entity']].forEach(([val, html]) => {
        const btn = document.createElement('button');
        btn.className = 'mode-tab' + (mode === val ? ' active' : '');
        btn.dataset.mode = val;
        btn.innerHTML = html;
        btn.addEventListener('click', () => {
          if (val === (('entity' in this._config) ? 'single' : 'dual')) return;
          const next = { ...this._config };
          if (val === 'single') {
            delete next.top_entity; delete next.bottom_entity;
            next.entity           = next.entity           ?? '';
            next.top_attribute    = next.top_attribute    ?? 'position';
            next.bottom_attribute = next.bottom_attribute ?? 'tilt_position';
          } else {
            delete next.entity; delete next.top_attribute; delete next.bottom_attribute;
          }
          this._config = next; this._fire(); this._render();
        });
        tabs.appendChild(btn);
      });
      form.appendChild(tabs);

      //  Entity picker(s) 
      if (mode === 'dual') {
        form.appendChild(this._makePicker('top_entity',    'Top Beam Entity',
          ['cover', 'number', 'input_number'], c.top_entity));
        form.appendChild(this._makePicker('bottom_entity', 'Bottom Beam Entity',
          ['cover', 'number', 'input_number'], c.bottom_entity));
      } else {
        form.appendChild(this._makePicker('entity', 'Cover Entity', ['cover'], c.entity));
        form.appendChild(this._makeSelectRow('top_attribute', 'Top Beam Attribute',
          [['position','position (current_position)'],
           ['tilt_position','tilt_position (current_tilt_position)']],
          c.top_attribute ?? 'position'));
        form.appendChild(this._makeSelectRow('bottom_attribute', 'Bottom Beam Attribute',
          [['position','position (current_position)'],
           ['tilt_position','tilt_position (current_tilt_position)']],
          c.bottom_attribute ?? 'tilt_position'));
      }

      //  Display 
      form.appendChild(this._makeSection('Display'));
      form.appendChild(this._makeToggleRow('show_percentages', 'Show percentages on beams', c.show_percentages));
      form.appendChild(this._makeToggleRow('show_controls',    'Show arrow controls',       c.show_controls));
      const stepField = document.createElement('ha-textfield');
      stepField.id = 'step'; stepField.label = 'Step size for arrow controls (%)';
      stepField.type = 'number'; stepField.min = '1'; stepField.max = '50';
      stepField.value = String(c.step ?? 5);
      stepField.style.cssText = 'display:block;width:100%;';
      stepField.addEventListener('change', e => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= 1) this._update({ step: v });
      });
      form.appendChild(stepField);

      //  Direction 
      form.appendChild(this._makeSection('Direction'));
      form.appendChild(this._makeToggleRow('invert_top',    'Invert top beam direction',    c.invert_top));
      form.appendChild(this._makeToggleRow('invert_bottom', 'Invert bottom beam direction', c.invert_bottom));

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
      documentationURL: 'https://github.com/your-username/tdbu-shade-card',
    });
  }
})();
