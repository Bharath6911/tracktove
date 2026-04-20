export type Marketplace = "eBay" | "Etsy" | "StockX";

export type ListingType = "Buy Now" | "Auction";

export type Bookmark = {
  id: string;
  term: string;
  marketplace: Marketplace;
  country: string;
  totalLatest: number;
  lastUpdatedIso: string;
  trackingEnabled: boolean;
};

export type Listing = {
  id: string;
  bookmarkId: string;
  marketplace: Marketplace;
  title: string;
  price: number;
  previousPrice: number | null;
  location: string;
  listingType: ListingType;
  postedAtIso: string;
  imageUrl: string;
  listingUrl: string;
  sellerName: string;
  sellerUrl: string;
};

export type AlertItem = {
  id: string;
  type: "new" | "drop";
  term: string;
  message: string;
  createdAtIso: string;
};
