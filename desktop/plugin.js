import {createElement as h, useState, useRef, useCallback} from 'react';
import {host, Button, Codicon, ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA} from '@hermes/plugin-sdk';

// Hermes Newsroom runs locally as the omarchy-command-center user service.
// This plugin only frames that page; it holds no data and calls no backend.
export const PAGE_PATH = '/newsroom';
export const NEWSROOM_URL = 'http://127.0.0.1:3520/newsroom';
const SERVICE = 'omarchy-command-center.service';

/** @param {{url?:string}} props */
export function NewsroomPage({url = NEWSROOM_URL}) {
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);
  const frame = useRef(null);
  const reload = useCallback(() => {
    setFailed(false);
    setNonce(n => n + 1);
  }, []);
  return h('div', {style: {display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: 'var(--ui-text-primary)'}},
    h('header', {style: {display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderBottom: '1px solid var(--ui-stroke-primary)'}},
      h('span', {style: {display: 'grid', placeItems: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'var(--ui-bg-hover)', color: 'var(--ui-accent)'}}, h(Codicon, {name: 'radio-tower'})),
      h('h1', {style: {margin: 0, fontSize: '13px', fontWeight: 600}}, 'Hermes Newsroom'),
      h('span', {style: {fontSize: '11px', color: 'var(--ui-text-tertiary)', overflowWrap: 'anywhere'}}, url),
      h('span', {style: {flex: 1}}),
      h(Button, {variant: 'ghost', size: 'sm', onClick: reload, 'aria-label': 'Reload Newsroom'}, 'Reload')),
    failed
      ? h('div', {role: 'alert', style: {padding: '18px 16px', fontSize: '13px', lineHeight: 1.6}},
          h('p', {style: {margin: '0 0 6px'}}, 'Newsroom could not be loaded.'),
          h('p', {style: {margin: '0 0 6px'}}, `It is served locally by ${SERVICE}. Start or check it, then press Reload.`),
          h('pre', {style: {margin: '0 0 10px', fontFamily: 'ui-monospace, monospace', fontSize: '12px'}}, `systemctl --user status ${SERVICE}`),
          h(Button, {variant: 'outline', size: 'sm', onClick: reload}, 'Reload'))
      : h('iframe', {
          key: nonce,
          ref: frame,
          src: url,
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
    ];
    return ctx.registerMany ? ctx.registerMany(contributions) : contributions.map(c => ctx.register(c));
  },
};
