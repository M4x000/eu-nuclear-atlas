/* Detailed online geography with a local fallback. No key or tile prefetching. */
window.createAtlasBackground = function(map, countryNames, escapeHTML) {
 'use strict';
 const box=document.getElementById('map'),status=document.getElementById('map-status'),retry=document.getElementById('map-retry');
 const offlineCredit='<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>';
 const onlineCredit='<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';
 const local=L.layerGroup(),scope=new Set(Object.keys(countryNames).filter(x=>!['UK','NO'].includes(x)));
 L.geoJSON(window.ATLAS_MAP,{style:f=>({color:'#adbbb7',weight:.8,fillColor:scope.has(f.properties.code)?'#f4f6ef':'#e3e7e2',fillOpacity:1}),onEachFeature:(f,l)=>l.bindTooltip(f.properties.name,{sticky:true})}).addTo(local);
 map.createPane('countryLabels');map.getPane('countryLabels').style.zIndex=410;map.getPane('countryLabels').style.pointerEvents='none';
 for(const {properties:p} of window.ATLAS_MAP.features){
  if(['FR','DE','IT','ES','PT','GB','IE','NO','SE','FI','PL','RO','GR','UA','TR','DK','NL','CZ','AT','CH'].includes(p.code)&&p.label?.every(Number.isFinite))
   L.marker(p.label,{interactive:false,keyboard:false,pane:'countryLabels',icon:L.divIcon({className:'country-label',html:escapeHTML(p.name),iconSize:[100,16],iconAnchor:[50,8]})}).addTo(local);
 }
 let online=null,timer=null,generation=0;
 function essential(message){
  ++generation;clearTimeout(timer);if(online){map.removeLayer(online);online=null}
  if(!map.hasLayer(local))local.addTo(map);
  map.attributionControl.removeAttribution(onlineCredit);map.attributionControl.addAttribution(offlineCredit);
  map.setMaxZoom(10);if(map.getZoom()>10)map.setZoom(10);
  box.dataset.basemap='local';status.textContent=message;retry.hidden=!navigator.onLine;
 }
 function detailed(){
  if(online)return;
  if(!navigator.onLine){essential('Mappa essenziale · offline');return}
  if(!window.maplibregl||!L.maplibreGL){essential('Mappa essenziale · dettagli non disponibili');return}
  const token=++generation;let failures=0;retry.hidden=true;status.textContent='Caricamento mappa dettagliata…';box.dataset.basemap='loading';
  try{
   // Keep the old canvas aligned with Leaflet while GL prepares its next frame.
   // Commit the new container offset only when that frame has actually rendered.
   // Otherwise each pan update briefly pairs a new offset with old map pixels.
   const AlignedBackground=L.MaplibreGL.extend({
    onAdd:function(m){
     L.MaplibreGL.prototype.onAdd.call(this,m);
     this._glMap.on('render',()=>{
      if(this._pendingPosition){L.DomUtil.setPosition(this._container,this._pendingPosition);this._pendingPosition=null}
     });
    },
    _update:function(event){
     const previous=this._container&&L.DomUtil.getPosition(this._container);
     L.MaplibreGL.prototype._update.call(this,event);
     if(previous&&this._map&&!this._zooming){
      this._pendingPosition=L.DomUtil.getPosition(this._container);
      L.DomUtil.setPosition(this._container,previous);
     }
    }
   });
   online=new AlignedBackground({style:'https://tiles.openfreemap.org/styles/liberty',interactive:false,attribution:onlineCredit,renderWorldCopies:false,maxZoom:18}).addTo(map);
   const gl=online.getMaplibreMap();
   gl.on('error',()=>{if(token===generation&&++failures>=3)essential('Mappa essenziale · servizio dettagliato non raggiungibile')});
   gl.getCanvas().addEventListener('webglcontextlost',()=>{if(token===generation)essential('Mappa essenziale · grafica dettagliata non disponibile')});
   gl.once('load',()=>{
    if(token!==generation)return;clearTimeout(timer);failures=0;
    if(map.hasLayer(local))map.removeLayer(local);
    map.attributionControl.removeAttribution(offlineCredit);map.setMaxZoom(18);
    box.dataset.basemap='online';status.textContent='Mappa dettagliata · città e strade';
   });
   timer=setTimeout(()=>{if(token===generation&&box.dataset.basemap!=='online')essential('Mappa essenziale · servizio dettagliato non raggiungibile')},20000);
  }catch{essential('Mappa essenziale · dettagli non disponibili')}
 }
 essential('Mappa essenziale');detailed();
 retry.addEventListener('click',detailed);
 window.addEventListener('offline',()=>essential('Mappa essenziale · offline'));
 window.addEventListener('online',detailed);
 return {getOnlineMap:()=>online?.getMaplibreMap(),retry:detailed};
};
