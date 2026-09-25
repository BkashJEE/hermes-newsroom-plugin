import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsdom from 'jsdom';
import plugin, {NewsroomPage, NEWSROOM_URL, PAGE_PATH, hermesTheme, themedUrl} from '../desktop/plugin.js';
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

test('frames the local Newsroom full-bleed, sandboxed, with no duplicate chrome', () => {
  const html = renderToStaticMarkup(h(NewsroomPage, {}));
  assert.match(html, /<iframe/);
  assert.ok(html.includes(NEWSROOM_URL), 'must point at the local Newsroom');
  assert.match(html, /embed=hermes/);
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms"/);
  assert.doesNotMatch(html, /allow-popups|allow-downloads|allow-top-navigation/);
  // The app draws its own header; a second one inside Hermes is duplicate chrome.
  assert.doesNotMatch(html, /<header|Hermes Newsroom<|127\.0\.0\.1:3520<\/span>/);
});

test('only plain resolved colours and a sane font stack are ever passed on', () => {
  // jsdom does not resolve var()/color-mix() in computed styles, so this asserts the
  // contract rather than the resolution: anything unresolved is dropped, never forwarded.
  const dom = new jsdom.JSDOM(`<style>:root{--ui-bg-base:#0a0b0c}</style><body></body>`);
  const theme = hermesTheme(dom.window.document);
  assert.ok(!/var\(|color-mix|url\(|;/.test(JSON.stringify(theme)), 'no unresolved or injectable values');
  for (const value of Object.values(theme)) {
    assert.ok(/^rgba?\(/.test(value) || /^[A-Za-z0-9 ,'"._-]{1,200}$/.test(value), value);
  }
  assert.equal(dom.window.document.body.children.length, 0, 'probe element must be cleaned up');
  const url = themedUrl({bg: 'rgb(10, 11, 12)', accent: 'rgb(0, 83, 253)'});
  assert.ok(url.startsWith(NEWSROOM_URL + '?embed=hermes'));
  assert.match(url, /accent=rgb%280%2C\+83%2C\+253%29/);
});

test('a document without Hermes tokens yields no theme and a plain embed url', () => {
  const dom = new jsdom.JSDOM('<body></body>');
  const theme = hermesTheme(dom.window.document);
  assert.ok(!theme.bg && !theme.accent);
  assert.equal(themedUrl({}), NEWSROOM_URL + '?embed=hermes');
});
