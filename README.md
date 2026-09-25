# Hermes Newsroom — Desktop plugin

Opens [Hermes Newsroom](https://github.com/BkashJEE/hermes-newsroom) inside the
Hermes Desktop app: a sidebar entry, a status-bar launcher and two command-palette
actions. The page picks up your Hermes theme and follows it when you switch.

The plugin is one file. It holds no data, has no backend, and stores nothing. It
frames the Newsroom app running on your own machine.

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
somewhere else, set `hermes-newsroom:url` in the Desktop window's local storage
to that address and reload the page. Only loopback `http(s)` addresses are
accepted: the frame runs with same-origin privileges, so it must never be aimed
off your machine.

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
