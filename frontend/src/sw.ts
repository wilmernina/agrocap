/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url:string;revision:string|null}> };
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({request})=>request.mode==='navigate',createHandlerBoundToURL('/index.html'));

// Reintenta peticiones batch autenticadas que Workbox haya capturado durante una caída de red.
// La cola de IndexedDB sigue siendo la fuente de verdad y sus UUID hacen seguro el reenvío.
const reintentos=new BackgroundSyncPlugin('agrosys-sync-red',{
  maxRetentionTime:24*60,
  onSync:async({queue})=>{await queue.replayRequests();const ventanas=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const ventana of ventanas)ventana.postMessage({tipo:'SINCRONIZAR_COLA'})},
});
registerRoute(({url,request})=>url.pathname.endsWith('/api/v1/sync/lote')&&request.method==='POST',new NetworkOnly({plugins:[reintentos]}),'POST');

self.addEventListener('message',(evento:ExtendableMessageEvent)=>{
  if((evento.data as {tipo?:string}|null)?.tipo==='SINCRONIZAR_COLA'){
    void self.registration.sync?.register('agrosys-sync-red').catch(()=>undefined);
    evento.waitUntil((async()=>{const ventanas=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const ventana of ventanas)ventana.postMessage({tipo:'SINCRONIZAR_COLA'})})());
  }
});
