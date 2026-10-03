import {createElement as h, Fragment, useState, useRef, useCallback, useEffect} from 'react';
import {host, Button, Codicon, ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA} from '@hermes/plugin-sdk';

// Frames the Hermes Newsroom app (github.com/BkashJEE/hermes-newsroom) running on
// this machine, or on a private host the operator has named explicitly. The plugin
// holds no data and calls no backend of its own.
export const PAGE_PATH = '/newsroom';
export const NEWSROOM_URL = 'http://127.0.0.1:3520/newsroom';
export const SETTING = 'hermes-newsroom:url';
export const ALLOW_SETTING = 'hermes-newsroom:allow-private-host';

/** @param {unknown} store @param {string} key */
function readSetting(store, key) {
  const raw = typeof store?.getItem === 'function' ? store.getItem(key) : store?.[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

/** @param {URL} url */
function isLoopback(url) {
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
}

/**
 * Decide which address to frame, and say why when a configured one is not used.
 *
 * A framed page is same-origin-privileged, so by default only a loopback http(s)
 * address is accepted. A non-loopback address is framed only when a second key,
 * ALLOW_SETTING, holds that address's exact origin (scheme://host:port). Tying the
 * opt-in to one origin means a later change of SETTING cannot ride on an earlier
 * approval: the operator has to name each host they trust.
 *
 * @param {unknown} [store]
 * @returns {{url: string, privateHost: boolean,
 *            refused?: {value: string, reason: 'unreadable'|'not-http'|'not-loopback'|'allow-mismatch', expectedAllow?: string}}}
 */
export function resolveNewsroomUrl(store = globalThis.localStorage) {
  let raw, allow;
  try {
    raw = readSetting(store, SETTING);
    allow = readSetting(store, ALLOW_SETTING);
  } catch {
    return {url: NEWSROOM_URL, privateHost: false};   // private mode, blocked storage
  }
  if (!raw) return {url: NEWSROOM_URL, privateHost: false};
  let url;
  try {
    url = new URL(raw);
  } catch {
    return {url: NEWSROOM_URL, privateHost: false, refused: {value: raw, reason: 'unreadable'}};
  }
  if (!/^https?:$/.test(url.protocol)) {
    return {url: NEWSROOM_URL, privateHost: false, refused: {value: raw, reason: 'not-http'}};
  }
  if (isLoopback(url)) return {url: url.href, privateHost: false};
  if (!allow) {
    return {url: NEWSROOM_URL, privateHost: false, refused: {value: raw, reason: 'not-loopback', expectedAllow: url.origin}};
  }
  if (allow !== url.origin) {
    return {url: NEWSROOM_URL, privateHost: false, refused: {value: raw, reason: 'allow-mismatch', expectedAllow: url.origin}};
  }
  return {url: url.href, privateHost: true};
}

/** The address to frame. Kept for callers that only need the string. */
export function newsroomUrl(store = globalThis.localStorage) {
  return resolveNewsroomUrl(store).url;
}

/** One sentence explaining a refusal, plus the way to allow it when there is one.
 * @param {NonNullable<ReturnType<typeof resolveNewsroomUrl>['refused']>} refused */
export function refusalText(refused) {
  const {value, reason, expectedAllow} = refused;
  switch (reason) {
    case 'unreadable':
      return `The configured address ${value} (${SETTING}) is not a valid URL, so it was not used.`;
    case 'not-http':
      return `The configured address ${value} (${SETTING}) was refused: only http: or https: addresses can be framed.`;
    case 'not-loopback':
      return `The configured address ${value} (${SETTING}) was refused because it is not a loopback host. `
        + `The frame runs with same-origin privileges, so a host off this machine must be allowed explicitly: `
        + `set ${ALLOW_SETTING} to exactly ${expectedAllow} and reload. Only do this for a private tailnet or LAN host you control.`;
    case 'allow-mismatch':
      return `The configured address ${value} (${SETTING}) was refused: ${ALLOW_SETTING} is set, but not to that address's origin. `
        + `Set it to exactly ${expectedAllow} and reload.`;
  }
  return `The configured address ${value} (${SETTING}) was refused.`;
}

/** The origin to post the theme to, derived from whichever address is in use. */
export function newsroomOrigin(url) {
  return new URL(url).origin;
}

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

/** @param {{url?:string,failed?:boolean,privateHost?:boolean,
 *            refused?:ReturnType<typeof resolveNewsroomUrl>['refused']}} props */
export function NewsroomPage({url, failed: initiallyFailed = false, privateHost, refused}) {
  // Resolve once per mount, so the frame, the notice and the theme target agree.
  const [resolved] = useState(() => (url === undefined ? resolveNewsroomUrl() : null));
  if (url === undefined) url = resolved.url;
  if (privateHost === undefined) privateHost = resolved?.privateHost ?? false;
  if (refused === undefined) refused = resolved?.refused;
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(initiallyFailed);
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
      if (target) target.postMessage({type: 'hermes-theme', theme: hermesTheme(doc)}, newsroomOrigin(url));
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
  const noteStyle = {margin: 0, padding: '6px 16px', fontSize: '12px', lineHeight: 1.5,
    color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-stroke-secondary)'};
  return h('div', {style: {display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--ui-bg-base)'}},
    refused
      ? h('div', {role: 'alert', style: {padding: '18px 16px', fontSize: '13px', lineHeight: 1.6, color: 'var(--ui-text-primary)'}},
          h('p', {style: {margin: '0 0 6px', fontWeight: 600}}, 'Newsroom was not opened.'),
          h('p', {style: {margin: '0 0 10px'}}, refusalText(refused)),
          h('p', {style: {margin: '0 0 10px', fontSize: '12px'}},
            `To go back to the default (${NEWSROOM_URL}), remove ${SETTING} from this window's local storage, then Reload.`),
          h(Button, {variant: 'outline', size: 'sm', onClick: reload}, 'Reload'))
    : failed
      ? h('div', {role: 'alert', style: {padding: '18px 16px', fontSize: '13px', lineHeight: 1.6, color: 'var(--ui-text-primary)'}},
          h('p', {style: {margin: '0 0 6px', fontWeight: 600}}, `Nothing is serving Newsroom at ${url}.`),
          h('p', {style: {margin: '0 0 6px'}}, 'Newsroom is a separate local app. Install and start it once, on Linux, macOS or Windows:'),
          h('pre', {style: {margin: '0 0 10px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', whiteSpace: 'pre-wrap'}},
            'git clone https://github.com/BkashJEE/hermes-newsroom\ncd hermes-newsroom\nnpm ci\nnpm run build\nnpm start'),
          h('p', {style: {margin: '0 0 6px', fontSize: '12px'}},
            'To keep it running: a systemd user service on Linux, a launchd agent on macOS, or Task Scheduler on Windows.'),
          h('p', {style: {margin: '0 0 10px', fontSize: '12px'}},
            `Using a different port? Set ${SETTING} in this window's local storage to that address, then Reload.`),
          h(Button, {variant: 'outline', size: 'sm', onClick: reload}, 'Reload'))
      : h(Fragment, null,
          privateHost && h('p', {role: 'note', style: noteStyle},
            `Framed from another host, ${newsroomOrigin(url)}, allowed by ${ALLOW_SETTING}.`),
          h('iframe', {
          key: nonce,
          ref: frame,
          src,
          title: 'Hermes Newsroom',
          onError: () => setFailed(true),
          // Local-only page: no downloads, popups, or top-level navigation out of the frame.
          sandbox: 'allow-scripts allow-same-origin allow-forms',
          style: {flex: 1, width: '100%', border: 0, background: 'var(--ui-bg-base)'},
        })));
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
