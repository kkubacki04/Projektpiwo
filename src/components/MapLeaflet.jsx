import React, { useEffect, useRef, useState } from 'react';


const normalize = (s) =>
  (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const renderStars = (n) => {
  if (n === null || n === undefined) return '—';
  const full = Math.floor(n);
  const half = (n - full) >= 0.5;
  let out = '★'.repeat(full);
  if (half) out += '☆';
  out = out.padEnd(5, '☆');
  return `<span style="color:#f4c542;font-weight:700">${out}</span>`;
};

function formatOperatingHours(oh) {
  if (!oh || typeof oh !== 'object') return '';
  const mapKey = {
    monday: 'poniedziałek', tuesday: 'wtorek', wednesday: 'środa',
    thursday: 'czwartek', friday: 'piątek', saturday: 'sobota', sunday: 'niedziela'
  };
  const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const lines = [];
  for (const k of order) {
    const val = oh[k];
    if (!val) continue;
    lines.push(`${mapKey[k]} ${val}`);
  }
  return lines.join('\n');
}

function isNear(lat1, lng1, lat2, lng2) {
  const threshold = 0.00005;
  return Math.abs(lat1 - lat2) < threshold && Math.abs(lng1 - lng2) < threshold;
}

function groupMeetings(meetingsList) {
  const groups = [];
  meetingsList.forEach(m => {
    const latVal = Number(m.lat);
    const lngVal = Number(m.lng);
    if (isNaN(latVal) || isNaN(lngVal)) return;

    let existingGroup = groups.find(g => isNear(g.lat, g.lng, latVal, lngVal));
    
    if (existingGroup) {
      existingGroup.items.push(m);
    } else {
      groups.push({
        lat: latVal,
        lng: lngVal,
        items: [m]
      });
    }
  });
  return groups;
}

export default function MapLeaflet({
  center = [50.0647, 19.9450],
  zoom = 13,
  filterCategory = null,
  meetings = [],
  onJoin,
  onCreateClick,
  onViewProfile
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!window.L) {
      console.warn('Leaflet nie jest jeszcze załadowany. Mapa może się nie wyświetlić.');
      return;
    }

    if (!document.getElementById('mapleaflet-category-styles')) {
      const style = document.createElement('style');
      style.id = 'mapleaflet-category-styles';
      style.innerHTML = `
        .marker-red { filter: hue-rotate(0deg) saturate(2); }
        .marker-blue { filter: hue-rotate(200deg) saturate(1.6); }
        .marker-purple { filter: hue-rotate(280deg) saturate(1.6); }
        .marker-green { filter: hue-rotate(100deg) saturate(1.4); }
        
        .participant-avatar:hover { transform: scale(1.1); border-color: #0d6efd !important; opacity: 0.8; }
        
        .meeting-list {
            max-height: 200px;
            overflow-y: auto;
            border-top: 1px solid #ccc;
            margin-top: 8px;
            padding-top: 8px;
            background: #fff9e6;
            padding: 5px;
            border-radius: 4px;
        }
        .meeting-item {
            padding: 8px 0;
            border-bottom: 1px solid #e0d0a0;
        }
        .meeting-item:last-child {
            border-bottom: none;
        }
      `;
      document.head.appendChild(style);
    }

    function colorForCategory(cat) {
      if (!cat) return 'green';
      if (cat === 'bar') return 'red';
      if (cat === 'pub') return 'blue';
      if (cat === 'klub_nocny') return 'purple';
      return 'green';
    }
  
    function coloredIconClass(cat) {
      return `marker-${colorForCategory(cat)}`;
    }

    const makeIcon = (cat) => {
      return window.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: coloredIconClass(cat)
      });
    };

    const goldIcon = window.L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    if (!mapRef.current) {
      mapRef.current = window.L.map(containerRef.current).setView(center, zoom);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    let cancelled = false;

    const ratingsFetch = fetch('/ratings.json').then(res => res.ok ? res.json() : {}).catch(() => ({}));
    const scraperCacheFetch = fetch('/maps-bars.json').then(res => res.ok ? res.json() : { places: [] }).catch(() => ({ places: [] }));

    Promise.all([ratingsFetch, scraperCacheFetch]).then(([ratings, cache]) => {
      if (cancelled) return;

      const lu = cache?.last_updated || cache?.places?.last_updated || null;
      setLastUpdated(lu || null);

      if (mapRef.current._barsLayer) {
        mapRef.current.removeLayer(mapRef.current._barsLayer);
      }

      const places = Array.isArray(cache) ? cache : (cache.places || []);
      const markers = [];

      const meetingGroups = groupMeetings(meetings);

      places.forEach(place => {
        if (filterCategory && place.category && place.category !== filterCategory) return;

        const name = place.name || place.title || 'Brak nazwy';
        const lat = place.gps_coordinates?.latitude ?? place.latitude;
        const lon = place.gps_coordinates?.longitude ?? place.longitude;
        if (lat == null || lon == null) return;

        const matchingGroupIndex = meetingGroups.findIndex(g => isNear(g.lat, g.lng, lat, lon));
        const matchingGroup = matchingGroupIndex !== -1 ? meetingGroups[matchingGroupIndex] : null;

        if (matchingGroupIndex !== -1) {
            meetingGroups.splice(matchingGroupIndex, 1);
        }

        const match = ratings[normalize(name)];
        const displayName = match?.displayName ?? name;
        const starsValue = match?.stars ?? place.rating ?? null;
        const reviewsValue = match?.reviews ?? place.reviews ?? place.user_ratings_total ?? null;
        const hoursText = match?.hours ?? formatOperatingHours(place.operating_hours);
        const starsHtml = renderStars(starsValue);
        const reviewsHtml = reviewsValue ? ` <small style="color:#666">(${reviewsValue} opinii)</small>` : '';
        const catLabel = place.category ? `<span style="display:inline-block;margin-left:.5rem;padding:.15rem .4rem;border-radius:.35rem;background:#f1f1f1;font-size:.75rem">${place.category.replace('_',' ')}</span>` : '';

        let popupHtml = `<div style="min-width:240px">
          <div style="display:flex;align-items:center;gap:.5rem">
            <strong style="flex:1">${displayName}</strong>${catLabel}
          </div>
          <div style="margin-top:.25rem">${starsHtml}${reviewsHtml}</div>
          ${hoursText ? `<div style="margin-top:.5rem"><small style="color:#666">Godziny:</small><pre style="margin:.25rem 0;white-space:pre-wrap;font:inherit">${hoursText}</pre></div>` : '<div style="margin-top:.5rem"><small style="color:#666">Godziny: Brak danych</small></div>'}
        `;

        if (matchingGroup) {
            let meetingsListHtml = '';
            matchingGroup.items.forEach(m => {
                let participantsHtml = '';
                if (m.participants && m.participants.length > 0) {
                    participantsHtml = '<div style="margin-top:5px; display:flex; gap:4px; flex-wrap:wrap;">';
                    m.participants.forEach(p => {
                        const avatar = p.avatar_url || '/avatar.jpg';
                        participantsHtml += `<img src="${avatar}" class="participant-avatar view-profile-btn" data-uid="${p.id}" title="${p.first_name} ${p.last_name}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; cursor:pointer; border:1px solid #ccc;" />`;
                    });
                    participantsHtml += '</div>';
                } else {
                    participantsHtml = '<div style="margin-top:2px"><small class="text-muted" style="font-size:0.8em">Jeszcze nikt nie dołączył</small></div>';
                }

                meetingsListHtml += `
                  <div class="meeting-item">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <strong>${m.title}</strong>
                            <div style="font-size:0.85em; color:#555">📅 ${new Date(m.meeting_time).toLocaleString()}</div>
                        </div>
                        <button class="join-meeting-btn btn btn-sm btn-success" style="padding: 1px 6px; font-size: 0.8em;" data-id="${m.id}">Dołącz</button>
                    </div>
                    <p style="margin:4px 0 0 0; font-size:0.9em; color:#333">${m.description || ''}</p>
                    ${participantsHtml}
                  </div>
                `;
            });

            popupHtml += `
              <div class="meeting-list">
                 <h6 style="margin-bottom:5px; color:#d4af37; font-weight:bold; font-size:0.9rem;">🟡 Spotkania tutaj (${matchingGroup.items.length})</h6>
                 ${meetingsListHtml}
              </div>
            `;
        }

        popupHtml += `
          <div style="margin-top:.6rem; display:flex; gap:5px;">
            <button class="join-btn btn btn-sm btn-outline-secondary" data-name="${displayName}">Info</button>
            <button class="create-meeting-btn btn btn-sm btn-primary" data-name="${displayName}" data-lat="${lat}" data-lng="${lon}">
                ${matchingGroup ? '+ Dodaj kolejne' : 'Zorganizuj spotkanie'}
            </button>
          </div>
        </div>`;

        const icon = matchingGroup ? goldIcon : makeIcon(place.category);
        const zIndexOffset = matchingGroup ? 1000 : 0;

        const marker = window.L.marker([lat, lon], { icon, zIndexOffset });
        marker.bindPopup(popupHtml);
        markers.push(marker);
      });

      meetingGroups.forEach(group => {
          let meetingsListHtml = '';
          group.items.forEach(m => {
             let participantsHtml = '';
             if (m.participants && m.participants.length > 0) {
                 participantsHtml = '<div style="margin-top:5px; display:flex; gap:4px; flex-wrap:wrap;">';
                 m.participants.forEach(p => {
                    const avatar = p.avatar_url || '/avatar.jpg';
                    participantsHtml += `<img src="${avatar}" class="participant-avatar view-profile-btn" data-uid="${p.id}" title="${p.first_name} ${p.last_name}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; cursor:pointer; border:1px solid #ccc;" />`;
                 });
                 participantsHtml += '</div>';
             } else {
                 participantsHtml = '<div style="margin-top:2px"><small class="text-muted" style="font-size:0.8em">Jeszcze nikt nie dołączył</small></div>';
             }

             meetingsListHtml += `
                <div class="meeting-item">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div><strong>${m.title}</strong><br/><small>${new Date(m.meeting_time).toLocaleString()}</small></div>
                        <button class="join-meeting-btn btn btn-sm btn-success" style="padding: 1px 6px; font-size: 0.8em;" data-id="${m.id}">Dołącz</button>
                    </div>
                    ${participantsHtml}
                </div>`;
          });

          const popupHtml = `<div style="min-width:240px">
             <h6 style="margin-bottom:5px; color:#d4af37; font-weight:bold;">🟡 Spotkania (własna lok.)</h6>
             <div class="meeting-list">${meetingsListHtml}</div>
             <div style="margin-top:10px;">
                <button class="create-meeting-btn btn btn-sm btn-outline-primary w-100" data-name="${group.items[0].title}" data-lat="${group.lat}" data-lng="${group.lng}">+ Zorganizuj kolejne</button>
             </div>
          </div>`;

          const marker = window.L.marker([group.lat, group.lng], { icon: goldIcon, zIndexOffset: 1000 });
          marker.bindPopup(popupHtml);
          markers.push(marker);
      });

      const layerGroup = window.L.layerGroup(markers);
      layerGroup.addTo(mapRef.current);
      mapRef.current._barsLayer = layerGroup;

      mapRef.current.on('popupopen', (e) => {
        const container = e.popup._contentNode;
        if (!container) return;

        const infoBtn = container.querySelector('.join-btn');
        if (infoBtn) {
          infoBtn.onclick = () => alert(`To jest bar: ${infoBtn.getAttribute('data-name')}`);
        }

        const createBtns = container.querySelectorAll('.create-meeting-btn');
        createBtns.forEach(btn => {
            if (onCreateClick) {
                btn.onclick = () => {
                    const name = btn.getAttribute('data-name');
                    const lat = parseFloat(btn.getAttribute('data-lat'));
                    const lng = parseFloat(btn.getAttribute('data-lng'));
                    onCreateClick({ lat, lng, name });
                    mapRef.current.closePopup();
                };
            }
        });

        const meetingBtns = container.querySelectorAll('.join-meeting-btn');
        meetingBtns.forEach(btn => {
            if (onJoin) {
                btn.onclick = () => {
                    const id = btn.getAttribute('data-id');
                    onJoin(id);
                };
            }
        });

        const profileBtns = container.querySelectorAll('.view-profile-btn');
        profileBtns.forEach(btn => {
            if (onViewProfile) {
                btn.onclick = () => {
                    const uid = btn.getAttribute('data-uid');
                    onViewProfile(uid);
                };
            }
        });
      });
    });

    return () => { cancelled = true; };
  }, [center, zoom, filterCategory, meetings]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: '#666' }}>{lastUpdated ? `Ostatnia aktualizacja: ${lastUpdated}` : 'Ostatnia aktualizacja: —'}</div>
      </div>

      <div style={{ width: '100%', height: 560, borderRadius: '.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}