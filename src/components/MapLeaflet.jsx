import React, { useEffect, useRef, useState } from 'react';

export default function MapLeaflet({
  center = [50.0647, 19.9450],
  zoom = 13,
  filterCategory = null // null | 'bar' | 'pub' | 'klub_nocny' etc.
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // kolor ikony wg kategorii (zwraca nazwy klas)
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

  // prosty Levenshtein (pozostawiony jeśli potrzeba dopasowań)
  function levenshtein(a = '', b = '') {
    a = a.split(''); b = b.split('');
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prevRow = Array(n + 1).fill(0).map((_, i) => i);
    for (let i = 1; i <= m; i++) {
      let curRow = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curRow[j] = Math.min(
          prevRow[j] + 1,
          curRow[j - 1] + 1,
          prevRow[j - 1] + cost
        );
      }
      prevRow = curRow;
    }
    return prevRow[n];
  }

  // formatter operating_hours { monday:"...", ... } -> tekst PL (linia na dzień)
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

  // helper: create Leaflet icon with className that we color via CSS
  function makeIcon(cat) {
    return window.L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: coloredIconClass(cat)
    });
  }

  useEffect(() => {
    // dodaj style kolorów do dokumentu raz
    if (!document.getElementById('mapleaflet-category-styles')) {
      const style = document.createElement('style');
      style.id = 'mapleaflet-category-styles';
      style.innerHTML = `
        .marker-red { filter: hue-rotate(0deg) saturate(2); }
        .marker-blue { filter: hue-rotate(200deg) saturate(1.6); }
        .marker-purple { filter: hue-rotate(280deg) saturate(1.6); }
        .marker-green { filter: hue-rotate(100deg) saturate(1.4); }
      `;
      document.head.appendChild(style);
    }

    if (!window.L) {
      console.error('Leaflet (L) not found. Dodaj CDN script do index.html lub zainstaluj leaflet.');
      return;
    }

    if (!mapRef.current) {
      mapRef.current = window.L.map(containerRef.current).setView(center, zoom);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    let cancelled = false;

    const ratingsFetch = fetch('/ratings.json')
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({}));

    const scraperCacheFetch = fetch('/maps-bars.json')
      .then(res => {
        if (!res.ok) return ({ places: [], last_updated: null });
        return res.json();
      })
      .catch(() => ({ places: [], last_updated: null }));

    Promise.all([ratingsFetch, scraperCacheFetch]).then(([ratings, cache]) => {
      if (cancelled) return;

      // last_updated
      const lu = cache?.last_updated || cache?.places?.last_updated || null;
      setLastUpdated(lu || null);

      // remove previous markers layer
      if (mapRef.current._barsLayer) {
        mapRef.current.removeLayer(mapRef.current._barsLayer);
      }

      const places = Array.isArray(cache) ? cache : (cache.places || []);
      const markers = [];

      places.forEach(place => {
        // filter by category prop
        if (filterCategory && place.category && place.category !== filterCategory) return;

        const name = place.name || place.title || 'Brak nazwy';
        const lat = place.gps_coordinates?.latitude ?? place.latitude;
        const lon = place.gps_coordinates?.longitude ?? place.longitude;
        if (lat == null || lon == null) return;

        const match = ratings[normalize(name)];

        const displayName = match?.displayName ?? name;
        const starsValue = match?.stars ?? place.rating ?? null;
        const reviewsValue = match?.reviews ?? place.reviews ?? place.user_ratings_total ?? null;
        const hoursText = match?.hours ?? formatOperatingHours(place.operating_hours);

        const starsHtml = renderStars(starsValue);
        const reviewsHtml = reviewsValue ? ` <small style="color:#666">(${reviewsValue} opinii)</small>` : '';
        const catLabel = place.category ? `<span style="display:inline-block;margin-left:.5rem;padding:.15rem .4rem;border-radius:.35rem;background:#f1f1f1;font-size:.75rem">${place.category.replace('_',' ')}</span>` : '';

        const popupHtml = `<div style="min-width:220px">
          <div style="display:flex;align-items:center;gap:.5rem">
            <strong style="flex:1">${displayName}</strong>${catLabel}
          </div>
          <div style="margin-top:.25rem">${starsHtml}${reviewsHtml}</div>
          ${hoursText ? `<div style="margin-top:.5rem"><small style="color:#666">Godziny:</small><pre style="margin:.25rem 0;white-space:pre-wrap;font:inherit">${hoursText}</pre></div>` : '<div style="margin-top:.5rem"><small style="color:#666">Godziny: Brak danych</small></div>'}
          <div style="margin-top:.4rem">
            <button class="join-btn" data-name="${displayName}" style="padding:.25rem .5rem;font-size:.85rem">Dołącz</button>
          </div>
        </div>`;

        const icon = makeIcon(place.category);
        const marker = window.L.marker([lat, lon], { icon });
        marker.bindPopup(popupHtml);
        markers.push(marker);
      });

      const layerGroup = window.L.layerGroup(markers);
      layerGroup.addTo(mapRef.current);
      mapRef.current._barsLayer = layerGroup;

      mapRef.current.on('popupopen', (e) => {
        const btn = e.popup._contentNode && e.popup._contentNode.querySelector('.join-btn');
        if (btn) {
          btn.onclick = () => {
            const place = btn.getAttribute('data-name');
            console.log('Dołącz do:', place);
            alert(`Formularz dołączenia: ${place}`);
          };
        }
      });
    });

    return () => { cancelled = true; };
  }, [center, zoom, filterCategory]);

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
