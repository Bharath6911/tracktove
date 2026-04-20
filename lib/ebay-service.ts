import type { Listing, Marketplace } from "@/types/marketplace";

interface EbayItem {
  itemId: string;
  title: string;
  price: number;
  currencyId: string;
  location: string;
  listingType: string;
  imageUrl: string;
  viewItemURL: string;
  postedTime: string;
  seller?: string;
}

export async function fetchEbayListings(
  term: string,
  bookmarkId: string,
  country: string = "USA",
  marketplace: Marketplace = "eBay"
): Promise<Listing[]> {
  try {
    // Fetch from our backend scraper endpoint
    const response = await fetch(`/api/ebay/search?q=${encodeURIComponent(term)}&country=${encodeURIComponent(country)}&sort=12h`);

    if (!response.ok) {
      console.error(`Failed to fetch eBay listings: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Transform eBay data to our Listing type
    const listings: Listing[] = (data.items || []).map((item: EbayItem, index: number) => ({
      id: item.itemId || `ebay-${bookmarkId}-${index}`,
      bookmarkId,
      marketplace,
      title: item.title,
      price: item.price,
      previousPrice: null,
      location: item.location,
      listingType: item.listingType === "Buy It Now" ? "Buy Now" : item.listingType || "Auction",
      postedAtIso: new Date(item.postedTime).toISOString(),
      imageUrl: item.imageUrl || "/placeholder-watch.jpg",
      listingUrl: item.viewItemURL,
      sellerName: item.seller || "",
      sellerUrl: "",
    }));

    return listings;
  } catch (error) {
    console.error("Error fetching eBay listings:", error);
    return [];
  }
}

export async function fetchListings(
  term: string,
  bookmarkId: string,
  country: string = "USA",
  marketplace: Marketplace = "eBay"
): Promise<Listing[]> {
  // For now, only support eBay
  if (marketplace === "eBay") {
    return fetchEbayListings(term, bookmarkId, country, marketplace);
  }

  return [];
}
