import { fetchEbayListingsViaApi } from "@/lib/ebay-api-client";

// eBay API endpoint
// Fetches real listings from eBay using official REST API

interface EbaySearchResponse {
  items: any[];
  total: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const country = searchParams.get("country") || "USA";
  const sortBy = searchParams.get("sort") || "newlyListed";

  if (!query) {
    return Response.json({ error: "Query parameter required" }, { status: 400 });
  }

  try {
    // Use eBay Official API with OAuth
    const listings = await fetchEbayListingsViaApi(query, "temp", country);

    return Response.json({
      items: listings,
      total: listings.length,
    } as EbaySearchResponse);
  } catch (error) {
    console.error("eBay API error:", error);
    return Response.json(
      { error: "Failed to fetch eBay listings", details: String(error) },
      { status: 500 }
    );
  }
}
