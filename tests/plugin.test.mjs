import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsdom from 'jsdom';
import plugin, {NewsroomPage, NEWSROOM_URL, PAGE_PATH, SETTING, ALLOW_SETTING, hermesTheme, themedUrl,
  newsroomUrl, resolveNewsroomUrl, refusalText} from '../desktop/plugin.js';
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

test('the address is configurable, and only a loopback one is accepted', () => {
  // Default when nothing is configured.
  assert.equal(newsroomUrl({}), NEWSROOM_URL);
  // A different port is what most people will need.
  assert.equal(newsroomUrl({'hermes-newsroom:url': 'http://127.0.0.1:3000/newsroom'}),
    'http://127.0.0.1:3000/newsroom');
  assert.equal(newsroomUrl({'hermes-newsroom:url': 'http://localhost:8080/newsroom'}),
    'http://localhost:8080/newsroom');
  // A frame is same-origin-privileged here: never point it off this machine.
  for (const bad of ['https://evil.test/newsroom', 'http://10.0.0.5:3520/newsroom',
                     'javascript:alert(1)', 'file:///etc/passwd', 'not a url']) {
    assert.equal(newsroomUrl({'hermes-newsroom:url': bad}), NEWSROOM_URL, bad);
  }
});

test('setup guidance names every platform, not just systemd', async () => {
  const html = renderToStaticMarkup(h(NewsroomPage, {url: 'http://127.0.0.1:9/newsroom', failed: true}));
  assert.match(html, /npm ci/);
  assert.match(html, /npm run build/);
  assert.match(html, /npm start/);
  assert.match(html, /hermes-newsroom/);
  assert.match(html, /macOS|Windows/);
  assert.doesNotMatch(html, /omarchy-command-center\.service/);
});

test('a refused address is reported as refused, never as the default being down', () => {
  const store = {[SETTING]: 'http://100.101.102.103:3520/newsroom'};
  const r = resolveNewsroomUrl(store);
  assert.equal(r.url, NEWSROOM_URL);
  assert.equal(r.privateHost, false);
  assert.deepEqual(r.refused, {value: store[SETTING], reason: 'not-loopback', expectedAllow: 'http://100.101.102.103:3520'});
  const text = refusalText(r.refused);
  assert.match(text, /http:\/\/100\.101\.102\.103:3520\/newsroom/);
  assert.match(text, /not a loopback host/);
  assert.ok(text.includes(`set ${ALLOW_SETTING} to exactly http://100.101.102.103:3520`));
  // Blocked storage and an empty key are not refusals: nothing was configured.
  assert.equal(resolveNewsroomUrl({}).refused, undefined);
  assert.equal(resolveNewsroomUrl({get [SETTING]() { throw new Error('blocked'); }}).refused, undefined);
  assert.equal(resolveNewsroomUrl({[SETTING]: '   '}).refused, undefined);
  assert.equal(resolveNewsroomUrl({[SETTING]: 'not a url'}).refused.reason, 'unreadable');
  assert.equal(resolveNewsroomUrl({[SETTING]: 'javascript:alert(1)'}).refused.reason, 'not-http');
  assert.equal(resolveNewsroomUrl({[SETTING]: 'file:///etc/passwd'}).refused.reason, 'not-http');
});

test('a private host is framed only when the allow key names its exact origin', () => {
  const url = 'https://newsroom.tail1234.ts.net:3520/newsroom';
  const ok = resolveNewsroomUrl({[SETTING]: url, [ALLOW_SETTING]: 'https://newsroom.tail1234.ts.net:3520'});
  assert.deepEqual(ok, {url, privateHost: true});
  assert.equal(newsroomUrl({[SETTING]: url, [ALLOW_SETTING]: 'https://newsroom.tail1234.ts.net:3520'}), url);
  // A blanket value, another origin, a different scheme or port, or a path do not count.
  for (const allow of ['1', 'true', '*', 'http://newsroom.tail1234.ts.net:3520', 'https://newsroom.tail1234.ts.net',
                       'https://newsroom.tail1234.ts.net:3520/newsroom', 'https://other.tail1234.ts.net:3520']) {
    const r = resolveNewsroomUrl({[SETTING]: url, [ALLOW_SETTING]: allow});
    assert.equal(r.url, NEWSROOM_URL, allow);
    assert.equal(r.refused?.reason, 'allow-mismatch', allow);
    assert.match(refusalText(r.refused), /Set it to exactly https:\/\/newsroom\.tail1234\.ts\.net:3520/);
  }
  // The allow key never widens what a loopback address or a bad scheme may do.
  assert.equal(resolveNewsroomUrl({[SETTING]: 'javascript:alert(1)', [ALLOW_SETTING]: 'javascript:'}).refused.reason, 'not-http');
  assert.deepEqual(resolveNewsroomUrl({[SETTING]: 'http://localhost:3000/newsroom', [ALLOW_SETTING]: 'http://localhost:3000'}),
    {url: 'http://localhost:3000/newsroom', privateHost: false});
});

test('the pane explains a refusal instead of naming the default address', () => {
  const r = resolveNewsroomUrl({[SETTING]: 'http://10.0.0.5:3520/newsroom'});
  const html = renderToStaticMarkup(h(NewsroomPage, {url: r.url, refused: r.refused}));
  assert.doesNotMatch(html, /<iframe/, 'nothing is framed while the configuration is refused');
  assert.doesNotMatch(html, /Nothing is serving Newsroom/);
  assert.match(html, /role="alert"/);
  assert.match(html, /http:\/\/10\.0\.0\.5:3520\/newsroom/);
  assert.match(html, /not a loopback host/);
  assert.ok(html.includes(ALLOW_SETTING));
  assert.match(html, /to exactly http:\/\/10\.0\.0\.5:3520 and reload/, 'the exact allow value is spelled out');
});

test('an allowed private host is framed with the same sandbox and a visible notice', () => {
  const url = 'http://100.101.102.103:3520/newsroom';
  const html = renderToStaticMarkup(h(NewsroomPage, {url, privateHost: true}));
  assert.match(html, /<iframe/);
  assert.ok(html.includes(url + '?embed=hermes'));
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms"/);
  assert.match(html, /role="note"/);
  assert.match(html, /Framed from another host, http:\/\/100\.101\.102\.103:3520/);
  // The loopback default carries no such notice.
  assert.doesNotMatch(renderToStaticMarkup(h(NewsroomPage, {})), /role="note"|Framed from another host/);
});
