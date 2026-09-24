import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import plugin, {NewsroomPage, NEWSROOM_URL, PAGE_PATH} from '../desktop/plugin.js';
import {ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA} from './sdk.mjs';

test('registers a page, sidebar entry, status-bar launcher and palette command', () => {
  const got = [];
  plugin.register({register: c => got.push(c), registerMany: l => l.forEach(c => got.push(c))});
  const areas = got.map(c => c.area);
  assert.ok(areas.includes(ROUTES_AREA) && areas.includes(SIDEBAR_NAV_AREA));
  assert.ok(areas.includes('statusBar.left') && areas.includes(PALETTE_AREA));
  assert.equal(got.find(c => c.area === ROUTES_AREA).data.path, PAGE_PATH);
  assert.equal(got.find(c => c.area === SIDEBAR_NAV_AREA).data.label, 'Newsroom');
});

test('frames the local Newsroom, sandboxed, with a reload control', () => {
  const html = renderToStaticMarkup(h(NewsroomPage, {}));
  assert.match(html, /<iframe/);
  assert.ok(html.includes(NEWSROOM_URL), 'must point at the local Newsroom');
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms"/);
  assert.doesNotMatch(html, /allow-popups|allow-downloads|allow-top-navigation/);
  assert.match(html, /Reload/);
  assert.match(html, /Hermes Newsroom/);
});
