const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = process.env.SERPAPI_KEY;
if (!API_KEY) {
  console.error('Brak SERPAPI_KEY w środowisku.');
  process.exit(1);
}

// frazy mapowane wyłącznie na 3 kategorie: bar | pub | klub_nocny
const QUERIES = [
  // ogólne
  { q: 'bar Kraków', category: 'bar' },
  { q: 'pub Kraków', category: 'pub' },
  { q: 'klub nocny Kraków', category: 'klub_nocny' },

  // typy i cechy przypisane do "bar"
  { q: 'cocktail bar Kraków', category: 'bar' },
  { q: 'shot bar Kraków', category: 'bar' },
  { q: 'wine bar Kraków', category: 'bar' },
  { q: 'craft beer Kraków', category: 'bar' },
  { q: 'taproom Kraków', category: 'bar' },
  { q: 'brewpub Kraków', category: 'bar' },
  { q: 'rooftop bar Kraków', category: 'bar' },
  { q: 'bar z muzyką na żywo Kraków', category: 'bar' },
  { q: 'live music bar Kraków', category: 'bar' },
  { q: 'bar z DJ Kraków', category: 'bar' },
  { q: 'karaoke bar Kraków', category: 'bar' },
  { q: 'cocktail lounge Kraków', category: 'bar' },
  { q: 'gastro bar Kraków', category: 'bar' },
  { q: 'bar z tapas Kraków', category: 'bar' },
  { q: 'after hours bar Kraków', category: 'bar' },
  { q: '24h bar Kraków', category: 'bar' },

  // typy i cechy przypisane do "pub"
  { q: 'irish pub Kraków', category: 'pub' },
  { q: 'sports bar Kraków', category: 'pub' }, // sportsy często jako pub
  { q: 'bar studencki Kraków', category: 'pub' },
  { q: 'local pub Kraków', category: 'pub' },

  // typy i cechy przypisane do "klub_nocny"
  { q: 'club Kraków', category: 'klub_nocny' },
  { q: 'late night club Kraków', category: 'klub_nocny' },
  { q: 'dance club Kraków', category: 'klub_nocny' },
  { q: 'electronic club Kraków', category: 'klub_nocny' }
];

// grid punktów wokół centrum (możesz dopisać więcej)
const GRID = [
  '@50.0647,19.9450,15z', // centrum
  '@50.0705,19.9400,15z', // północny zachód
  '@50.0590,19.9400,15z', // południowy zachód
  '@50.0647,19.9550,15z', // wschód
  '@50.0647,19.9350,15z'  // zachód
];

// parametry deduplikacji i limity
const COORD_EPS = 0.0006; // ~60m
const DETAILS_LIMIT = 80; // max dodatkowych zapytań place/details
const SLEEP_MS_BETWEEN = 300; // pauza między zapytaniami

function normalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function closeEnough(aLat, aLng, bLat, bLng) {
  return Math.hypot(aLat - bLat, aLng - bLng) < COORD_EPS;
}
function isSame(a, b) {
  const na = normalize(a.name || a.title || '');
  const nb = normalize(b.name || b.title || '');
  if (na && nb && na === nb) return true;
  const al = a.gps_coordinates || { latitude: a.lat, longitude: a.lng };
  const bl = b.gps_coordinates || { latitude: b.lat, longitude: b.lng };
  if (al.latitude != null && bl.latitude != null && al.longitude != null && bl.longitude != null) {
    if (closeEnough(al.latitude, al.longitude, bl.latitude, bl.longitude)) return true;
  }
  return false;
}
function mergeUnique(existing, incoming) {
  for (const p of incoming) {
    const dup = existing.find(x => isSame(x, p));
    if (!dup) existing.push(p);
    else {
      dup.rating = dup.rating ?? p.rating;
      dup.reviews = dup.reviews ?? (p.reviews ?? p.user_ratings_total);
      dup.operating_hours = dup.operating_hours ?? p.operating_hours;
      dup.address = dup.address ?? p.address;
      // kategoria może pochodzić z pierwszego trafienia; zachowaj jeśli istnieje
      dup.category = dup.category ?? p.category;
      dup.gps_coordinates = dup.gps_coordinates ?? p.gps_coordinates ?? (p.lat != null && p.lng != null ? { latitude: p.lat, longitude: p.lng } : undefined);
      dup.place_id = dup.place_id ?? p.place_id;
    }
  }
}

async function fetchSearch(q, ll) {
  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&q=${encodeURIComponent(q)}&ll=${ll}&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('SerpApi search error', res.status, await res.text());
    return [];
  }
  const json = await res.json();
  return json.local_results || json.places || json.results || [];
}

async function fetchPlaceDetails(place_id) {
  if (!place_id) return null;
  const url = `https://serpapi.com/search.json?engine=google_maps&q=&google_place_id=${place_id}&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const det = json.place || json.local_result || json.result || json;
  return det;
}

(async () => {
  const merged = [];

  for (const ll of GRID) {
    for (const item of QUERIES) {
      console.log(`Fetching "${item.q}" @ ${ll} -> category ${item.category}`);
      try {
        const raw = await fetchSearch(item.q, ll);
        const places = raw.map(p => ({
          name: p.title || p.name,
          rating: p.rating,
          reviews: p.reviews ?? p.user_ratings_total,
          operating_hours: p.operating_hours,
          gps_coordinates: p.gps_coordinates || (p.lat != null && p.lng != null ? { latitude: p.lat, longitude: p.lng } : undefined),
          address: p.address,
          category: item.category,
          place_id: p.place_id || p.place_id
        }));
        mergeUnique(merged, places);
        console.log(`  got ${places.length}, merged total ${merged.length}`);
        await new Promise(r => setTimeout(r, SLEEP_MS_BETWEEN));
      } catch (err) {
        console.error('Fetch error for', item.q, err && err.message ? err.message : err);
      }
    }
  }

  // opcjonalne pobieranie szczegółów dla miejsc bez hours/rating (ograniczone)
  let detailsCount = 0;
  for (let i = 0; i < merged.length && detailsCount < DETAILS_LIMIT; i++) {
    const p = merged[i];
    if ((!p.operating_hours || !p.rating) && p.place_id) {
      try {
        const det = await fetchPlaceDetails(p.place_id);
        if (det) {
          p.operating_hours = p.operating_hours ?? det.operating_hours ?? det.opening_hours;
          p.rating = p.rating ?? det.rating;
          p.reviews = p.reviews ?? (det.reviews ?? det.user_ratings_total);
        }
        detailsCount++;
        await new Promise(r => setTimeout(r, SLEEP_MS_BETWEEN + 50));
      } catch (e) {
        /* ignore */
      }
    }
  }

  // zapisz wynik
  try {
    fs.writeFileSync('public/maps-bars.json', JSON.stringify({
      places: merged,
      last_updated: new Date().toISOString().slice(0,10),
      meta: { queries: QUERIES.map(q => q.q), grid: GRID, generated_at: new Date().toISOString() }
    }, null, 2));
    console.log(`Saved public/maps-bars.json with ${merged.length} unique places (details fetched: ${detailsCount})`);
  } catch (err) {
    console.error('Write error:', err);
    process.exit(1);
  }
})();
