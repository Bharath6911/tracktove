import { scrapeEbayListings } from "@/lib/scrapers/ebay-scraper";

// eBay web scraping endpoint
// Scrapes real listings from eBay based on search term

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

interface EbaySearchResponse {
  items: EbayItem[];
  total: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const sortBy = searchParams.get("sort") || "12h";

  if (!query) {
    return Response.json({ error: "Query parameter required" }, { status: 400 });
  }

  try {
    // Use web scraper instead of API
    const items = await scrapeEbayListings(query, sortBy);

    return Response.json({
      items,
      total: items.length,
    } as EbaySearchResponse);
  } catch (error) {
    console.error("eBay scraping error:", error);
    return Response.json(
      { error: "Failed to fetch eBay listings", details: String(error) },
      { status: 500 }
    );
  }
}
