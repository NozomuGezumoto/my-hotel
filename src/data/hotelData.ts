// ============================================
// Luxury Hotel Data (local JSON)
// 一泊8万円以上に絞ったデータを scripts/fetch_luxury_hotels.js で取得し保存
// ============================================

import type { HotelPin, LuxuryHotelsJson } from '../types';
import type { AppLocale } from '../i18n/locale';

import luxuryHotelsJson from './luxury_hotels.json';

const data = luxuryHotelsJson as LuxuryHotelsJson;

/** 地域 ID → 表示名（国の上レイヤー） */
export const REGION_IDS = ['asia', 'europe', 'americas', 'oceania', 'africa'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export const REGION_NAMES: Record<RegionId, string> = {
  asia: 'アジア',
  europe: 'ヨーロッパ',
  americas: '北米・中南米',
  oceania: 'オセアニア',
  africa: 'アフリカ',
};

export const REGION_NAMES_EN: Record<RegionId, string> = {
  asia: 'Asia',
  europe: 'Europe',
  americas: 'Americas',
  oceania: 'Oceania',
  africa: 'Africa',
};

/** 地域 → 国コードのリスト */
export const REGION_COUNTRIES: Record<RegionId, string[]> = {
  asia: ['JP', 'TH', 'SG', 'HK', 'AE', 'IN', 'ID', 'CN', 'MV', 'LK'],
  europe: ['FR', 'GB', 'IT', 'ES', 'AT', 'DE', 'NL', 'CH', 'PT', 'RU', 'HU'],
  americas: ['US', 'CA', 'PE'],
  oceania: ['AU'],
  africa: ['ZA'],
};

/**
 * 地域の表示名（locale 省略時は日本語）
 */
export function getRegionDisplayName(regionId: RegionId, locale: AppLocale = 'ja'): string {
  const names = locale === 'en' ? REGION_NAMES_EN : REGION_NAMES;
  return names[regionId] ?? regionId;
}

/**
 * 国が属する地域（最初に一致したもの）
 */
export function getRegionForCountry(countryCode: string): RegionId | null {
  for (const [region, codes] of Object.entries(REGION_COUNTRIES)) {
    if (codes.includes(countryCode)) return region as RegionId;
  }
  return null;
}

/** 国コード → 表示名 */
export const COUNTRY_NAMES: Record<string, string> = {
  JP: '日本',
  US: 'アメリカ',
  FR: 'フランス',
  GB: 'イギリス',
  AE: 'UAE',
  SG: 'シンガポール',
  HK: '香港',
  IT: 'イタリア',
  ES: 'スペイン',
  AT: 'オーストリア',
  DE: 'ドイツ',
  NL: 'オランダ',
  CH: 'スイス',
  TH: 'タイ',
  AU: 'オーストラリア',
  ZA: '南アフリカ',
  IN: 'インド',
  ID: 'インドネシア',
  PT: 'ポルトガル',
  MV: 'モルディブ',
  CN: '中国',
  RU: 'ロシア',
  LK: 'スリランカ',
  PE: 'ペルー',
  CA: 'カナダ',
  HU: 'ハンガリー',
};

export const COUNTRY_NAMES_EN: Record<string, string> = {
  JP: 'Japan',
  US: 'United States',
  FR: 'France',
  GB: 'United Kingdom',
  AE: 'UAE',
  SG: 'Singapore',
  HK: 'Hong Kong',
  IT: 'Italy',
  ES: 'Spain',
  AT: 'Austria',
  DE: 'Germany',
  NL: 'Netherlands',
  CH: 'Switzerland',
  TH: 'Thailand',
  AU: 'Australia',
  ZA: 'South Africa',
  IN: 'India',
  ID: 'Indonesia',
  PT: 'Portugal',
  MV: 'Maldives',
  CN: 'China',
  RU: 'Russia',
  LK: 'Sri Lanka',
  PE: 'Peru',
  CA: 'Canada',
  HU: 'Hungary',
};

/** 日本の cityName → 都道府県 */
const CITY_TO_PREFECTURE: Record<string, string> = {
  札幌: '北海道',
  仙台: '宮城県',
  TYO: '東京都',
  東京: '東京都',
  横浜: '神奈川県',
  箱根: '神奈川県',
  名古屋: '愛知県',
  NGO: '愛知県',
  金沢: '石川県',
  軽井沢: '長野県',
  京都: '京都府',
  KIX: '京都府',
  大阪: '大阪府',
  OSA: '大阪府',
  神戸: '兵庫県',
  UKB: '兵庫県',
  奈良: '奈良県',
  NRT: '奈良県',
  広島: '広島県',
  HIJ: '広島県',
  福岡: '福岡県',
  FUK: '福岡県',
  長崎: '長崎県',
  NGS: '長崎県',
  由布院: '大分県',
  YUF: '大分県',
  沖縄: '沖縄県',
  石垣島: '沖縄県',
  OKA: '沖縄県',
};

/**
 * ホテルの都道府県（日本のみ。それ以外は空文字）
 */
export function getPrefectureForHotel(hotel: HotelPin): string {
  if (hotel.countryCode !== 'JP') return '';
  return CITY_TO_PREFECTURE[hotel.cityName] ?? '';
}

/** 国コード:cityName → 州・地域（都道府県と同じ粒度の表示名） */
const ADMIN_REGION_BY_COUNTRY_CITY: Record<string, string> = {
  // US
  'US:NYC': 'ニューヨーク州',
  'US:LAX': 'カリフォルニア州',
  'US:MIA': 'フロリダ州',
  'US:LAS': 'ネバダ州',
  // FR
  'FR:PAR': 'イル=ド=フランス',
  'FR:LYO': 'オーヴェルニュ=ローヌ=アルプ',
  'FR:NCE': 'プロヴァンス=アルプ=コート・ダジュール',
  // GB
  'GB:LON': 'イングランド',
  'GB:EDI': 'スコットランド',
  // IT
  'IT:ROM': 'ラツィオ',
  'IT:MIL': 'ロンバルディア',
  'IT:FLR': 'トスカーナ',
  'IT:VCE': 'ヴェネト',
  // ES
  'ES:BCN': 'カタルーニャ',
  'ES:MAD': 'マドリード',
  // AT
  'AT:VIE': 'ウィーン',
  // DE
  'DE:BER': 'ベルリン',
  'DE:MUC': 'バイエルン',
  // NL
  'NL:AMS': '北ホラント',
  // CH
  'CH:GVA': 'ジュネーヴ',
  'CH:ZRH': 'チューリッヒ',
  // AE
  'AE:DXB': 'ドバイ',
  // SG (city-state)
  'SG:SIN': 'シンガポール',
  // HK
  'HK:HKG': '香港',
  // TH
  'TH:BKK': 'バンコク',
  // AU
  'AU:SYD': 'ニューサウスウェールズ',
  'AU:MEL': 'ビクトリア',
  // ZA
  'ZA:CPT': '西ケープ',
  // IN
  'IN:BOM': 'マハーラーシュトラ',
  'IN:DEL': 'デリー',
  // US (add SFO, CHI)
  'US:SFO': 'カリフォルニア州',
  'US:CHI': 'イリノイ州',
};

/**
 * ホテルの州・地域（都道府県と同じ粒度。全国対応）
 * 日本は都道府県、他国は州・地域名を返す
 */
export function getAdminRegionForHotel(hotel: HotelPin): string {
  if (hotel.countryCode === 'JP') return getPrefectureForHotel(hotel);
  return ADMIN_REGION_BY_COUNTRY_CITY[`${hotel.countryCode}:${hotel.cityName}`] ?? '';
}

/**
 * 国コードの表示名（locale 省略時は日本語）
 */
export function getCountryDisplayName(code: string, locale: AppLocale = 'ja'): string {
  const names = locale === 'en' ? COUNTRY_NAMES_EN : COUNTRY_NAMES;
  return names[code] ?? code;
}

/**
 * 達成対象とするブランド（この15のみ）
 */
export const COMPLETION_BRANDS = [
  'Aman',
  'Four Seasons',
  'Ritz-Carlton',
  'Mandarin Oriental',
  'Peninsula',
  'Rosewood',
  'St. Regis',
  'Park Hyatt',
  'Six Senses',
  'Bulgari Hotels',
  'Belmond',
  'Raffles',
  'Fairmont',
  'Kempinski',
  'Dorchester Collection',
] as const;

export type CompletionBrand = (typeof COMPLETION_BRANDS)[number];

/** ホテル名のパターン → 達成ブランド名（COMPLETION_BRANDS のいずれか） */
const NAME_TO_BRAND: Array<{ pattern: RegExp | string; brand: CompletionBrand }> = [
  { pattern: /^Aman\s/i, brand: 'Aman' },
  { pattern: /アマン|Aman\s/i, brand: 'Aman' },
  { pattern: /^Four Seasons\s/i, brand: 'Four Seasons' },
  { pattern: /四季/, brand: 'Four Seasons' },
  { pattern: /^Ritz-Carlton\s/i, brand: 'Ritz-Carlton' },
  { pattern: /^The Ritz\s/i, brand: 'Ritz-Carlton' },
  { pattern: /^Ritz Paris$/i, brand: 'Ritz-Carlton' },
  { pattern: /リッツ・カールトン|リッツカールトン/, brand: 'Ritz-Carlton' },
  { pattern: /^Mandarin Oriental\s/i, brand: 'Mandarin Oriental' },
  { pattern: /^The Peninsula\s/i, brand: 'Peninsula' },
  { pattern: /^Peninsula\s/i, brand: 'Peninsula' },
  { pattern: /ペニンシュラ/, brand: 'Peninsula' },
  { pattern: /^Rosewood\s/i, brand: 'Rosewood' },
  { pattern: /^The St\.?\s*Regis\s/i, brand: 'St. Regis' },
  { pattern: /^St\.?\s*Regis\s/i, brand: 'St. Regis' },
  { pattern: /^Park Hyatt\s/i, brand: 'Park Hyatt' },
  { pattern: /パーク\s*ハイアット|パークハイアット/, brand: 'Park Hyatt' },
  { pattern: /^Six Senses\s/i, brand: 'Six Senses' },
  { pattern: /Bulgari\s+Hotel/i, brand: 'Bulgari Hotels' },
  { pattern: /^Bulgari\s/i, brand: 'Bulgari Hotels' },
  { pattern: /^Belmond\s/i, brand: 'Belmond' },
  { pattern: /^Raffles\s/i, brand: 'Raffles' },
  { pattern: /^Fairmont\s/i, brand: 'Fairmont' },
  { pattern: /Kempinski/i, brand: 'Kempinski' },
  { pattern: /Dorchester Collection/i, brand: 'Dorchester Collection' },
  { pattern: /^The Dorchester$/i, brand: 'Dorchester Collection' },
  { pattern: /45 Park Lane|Coworth Park/i, brand: 'Dorchester Collection' },
  { pattern: /Hotel Bel-Air|Le Meurice/i, brand: 'Dorchester Collection' },
  { pattern: /^The Savoy$/i, brand: 'Fairmont' },
];

/**
 * ホテル名からブランドを導出（達成対象15ブランドのみ。それ以外は Other）
 */
export function getBrandForHotel(hotel: HotelPin): string {
  if (hotel.brand && hotel.brand.trim()) {
    const b = hotel.brand.trim();
    const found = COMPLETION_BRANDS.find(
      (cb) => cb.toLowerCase() === b.toLowerCase() || b.startsWith(cb)
    );
    if (found) return found;
    const byPattern = NAME_TO_BRAND.find(({ pattern }) =>
      typeof pattern === 'string' ? b.includes(pattern) : pattern.test(b)
    );
    if (byPattern) return byPattern.brand;
    return 'Other';
  }
  const name = hotel.name || '';
  for (const { pattern, brand } of NAME_TO_BRAND) {
    if (typeof pattern === 'string') {
      if (name.includes(pattern)) return brand;
    } else if (pattern.test(name)) {
      return brand;
    }
  }
  return 'Other';
}

/**
 * ローカル JSON から一泊8万円以上のホテル一覧を取得
 */
export function getLuxuryHotelPins(): HotelPin[] {
  return data.hotels ?? [];
}

/**
 * メタ情報（取得日・検索条件）
 */
export function getLuxuryHotelsMeta(): {
  generatedAt: string;
  checkIn: string;
  checkOut: string;
  minPricePerNightYen: number;
} {
  return {
    generatedAt: data.generatedAt ?? '',
    checkIn: data.checkIn ?? '',
    checkOut: data.checkOut ?? '',
    minPricePerNightYen: data.minPricePerNightYen ?? 80000,
  };
}

/**
 * テスト用：日本（JP）＋ Four Seasons を全達成した状態で使う visited ホテルID一覧。
 * ストアの初期値で使用。本番では空配列に戻すか、別フラグで切り替える。
 */
export function getTestSeedVisitedHotelIds(): string[] {
  const pins = getLuxuryHotelPins();
  const japanIds = pins.filter((p) => p.countryCode === 'JP').map((p) => p.id);
  const fourSeasonsIds = pins
    .filter((p) => getBrandForHotel(p) === 'Four Seasons')
    .map((p) => p.id);
  return [...new Set([...japanIds, ...fourSeasonsIds])];
}
