import {createElement as h, useState, useRef, useCallback, useEffect} from 'react';
import {host, Button, Codicon, ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA} from '@hermes/plugin-sdk';

// Hermes Newsroom runs locally as the omarchy-command-center user service.
// This plugin only frames that page; it holds no data and calls no backend.
export const PAGE_PATH = '/newsroom';
export const NEWSROOM_URL = 'http://127.0.0.1:3520/newsroom';
export const NEWSROOM_ORIGIN = 'http://127.0.0.1:3520';
const SERVICE = 'omarchy-command-center.service';

// Newsroom token -> the Hermes variable it follows.
const THEME = /** @type {const} */ ({
  bg: '--ui-bg-base',
  raised: '--ui-bg-elevated',
  panel: '--ui-bg-elevated',
  panel2: '--ui-bg-hover',
  panel3: '--ui-bg-hover',
  line: '--ui-stroke-secondary',
  lineStrong: '--ui-stroke-primary',
  text: '--ui-text-primary',
  text2: '--ui-text-secondary',
  text3: '--ui-text-tertiary',
  accent: '--ui-accent',
  accentStrong: '--ui-accent-secondary',
  shellBar: '--ui-bg-base',
  shellPill: '--ui-bg-hover',
  // Categorical signal colours stay distinct from the accent, but come from the
  // host's semantic palette so the whole page belongs to one theme.
  cyan: '--ui-cyan',
  purple: '--ui-purple',
  amber: '--ui-yellow',
  red: '--ui-red',
  blue: '--ui-blue',
});

/** Resolve Hermes theme variables to plain rgb() plus the UI font stack.
 * A probe element does the resolving, so `color-mix(...)`, `var(...)` chains and
 * theme switches all arrive at the frame as literal colours. */
export function hermesTheme(doc = globalThis.document) {
  /** @type {Record<string,string>} */
  const theme = {};
  if (!doc?.body) return theme;
  const probe = doc.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
  doc.body.appendChild(probe);
  try {
    for (const [key, variable] of Object.entries(THEME)) {
      probe.style.color = '';
      probe.style.color = `var(${variable})`;
      const value = doc.defaultView?.getComputedStyle(probe).color ?? '';
      if (/^rgba?\(/.test(value)) theme[key] = value;
    }
    const font = doc.defaultView?.getComputedStyle(doc.body).fontFamily ?? '';
    if (/^[A-Za-z0-9 ,'"._-]{1,200}$/.test(font)) theme.fontUi = font;
  } finally {
    probe.remove();
  }
  return theme;
}

/** @param {Record<string,string>} theme */
export function themedUrl(theme, url = NEWSROOM_URL) {
  const params = new URLSearchParams({embed: 'hermes', ...theme});
  return `${url}?${params.toString()}`;
}

/** @param {{url?:string}} props */
export function NewsroomPage({url = NEWSROOM_URL}) {
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);
  const frame = useRef(/** @type {HTMLIFrameElement|null} */ (null));
  // Theme only on (re)mount: the src must not change underneath a live page.
  const [src] = useState(() => themedUrl(hermesTheme(), url));
  const reload = useCallback(() => {
    setFailed(false);
    setNonce(n => n + 1);
  }, []);
  // Palette "Newsroom: Reload" reaches the mounted page through this event.
  useEffect(() => {
    const onReload = () => reload();
    globalThis.addEventListener?.('hermes-newsroom:reload', onReload);
    return () => globalThis.removeEventListener?.('hermes-newsroom:reload', onReload);
  }, [reload]);
  // Follow later Hermes theme changes without reloading the frame.
  useEffect(() => {
    const doc = globalThis.document;
    if (!doc || typeof MutationObserver === 'undefined') return;
    let timer = 0;
    const push = () => {
      const target = frame.current?.contentWindow;
      if (target) target.postMessage({type: 'hermes-theme', theme: hermesTheme(doc)}, NEWSROOM_ORIGIN);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(push, 150);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(doc.documentElement, {attributes: true, attributeFilter: ['class', 'style', 'data-theme']});
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [nonce]);
  return h('div', {style: {display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--ui-bg-base)'}},
    failed
      ? h('div', {role: 'alert', style: {padding: '18px 16px', fontSize: '13px', lineHeight: 1.6, color: 'var(--ui-text-primary)'}},
          h('p', {style: {margin: '0 0 6px'}}, 'Newsroom could not be loaded.'),
          h('p', {style: {margin: '0 0 6px'}}, `It is served locally by ${SERVICE}. Start or check it, then press Reload.`),
          h('pre', {style: {margin: '0 0 10px', fontFamily: 'ui-monospace, monospace', fontSize: '12px'}}, `systemctl --user status ${SERVICE}`),
          h(Button, {variant: 'outline', size: 'sm', onClick: reload}, 'Reload'))
      : h('iframe', {
          key: nonce,
          ref: frame,
          src,
          title: 'Hermes Newsroom',
          onError: () => setFailed(true),
          // Local-only page: no downloads, popups, or top-level navigation out of the frame.
          sandbox: 'allow-scripts allow-same-origin allow-forms',
          style: {flex: 1, width: '100%', border: 0, background: 'var(--ui-bg-base)'},
        }));
}

function NewsroomStatus() {
  return h('button', {
    className: 'inline-flex items-center gap-1 rounded px-1.5 text-xs text-(--ui-text-secondary) hover:bg-(--ui-bg-hover)',
    'aria-label': 'Open Hermes Newsroom', title: 'Hermes Newsroom',
    onClick: () => host.navigate(PAGE_PATH),
  }, h(Codicon, {name: 'radio-tower'}), 'Newsroom');
}

export default {
  id: 'hermes-newsroom', name: 'Hermes Newsroom', defaultEnabled: true,
  description: 'Opens the local Hermes Newsroom command center inside Hermes Desktop.',
  /** @param {import('@hermes/plugin-sdk').PluginContext} ctx */
  register(ctx) {
    const contributions = [
      {id: 'page', area: ROUTES_AREA, data: {path: PAGE_PATH}, render: () => h(NewsroomPage, {})},
      {id: 'nav', area: SIDEBAR_NAV_AREA, order: 55, data: {codicon: 'radio-tower', label: 'Newsroom', path: PAGE_PATH}},
      {id: 'status', area: 'statusBar.left', render: () => h(NewsroomStatus, {})},
      {id: 'open', area: PALETTE_AREA, data: {
        id: 'hermes-newsroom.open', label: 'Newsroom: Open',
        keywords: ['newsroom', 'news', 'command center', 'hermes daily'],
        run: () => host.navigate(PAGE_PATH),
      }},
      {id: 'reload', area: PALETTE_AREA, data: {
        id: 'hermes-newsroom.reload', label: 'Newsroom: Reload',
        keywords: ['newsroom', 'reload', 'refresh'],
        run: () => {
          host.navigate(PAGE_PATH);
          globalThis.dispatchEvent?.(new CustomEvent('hermes-newsroom:reload'));
        },
      }},
    ];
    return ctx.registerMany ? ctx.registerMany(contributions) : contributions.map(c => ctx.register(c));
  },
};
