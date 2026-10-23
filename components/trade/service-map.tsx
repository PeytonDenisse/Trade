'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap,CircleMarker} from 'leaflet';
import {Crosshair,MapPin,ExternalLink} from 'lucide-react';
import {directionsUrl,serviceLocation,type ServiceLocation} from '../../lib/service-location';

function MapCanvas({point,onPick}:{point:ServiceLocation|null;onPick?:(point:ServiceLocation)=>void}){
  const element=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),marker=useRef<CircleMarker|null>(null);
  const latestPoint=useRef(point),pick=useRef(onPick);
  const [error,setError]=useState('');
  latestPoint.current=point;pick.current=onPick;
  function updatePoint(value:ServiceLocation|null){
    if(!map.current||!marker.current)return;
    if(value){marker.current.setLatLng([value.lat,value.lng]).addTo(map.current);map.current.setView([value.lat,value.lng],Math.max(map.current.getZoom(),16));}
    else marker.current.remove();
  }
  useEffect(()=>{
    let cancelled=false;
    import('leaflet').then(L=>{
      if(cancelled||!element.current)return;
      const initial=latestPoint.current;
      const instance=L.map(element.current,{scrollWheelZoom:false}).setView(initial?[initial.lat,initial.lng]:[23.6,-102.5],initial?16:5);
      map.current=instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(instance);
      marker.current=L.circleMarker([0,0],{radius:10,color:'#b94f34',fillColor:'#d96647',fillOpacity:1,weight:3});
      updatePoint(initial);
      instance.on('click',e=>pick.current?.({lat:Number(e.latlng.lat.toFixed(6)),lng:Number(e.latlng.wrap().lng.toFixed(6)),...(latestPoint.current?.address?{address:latestPoint.current.address}:{})}));
    }).catch(()=>setError('No se pudo cargar el mapa. Puedes usar las coordenadas y el enlace de indicaciones.'));
    return()=>{cancelled=true;map.current?.remove();map.current=null;marker.current=null};
  },[]);
  useEffect(()=>{updatePoint(point)},[point?.lat,point?.lng]);
  return <>{error&&<p role="alert" className="field-error">{error}</p>}<div ref={element} className="service-map" aria-label={onPick?'Mapa: pulsa para marcar el lugar del servicio':'Mapa del lugar del servicio'}/></>;
}

export function LocationPicker({value,onChange}:{value:ServiceLocation|null;onChange:(point:ServiceLocation|null)=>void}){
  const [open,setOpen]=useState(!!value),[locating,setLocating]=useState(false),[error,setError]=useState('');
  const [latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState('');
  function locate(){
    if(!navigator.geolocation){setError('Tu navegador no permite obtener la ubicación. Marca el punto en el mapa o escribe las coordenadas.');return}
    setLocating(true);setError('');
    navigator.geolocation.getCurrentPosition(position=>{
      onChange({lat:position.coords.latitude,lng:position.coords.longitude,...(value?.address?{address:value.address}:{})});setLocating(false);
    },()=>{setError('No pudimos obtener tu ubicación. Puedes marcarla en el mapa o escribir las coordenadas.');setLocating(false)}, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  }
  return <section className="location-picker"><h3><MapPin size={20}/>Lugar del servicio <small>Opcional</small></h3><p>Indica a dónde debe acudir el proveedor. El punto exacto se comparte con el profesional cuya cotización aceptes.</p>{!open?<button type="button" className="secondary" onClick={()=>setOpen(true)}>Agregar un mapa</button>:<>
    <div className="location-actions"><button type="button" className="secondary" disabled={locating} onClick={locate}><Crosshair size={17}/>{locating?'Buscando ubicación…':'Usar mi ubicación actual'}</button><button type="button" className="text-button" onClick={()=>{onChange(null);setOpen(false);setError('')}}>Quitar mapa</button></div>
    <p className="muted">Acerca el mapa y pulsa el lugar exacto. Si usas tu ubicación actual, comprueba que sea donde se hará el trabajo.</p>
    <MapCanvas point={value} onPick={point=>{setError('');onChange(point)}}/>
    <p role="status" className="location-status">{value?`Punto seleccionado: ${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`:'Todavía no marcaste un punto. Puedes publicar sin ubicación.'}</p>
    {value&&<label className="field">Dirección o referencia (opcional)<input value={value.address||''} maxLength={300} onChange={e=>onChange({...value,address:e.target.value})} placeholder="Calle, número y referencias para llegar"/></label>}
    <details><summary>Ingresar coordenadas manualmente</summary><div className="location-coordinates"><label className="field">Latitud<input type="number" min="-90" max="90" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><label className="field">Longitud<input type="number" min="-180" max="180" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label><button type="button" className="secondary" onClick={()=>{try{if(!latitude.trim()||!longitude.trim())throw Error('Completa la latitud y la longitud.');const point=serviceLocation({lat:Number(latitude),lng:Number(longitude),...(value?.address?{address:value.address}:{})});if(point)onChange(point);setError('')}catch(e){setError(e instanceof Error?e.message:'Revisa las coordenadas.')}}}>Marcar coordenadas</button></div></details>
    {error&&<p className="field-error" role="alert">{error}</p>}
  </>}</section>;
}

export function ServiceMap({location,shared=false}:{location?:ServiceLocation;shared?:boolean}){
  if(!location)return shared?<section className="service-location"><h3><MapPin size={20}/>Lugar del servicio</h3><p>El cliente agregó una ubicación. Podrás verla si acepta tu cotización.</p></section>:null;
  return <section className="service-location"><h3><MapPin size={20}/>Lugar del servicio</h3>{location.address&&<p>{location.address}</p>}<MapCanvas point={location}/><p className="muted">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p><a className="secondary" href={directionsUrl(location)} target="_blank" rel="noopener noreferrer">Cómo llegar en Google Maps <ExternalLink size={16}/></a></section>;
}
