export interface PriceAlertMail {
  to: string;
  gameTitle: string;
  targetPrice: number;
  currentPrice: number;
  currency: string;
  url: string;
}
