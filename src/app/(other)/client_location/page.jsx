

// import dynamic from 'next/dynamic';
// import React, { useEffect, useState } from 'react';
// import ComponentContainerCard from '@/components/ComponentContainerCard';

// // Leaflet components
// const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
// const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
// const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
// const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
// const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// const ClientLocation = () => {
//   const [L, setL] = useState(null);

//   useEffect(() => {
//     import('leaflet').then((leaflet) => {
//       setL(leaflet);
//     });
//   }, []);

//   // Convert SVG to base64 icon
//   const createCustomSvgIcon = (color) => {
//     const svg = `
//       <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
//         <path fill="${color}" d="M768 512q0-106-75-181t-181-75t-181 75t-75 181t75 181t181 75t181-75t75-181m256 0q0 109-33 179l-364 774q-16 33-47.5 52t-67.5 19t-67.5-19t-46.5-52L33 691Q0 621 0 512q0-212 150-362T512 0t362 150t150 362"/>
//       </svg>
//     `;
//     return new L.Icon({
//       iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),

//       iconSize: [40, 60],

//       iconAnchor: [20, 60],
//       popupAnchor: [0, -55]
//     });
//   };

//   const getMarkerIcon = (status) => {
//     const colorMap = {
//       pickup: '#0000ff',
//       delivered: '#00cc44',
//       reschedule: '#ff9900',
//       return: '#cc0000'
//     };
//     return L ? createCustomSvgIcon(colorMap[status] || '#808080') : null;
//   };

//   const statusColors = {
//     pickup: '#0000ff',
//     delivered: '#00cc44',
//     reschedule: '#ff9900',
//     return: '#cc0000'
//   };

//   const locations = [
//     { id: 1, lat: 6.9271, lng: 79.8612, status: 'pickup', label: 'Colombo Pickup' },
//     { id: 2, lat: 6.9151, lng: 79.8822, status: 'pickup', label: 'Pickup at Bambalapitiya' },
//     { id: 3, lat: 6.9147, lng: 79.9722, status: 'delivered', label: 'Delivered in Malabe' },
//     { id: 4, lat: 6.8442, lng: 79.8711, status: 'reschedule', label: 'Rescheduled in Dehiwala' },
//     { id: 5, lat: 6.9260, lng: 79.9550, status: 'return', label: 'Returned from Borella' }
//   ];

//   const haversineDistance = (lat1, lon1, lat2, lon2) => {
//     const toRad = angle => angle * Math.PI / 180;
//     const R = 6371; // km
//     const dLat = toRad(lat2 - lat1);
//     const dLon = toRad(lon2 - lon1);
//     const a = Math.sin(dLat / 2) ** 2 +
//               Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//               Math.sin(dLon / 2) ** 2;
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   };

//   const groupedByStatus = locations.reduce((acc, loc) => {
//     acc[loc.status] = acc[loc.status] || [];
//     acc[loc.status].push(loc);
//     return acc;
//   }, {});

//   const polylines = [];
//   const distances = {};

//   Object.entries(groupedByStatus).forEach(([status, locs]) => {
//     if (locs.length >= 2) {
//       const coords = locs.map(l => [l.lat, l.lng]);
//       polylines.push({ coords, color: statusColors[status] });

//       // Calculate total distance
//       let dist = 0;
//       for (let i = 0; i < coords.length - 1; i++) {
//         dist += haversineDistance(
//           coords[i][0], coords[i][1],
//           coords[i + 1][0], coords[i + 1][1]
//         );
//       }
//       distances[status] = dist.toFixed(2);
//     }
//   });

//   return (
//     <div>
//       <ComponentContainerCard title="Client Location">
//         <MapContainer center={[6.9271, 79.8612]} zoom={13} scrollWheelZoom style={{ height: '400px', width: '100%' }}>
//           <TileLayer
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           />

//           {/* Colored Polylines */}
//           {L && polylines.map((p, idx) => (
//             <Polyline key={idx} positions={p.coords} pathOptions={{ color: p.color, weight: 4 }} />
//           ))}

//           {/* Markers */}
//           {L && locations.map(loc => (
//             <Marker
//               key={loc.id}
//               position={[loc.lat, loc.lng]}
//               icon={getMarkerIcon(loc.status)}
//             >
//               <Popup>
//                 <strong>{loc.label}</strong><br />
//                 Status: {loc.status}
//               </Popup>
//             </Marker>
//           ))}
//         </MapContainer>
//         {/* Distance Info */}
//         <div className="mt-3">
//           {Object.entries(distances).map(([status, dist]) => (
//             <div key={status}>
//               <strong style={{ color: statusColors[status] }}>
//                 {status.charAt(0).toUpperCase() + status.slice(1)} Route:
//               </strong> {dist} km
//             </div>
//           ))}
//         </div>
//       </ComponentContainerCard>
//     </div>
//   );
// };

// export default ClientLocation;

// components/MapWithMarkers.tsx
// components/MapWithMarkers.tsx

import React from 'react'

const ClientLocation = () => {
  return (
    <div>ClientLocation</div>
  )
}

export default ClientLocation