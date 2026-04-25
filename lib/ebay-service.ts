import { fetchEbayListingsViaApi } from "./ebay-api-client";
import type { Listing, Marketplace } from "@/types/marketplace";

export async function fetchEbayListings(
  term: string,
  bookmarkId: string,
  country: string = "USA",
  marketplace: Marketplace = "eBay"
): Promise<Listing[]> {
  try {
    return await fetchEbayListingsViaApi(term, bookmarkId, country, marketplace);
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
