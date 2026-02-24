/**
 * Amadeus から高級ホテル（一泊8万円以上）を取得し、ローカル JSON に保存するスクリプト。
 * 実行回数を抑えるため、取得結果は data/out/luxury_hotels.json に保存し、アプリはこのファイルを読み込みます。
 *
 * 使い方:
 *   set AMADEUS_CLIENT_ID=your_key
 *   set AMADEUS_CLIENT_SECRET=your_secret
 *   node scripts/fetch_luxury_hotels.js
 *
 * オプション:
 *   CHECK_IN=2025-03-01 CHECK_OUT=2025-03-02 node scripts/fetch_luxury_hotels.js
 */

const fs = require('fs');
const path = require('path');

const MIN_PRICE_PER_NIGHT_YEN = 80000;
const BATCH_SIZE = 10;  // Hotel Search は一度に渡す hotelIds の数
const DELAY_MS = 400;   // API 間隔（レート制限対策）

const BASE_URL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';

// 取得対象の IATA 都市コード（必要に応じて追加）
const CITIES = [
  'TYO',  // 東京
  'OSA',  // 大阪
  'PAR',  // パリ
  'LON',  // ロンドン
  'NYC',  // ニューヨーク
  'SIN',  // シンガポール
  'HKG',  // 香港
  'DXB',  // ドバイ
  'ROM',  // ローマ
  'MIL',  // ミラノ
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET');
  }
  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Hotel List API by city → hotelIds + name, geo, address, countryCode
 */
async function fetchHotelListByCity(token, cityCode) {
  const url = new URL(`${BASE_URL}/v1/reference-data/locations/hotels/by-city`);
  url.searchParams.set('cityCode', cityCode);
  url.searchParams.set('ratings', '5'); // 5つ星に絞って件数削減（任意）

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn(`Hotel List ${cityCode}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || [];
  return list.map((h) => ({
    hotelId: h.hotelId,
    name: h.name || '',
    lat: h.geoCode?.latitude ?? 0,
    lng: h.geoCode?.longitude ?? 0,
    countryCode: h.address?.countryCode || '',
    cityName: cityCode,
  }));
}

/**
 * Hotel Search API → offers with price (JPY)
 */
async function fetchHotelOffers(token, hotelIds, checkIn, checkOut) {
  if (hotelIds.length === 0) return [];
  const url = new URL(`${BASE_URL}/v3/shopping/hotel-offers`);
  url.searchParams.set('hotelIds', hotelIds.slice(0, BATCH_SIZE).join(','));
  url.searchParams.set('adults', '1');
  url.searchParams.set('checkInDate', checkIn);
  url.searchParams.set('checkOutDate', checkOut);
  url.searchParams.set('currency', 'JPY');
  url.searchParams.set('roomQuantity', '1');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn(`Hotel Search: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const items = data.data || [];
  const offers = [];
  for (const item of items) {
    if (!item.offers || item.offers.length === 0) continue;
    const hotel = item.hotel || {};
    const offer = item.offers[0];
    const price = offer.price || {};
    const total = parseFloat(price.total || price.base || 0);
    const checkInD = new Date(checkIn);
    const checkOutD = new Date(checkOut);
    const nights = Math.max(1, (checkOutD - checkInD) / (24 * 60 * 60 * 1000));
    const pricePerNight = Math.round(total / nights);
    if (pricePerNight >= MIN_PRICE_PER_NIGHT_YEN) {
      offers.push({
        hotelId: hotel.hotelId || item.hotelId,
        name: hotel.name || '',
        lat: hotel.latitude ?? 0,
        lng: hotel.longitude ?? 0,
        cityCode: hotel.cityCode || '',
        pricePerNight,
        currency: price.currency || 'JPY',
        total,
        checkIn,
        checkOut,
      });
    }
  }
  return offers;
}

function mergeWithList(offers, listMap) {
  return offers.map((o) => {
    const fromList = listMap.get(o.hotelId) || {};
    return {
      id: o.hotelId,
      lat: o.lat || fromList.lat,
      lng: o.lng || fromList.lng,
      name: o.name || fromList.name,
      pricePerNight: o.pricePerNight,
      currency: o.currency,
      address: fromList.address || '',
      countryCode: fromList.countryCode || '',
      cityName: o.cityCode || fromList.cityName || '',
      checkIn: o.checkIn,
      checkOut: o.checkOut,
    };
  });
}

async function main() {
  const checkIn = process.env.CHECK_IN || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();
  const checkOut = process.env.CHECK_OUT || (() => {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  console.log('Amadeus token...');
  const token = await getToken();
  console.log('Fetching hotels (min price/night: JPY %s)...', MIN_PRICE_PER_NIGHT_YEN.toLocaleString());

  const listMap = new Map(); // hotelId -> { name, lat, lng, countryCode, cityName }
  const allOffers = [];

  for (const cityCode of CITIES) {
    await sleep(DELAY_MS);
    const list = await fetchHotelListByCity(token, cityCode);
    console.log('  %s: list %d hotels', cityCode, list.length);
    for (const h of list) {
      listMap.set(h.hotelId, {
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        countryCode: h.countryCode,
        cityName: h.cityName,
      });
    }
    const ids = list.map((h) => h.hotelId).filter(Boolean);
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await sleep(DELAY_MS);
      const offers = await fetchHotelOffers(token, batch, checkIn, checkOut);
      allOffers.push(...offers);
    }
  }

  const merged = mergeWithList(allOffers, listMap);
  const seen = new Set();
  const hotels = merged.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return h.lat && h.lng;
  });

  const out = {
    generatedAt: new Date().toISOString(),
    checkIn,
    checkOut,
    minPricePerNightYen: MIN_PRICE_PER_NIGHT_YEN,
    hotels,
  };

  const jsonStr = JSON.stringify(out, null, 2);
  const outDir = path.join(__dirname, '..', 'data', 'out');
  const appDir = path.join(__dirname, '..', 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });
  const outPath = path.join(outDir, 'luxury_hotels.json');
  const appPath = path.join(appDir, 'luxury_hotels.json');
  fs.writeFileSync(outPath, jsonStr, 'utf8');
  fs.writeFileSync(appPath, jsonStr, 'utf8');
  console.log('Saved %d hotels to %s and %s', hotels.length, outPath, appPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
