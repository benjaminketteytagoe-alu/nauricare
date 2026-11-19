"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { KIGALI, type LatLng } from "@/lib/geo/distance";

// Leaflet is browser-only: import this file with next/dynamic({ ssr: false }).
// Pins are HTML divIcons (no external marker images, so the CSP stays tight).

export interface MapProvider {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  position: LatLng;
  distanceLabel?: string;
}

const initials = (name: string) => name.split(/\s+/).filter((w) => w && !/^dr\.?$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function providerIcon(name: string, active: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
    html: `<span class="flex h-10 w-10 items-center justify-center rounded-full rounded-bl-none -rotate-45 border-2 border-white shadow-lg ${active ? "bg-nc-berry" : "bg-nc-primary"}"><span class="rotate-45 text-xs font-bold text-white">${escape(initials(name))}</span></span>`,
  });
}

const meIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span class="block h-[22px] w-[22px] rounded-full border-4 border-white bg-emerald-500 shadow-lg ring-4 ring-emerald-500/30"></span>`,
});

function FitToMarkers({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the point set
  }, [map, key]);
  return null;
}

export default function ProviderMap({
  providers,
  me,
  selectedId,
  onSelect,
}: {
  providers: MapProvider[];
  me: LatLng | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const points = [...providers.map((p) => p.position), ...(me ? [me] : [])];
  return (
    <MapContainer center={[KIGALI.lat, KIGALI.lng]} zoom={12} scrollWheelZoom={false} className="h-full w-full" aria-label="Map of specialists">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitToMarkers points={points} />
      {me && <Marker position={[me.lat, me.lng]} icon={meIcon} title="You are here" />}
      {providers.map((p) => (
        <Marker key={p.id} position={[p.position.lat, p.position.lng]} icon={providerIcon(p.name, p.id === selectedId)} eventHandlers={{ click: () => onSelect(p.id) }} title={p.name}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.specialty}
            <br />
            {p.clinic}
            {p.distanceLabel && (
              <>
                <br />
                {p.distanceLabel}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
