export interface ItadSearchItem {
  id: string; // ITAD UUID
  slug: string;
  title: string;
  cover: string | null;
}

export interface ItadGameInfo {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
}

export interface ItadDeal {
  shopId: number;
  shopName: string;
  price: number; // amount (ör. 149.99)
  currency: string; // ör. "TRY"
  regular: number; // indirimsiz fiyat
  cut: number; // indirim yüzdesi
  url: string;
}
