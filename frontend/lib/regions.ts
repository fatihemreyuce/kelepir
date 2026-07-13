export interface Region {
  code: string;
  label: string;
}

// Kürasyonlu popüler ülkeler (ITAD 2 harfli ülke kodu). Bayrak emoji label içinde.
export const REGIONS: Region[] = [
  { code: 'TR', label: '🇹🇷 Türkiye' },
  { code: 'US', label: '🇺🇸 Amerika' },
  { code: 'GB', label: '🇬🇧 Birleşik Krallık' },
  { code: 'DE', label: '🇩🇪 Almanya' },
  { code: 'FR', label: '🇫🇷 Fransa' },
  { code: 'PL', label: '🇵🇱 Polonya' },
  { code: 'CA', label: '🇨🇦 Kanada' },
  { code: 'AU', label: '🇦🇺 Avustralya' },
  { code: 'BR', label: '🇧🇷 Brezilya' },
  { code: 'RU', label: '🇷🇺 Rusya' },
  { code: 'JP', label: '🇯🇵 Japonya' },
  { code: 'NL', label: '🇳🇱 Hollanda' },
];

export const DEFAULT_REGION = 'TR';
