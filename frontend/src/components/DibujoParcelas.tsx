import { area } from '@turf/turf';
import L, { type LeafletEvent, type LeafletEventHandlerFn } from 'leaflet';
import 'leaflet-draw';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { GeoJsonParcelas, GeometriaParcela, PropiedadesParcela } from '../services/campo.service';

type Props = {
  geojson: GeoJsonParcelas;
  mostrar: boolean;
  habilitado: boolean;
  alDibujar: (geometria: GeometriaParcela, superficie: number, capa: L.Layer) => void;
  alEditar: (id: string, geometria: GeometriaParcela) => Promise<void>;
  alCambiarSuperficie: (superficie: number | null) => void;
  alSeleccionar: (id: string) => void;
};

function calcularSuperficie(coordenadas: number[][]) {
  if (coordenadas.length < 3) return 0;
  const anillo = [...coordenadas, coordenadas[0]!];
  return area({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anillo] } });
}

export function DibujoParcelas({ geojson, mostrar, habilitado, alDibujar, alEditar, alCambiarSuperficie, alSeleccionar }: Props) {
  const mapa = useMap();

  useEffect(() => {
    const grupo = new L.FeatureGroup();
    const capaDatos = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        const cultivo = (feature?.properties as PropiedadesParcela | undefined)?.cultivoActual;
        const colores = ['#15803d', '#a16207', '#047857', '#65a30d', '#0f766e', '#b45309'];
        const color = cultivo ? colores[[...cultivo].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % colores.length]! : '#64748b';
        return { color, weight: 2, opacity: 0.9, fillOpacity: 0.3 };
      },
      onEachFeature: (feature, capa) => {
        (capa as L.Layer & { feature?: GeoJSON.Feature }).feature = feature;
        const props = feature.properties as PropiedadesParcela;
        const contenido = document.createElement('div');
        const titulo = document.createElement('strong'); titulo.textContent = props.nombre;
        const datos = document.createElement('p'); datos.textContent = `Código: ${props.codigo} · ${props.finca}`;
        const cultivo = document.createElement('p'); cultivo.textContent = `Cultivo actual: ${props.cultivoActual ?? 'Sin cultivo registrado'}`;
        const superficie = document.createElement('p'); superficie.textContent = `${(Number(props.superficieCalculada) / 10_000).toFixed(2)} ha`;
        const enlace = document.createElement('a'); enlace.href = `/parcelas/${String(feature.id)}`; enlace.textContent = 'Ver detalle →';
        contenido.append(titulo, datos, cultivo, superficie, enlace);
        capa.bindPopup(contenido);
        capa.on('click', () => alSeleccionar(String(feature.id ?? '')));
        grupo.addLayer(capa);
      },
    });
    void capaDatos;
    if (mostrar) mapa.addLayer(grupo);
    const DrawControl = (L.Control as unknown as { Draw: new (opciones: Record<string, unknown>) => L.Control }).Draw;
    const control = new DrawControl({
      position: 'topright',
      draw: habilitado ? { polygon: { allowIntersection: false, showArea: false }, polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false } : false,
      edit: habilitado ? { featureGroup: grupo, edit: true, remove: false } : false,
    });
    if (habilitado) mapa.addControl(control);

    const onVertice: LeafletEventHandlerFn = (evento: LeafletEvent) => {
      const capas = (evento as LeafletEvent & { layers?: L.LayerGroup }).layers;
      if (!capas) return;
      const puntos: number[][] = [];
      capas.eachLayer((capa) => {
        if (capa instanceof L.Marker) {
          const punto = capa.getLatLng();
          puntos.push([punto.lng, punto.lat]);
        }
      });
      alCambiarSuperficie(calcularSuperficie(puntos));
    };
    const onCrear: LeafletEventHandlerFn = (evento: LeafletEvent) => {
      const capa = (evento as LeafletEvent & { layer: L.Polygon }).layer;
      const geometria = capa.toGeoJSON().geometry;
      if (geometria.type !== 'Polygon') return;
      capa.addTo(mapa);
      const anillo = geometria.coordinates[0] as number[][];
      alCambiarSuperficie(null);
      alDibujar(geometria as GeometriaParcela, calcularSuperficie(anillo.slice(0, -1)), capa);
    };
    const onEditar: LeafletEventHandlerFn = (evento: LeafletEvent) => {
      const capas = (evento as LeafletEvent & { layers: L.LayerGroup }).layers;
      const cambios: Array<Promise<void>> = [];
      capas.eachLayer((capa: L.Layer) => {
        const id = (capa as L.Layer & { feature?: GeoJSON.Feature }).feature?.id;
        const geometria = (capa as L.Polygon).toGeoJSON().geometry;
        if (id && geometria.type === 'Polygon') cambios.push(alEditar(String(id), geometria as GeometriaParcela));
      });
      void Promise.all(cambios).catch(() => undefined);
    };
    mapa.on('draw:drawvertex', onVertice);
    mapa.on('draw:created', onCrear);
    mapa.on('draw:edited', onEditar);
    return () => {
      mapa.off('draw:drawvertex', onVertice);
      mapa.off('draw:created', onCrear);
      mapa.off('draw:edited', onEditar);
      if (habilitado) mapa.removeControl(control);
      if (mapa.hasLayer(grupo)) mapa.removeLayer(grupo);
      alCambiarSuperficie(null);
    };
  }, [alCambiarSuperficie, alDibujar, alEditar, alSeleccionar, geojson, habilitado, mapa, mostrar]);

  return null;
}
