import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Activity } from '../types';

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    const withCoords = activities.filter((a) => a.lat != null && a.lng != null);
    const key = withCoords.map((a) => `${a.lat},${a.lng}`).join('|');
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat!, withCoords[0].lng!], 13);
    } else {
      const bounds = L.latLngBounds(withCoords.map((a) => [a.lat!, a.lng!] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [activities, map]);

  return null;
}

interface MapViewProps {
  activities: Activity[];
  className?: string;
}

export default function MapView({ activities, className = '' }: MapViewProps) {
  const withCoords = activities.filter((a) => a.lat != null && a.lng != null);
  const defaultCenter: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].lat!, withCoords[0].lng!]
      : [20.5937, 78.9629];

  return (
    <div className={`overflow-hidden rounded-lg ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={withCoords.length === 1 ? 13 : 6}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds activities={activities} />
        {withCoords.map((act, i) => (
          <Marker key={`${act.name}-${i}`} position={[act.lat!, act.lng!]} icon={pinIcon}>
            <Popup>
              <strong>{act.name}</strong>
              <br />
              {act.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
