import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

export const clinicCoordinates = {
  lat: -29.1434531,
  lon: -59.2704958
}

const clinicMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export function ContactMap ({ className = 'h-64 w-full' }) {
  const position = [clinicCoordinates.lat, clinicCoordinates.lon]

  return (
    <MapContainer
      center={position}
      zoom={16}
      scrollWheelZoom={false}
      className={className}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <Marker position={position} icon={clinicMarkerIcon}>
        <Popup>
          Clinica San Rafael Arcangel
          <br />
          Espana 930, Goya, Corrientes.
        </Popup>
      </Marker>
    </MapContainer>
  )
}
