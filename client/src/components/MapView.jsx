import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icons for Vite/Webpack bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom blood-drop icon for donors
const donorIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px; height:36px; border-radius:50% 50% 50% 0;
    background:linear-gradient(135deg,#e11d48,#9f1239);
    transform:rotate(-45deg); display:flex; align-items:center;
    justify-content:center; border:2px solid rgba(255,255,255,0.3);
    box-shadow:0 2px 8px rgba(225,29,72,0.5);">
    <span style="transform:rotate(45deg);color:white;font-weight:700;font-size:9px;">
      🩸
    </span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

// Request marker (hospital cross icon)
const requestIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px; height:36px; border-radius:8px;
    background:linear-gradient(135deg,#7c3aed,#4c1d95);
    display:flex; align-items:center; justify-content:center;
    border:2px solid rgba(255,255,255,0.3);
    box-shadow:0 2px 8px rgba(124,58,237,0.5);">
    <span style="color:white;font-size:16px;">🏥</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

// User location icon
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px; height:18px; border-radius:50%;
    background:#3b82f6; border:3px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,0.3);">
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Component to re-center map when center changes
const MapCenter = ({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom())
  }, [center, zoom, map])
  return null
}

/**
 * MapView Component
 * Renders an OpenStreetMap with donors and blood request markers
 */
const MapView = ({
  donors = [],
  requests = [],
  userLocation = null,
  radius = null,
  height = '400px',
  center = null,
  zoom = 13,
  onDonorClick = null,
  onRequestClick = null,
}) => {
  const defaultCenter = center ||
    (userLocation ? [userLocation.latitude, userLocation.longitude] : [20.5937, 78.9629]) // India center

  return (
    <div className="map-container rounded-xl overflow-hidden border border-slate-800" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Dark themed tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <MapCenter center={center || (userLocation ? [userLocation.latitude, userLocation.longitude] : null)} zoom={zoom} />

        {/* User location marker */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userIcon}
            >
              <Popup>
                <div style={{ color: '#e2e8f0', background: '#1e293b', padding: '8px 12px', borderRadius: '8px', minWidth: '120px' }}>
                  <strong>📍 Your Location</strong>
                </div>
              </Popup>
            </Marker>
            {radius && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={radius * 1000}
                pathOptions={{ color: '#e11d48', fillColor: '#e11d4810', fillOpacity: 0.15, weight: 1.5, dashArray: '4 4' }}
              />
            )}
          </>
        )}

        {/* Donor markers */}
        {donors.map((donor) => {
          const [lon, lat] = donor.location?.coordinates || []
          if (!lat || !lon) return null
          return (
            <Marker
              key={donor._id}
              position={[lat, lon]}
              icon={donorIcon}
              eventHandlers={{ click: () => onDonorClick?.(donor) }}
            >
              <Popup>
                <div style={{ color: '#e2e8f0', background: '#1e293b', padding: '10px 14px', borderRadius: '10px', minWidth: '160px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{donor.name}</div>
                  <div style={{ color: '#f43f5e', fontWeight: '600' }}>{donor.bloodGroup}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>{donor.city}</div>
                  {donor.distance !== undefined && (
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{donor.distance}km away</div>
                  )}
                  <div style={{
                    marginTop: '6px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    display: 'inline-block',
                    background: donor.isAvailable ? '#052e16' : '#1c1917',
                    color: donor.isAvailable ? '#4ade80' : '#6b7280',
                  }}>
                    {donor.isAvailable ? '✅ Available' : '⛔ Unavailable'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Blood request markers */}
        {requests.map((req) => {
          const [lon, lat] = req.location?.coordinates || []
          if (!lat || !lon) return null
          return (
            <Marker
              key={req._id}
              position={[lat, lon]}
              icon={requestIcon}
              eventHandlers={{ click: () => onRequestClick?.(req) }}
            >
              <Popup>
                <div style={{ color: '#e2e8f0', background: '#1e293b', padding: '10px 14px', borderRadius: '10px', minWidth: '180px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{req.hospitalName}</div>
                  <div style={{ color: '#f43f5e', fontWeight: '600' }}>{req.bloodGroup} • {req.unitsRequired} units</div>
                  <div style={{
                    marginTop: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    display: 'inline-block',
                    background: req.urgencyLevel === 'critical' ? '#450a0a' : '#431407',
                    color: req.urgencyLevel === 'critical' ? '#fca5a5' : '#fdba74',
                  }}>
                    {req.urgencyLevel?.toUpperCase()}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default MapView
