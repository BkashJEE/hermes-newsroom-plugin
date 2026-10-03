# Hermes Newsroom — Desktop plugin

Opens [Hermes Newsroom](https://github.com/BkashJEE/hermes-newsroom) inside the
Hermes Desktop app: a sidebar entry, a status-bar launcher and two command-palette
actions. The page picks up your Hermes theme and follows it when you switch.

The plugin is one file. It holds no data, has no backend, and stores nothing. It
frames the Newsroom app running on your own machine, or, if you say so
explicitly, on a private host you control.

## Install

You do not have to install this repository by hand. The app it frames ships an
install skill and a cross-platform installer that fetch this file for you:

> Install Hermes Newsroom from github.com/BkashJEE/hermes-newsroom

Or, from a clone of the app:

```sh
npm run setup            # builds the app, installs this plugin, verifies
```

Then restart the Hermes Desktop app. That is the whole install.

### By hand

**1. Run Newsroom itself.** The plugin shows a page; this is the app behind it.

```sh
git clone https://github.com/BkashJEE/hermes-newsroom
cd hermes-newsroom
npm ci
npm run build
npm start          # serves http://127.0.0.1:3520
```

Works on Linux, macOS and Windows — it is a Node app. To keep it running after a
reboot, use `node scripts/install.mjs --autostart` in that repo, which writes a
systemd user unit, a launchd agent or a Startup entry depending on the platform.

**2. Install the plugin.** Copy the single file into the Hermes desktop plugin
directory, naming the folder after the plugin:

```sh
mkdir -p ~/.hermes/desktop-plugins/hermes-newsroom
cp desktop/plugin.js ~/.hermes/desktop-plugins/hermes-newsroom/
```

On macOS and Windows the Hermes home is wherever your Hermes install keeps
`desktop-plugins`; the layout is the same. Do **not** add a
`.hermes-package.json` marker: a marker tells Hermes the folder is a copy of an
installed agent package, which makes it load disabled and lets Hermes delete the
folder if that package is missing.

**3. Restart the Hermes Desktop app.** Disk plugins are scanned at startup, not on
a window reload. "Newsroom" then appears in the sidebar.

## A different port

Newsroom is expected at `http://127.0.0.1:3520/newsroom`. To point the plugin
somewhere else on this machine, set `hermes-newsroom:url` in the Desktop window's
local storage to that address and reload the page. Only loopback `http(s)`
addresses are accepted without further steps.

## A Newsroom on another machine

By default the plugin refuses to frame anything that is not on `127.0.0.1`,
`localhost` or `[::1]`, and the pane says so, naming the address it refused. The
reason is the frame itself: it is created with
`sandbox="allow-scripts allow-same-origin allow-forms"`. `allow-same-origin` is
what lets the Newsroom page keep its own cookies and storage and talk to its own
API, but it also means the framed page runs with the full privileges of its
origin inside the Desktop window. Aimed at a host you do not control, that is a
foothold; aimed at your own machine, it is fine.

If Newsroom runs on a **private host you control** (a tailnet peer, a LAN box),
you can opt in per origin. Two keys are needed, and the second must spell out the
exact origin of the first (`scheme://host:port`, no path):

| key | value |
| --- | --- |
| `hermes-newsroom:url` | the full address, e.g. `http://100.101.102.103:3520/newsroom` |
| `hermes-newsroom:allow-private-host` | that address's origin, e.g. `http://100.101.102.103:3520` |

The allow key names one origin rather than switching the check off, so a later
change of `hermes-newsroom:url` to some other host is refused again until you
name that host too. A blanket value such as `1` does nothing. The sandbox is the
same as for loopback, and the pane shows a one-line note that the page is framed
from another host.

From the Desktop window's developer tools console (in most Electron apps:
`Ctrl+Shift+I`, or `Cmd+Option+I` on macOS; otherwise the View or Help menu):

```js
localStorage.setItem('hermes-newsroom:url', 'http://100.101.102.103:3520/newsroom');
localStorage.setItem('hermes-newsroom:allow-private-host', 'http://100.101.102.103:3520');
```

Then reload the page (or restart the Desktop app) and open Newsroom. To go back:

```js
localStorage.removeItem('hermes-newsroom:allow-private-host');
localStorage.removeItem('hermes-newsroom:url');
```

Do not do this for a host reachable from the public internet. If you only need
the page and not a remote origin, a loopback forward keeps the default rule
intact: `ssh -L 3520:127.0.0.1:3520 <host>` on the Desktop machine, then leave
`hermes-newsroom:url` unset.

Note that Newsroom itself talks to a Hermes API gateway on *its* machine; framing
it from elsewhere does not change that (see
[hermes-newsroom#5](https://github.com/BkashJEE/hermes-newsroom/issues/5)).

## Theme bridge

The framed page is cross-origin, so Hermes cannot style it from outside. The
plugin resolves your theme's variables to literal colours through a probe element
and passes them to the page: as query parameters on first paint, then by
`postMessage` when you change theme. Only resolved colours and a plain font stack
are sent, and only to the Newsroom origin.

## Develop

```sh
npm ci
npm test           # registration surfaces, sandboxing, theme resolution, url handling
npm run build      # syntax check
```

## Licence

[Apache-2.0](LICENSE).
