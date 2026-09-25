// Minimal stand-in for @hermes/plugin-sdk, covering only what this plugin imports.
// The real module is supplied by the Hermes Desktop runtime at load time.
import {createElement} from 'react';

export const ROUTES_AREA = 'routes';
export const SIDEBAR_NAV_AREA = 'sidebar.nav';
export const PALETTE_AREA = 'palette';

const atom = initial => {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    subscribe: fn => {listeners.add(fn); return () => listeners.delete(fn);},
    set: next => {value = next; listeners.forEach(fn => fn());},
  };
};

export const host = {state: {profile: atom('isolated-preview'), connectionId: atom(null)}, navigate: () => {}};
export const Button = ({variant: _variant, size: _size, ...props}) => createElement('button', props);
export const Codicon = ({name}) => createElement('span', {'aria-hidden': true, 'data-icon': name});
