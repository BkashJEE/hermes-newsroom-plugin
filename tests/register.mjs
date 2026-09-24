import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve) {
 if(specifier === '@hermes/plugin-sdk') return {url:new URL('./sdk.mjs',import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}});
