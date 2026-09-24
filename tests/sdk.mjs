import {createElement, createContext, useContext, useSyncExternalStore} from 'react';
const Popup = createContext(null);
export const Popover = ({open,onOpenChange,children}) => createElement(Popup.Provider,{value:{open,onOpenChange}},children);
export const PopoverTrigger = ({children,...props}) => {
  const p=useContext(Popup);
  return createElement('button',{...props,'aria-expanded':p.open,onClick:()=>p.onOpenChange(!p.open)},children);
};
export const PopoverContent = ({children,side,align,style}) => {
  const p=useContext(Popup);
  return p.open ? createElement('div',{role:'dialog','data-side':side,'data-align':align,style},children) : null;
};
import {useQuery as realUseQuery} from '@tanstack/react-query';
export const ROUTES_AREA = 'routes';
export const SIDEBAR_NAV_AREA = 'sidebar.nav';
export const PALETTE_AREA = 'palette';
let queryState = null;
let live = false;
export const setQueryState = value => {queryState = value;};
export const useRealQuery = () => {live=true;};
export const useQuery = opts => live ? realUseQuery(opts) : queryState ?? ({data:null,isLoading:true});
const atom = initial => {
  let value=initial;
  const listeners=new Set();
  return {get:()=>value, subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);},set:next=>{value=next;listeners.forEach(fn=>fn());}};
};
export const host = {state:{profile:atom('isolated-preview'),connectionId:atom(null)},revealPane:()=>{},navigate:()=>{}};
export const useValue = atom => useSyncExternalStore(atom.subscribe,atom.get,atom.get);
export const Button = ({variant: _variant, size: _size, ...props}) => createElement('button',props);
export const Codicon = ({name}) => createElement('span',{'aria-hidden':true,'data-icon':name});
