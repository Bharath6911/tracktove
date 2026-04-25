import type { Listing, Marketplace } from "@/types/marketplace";

interface EbayApiItem {
  itemId: string;
  title: string;
  price?: {
    value: string;
    currency: string;
  };
  image?: {
    imageUrl: string;
  };
  itemWebUrl: string;
  seller?: {
    username: string;
  };
  itemLocation?: {
    countryName: string;
  };
  condition?: string;
  listingMarketplaceId?: string;
}

interface EbaySearchResponse {
  itemSummaries?: EbayApiItem[];
  total?: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class EbayApiClient {
  private clientId: string;
  private clientSecret: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.EBAY_CLIENT_ID || "";
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || "";
    
    if (!this.clientId || !this.clientSecret) {
      console.warn("⚠️ eBay credentials missing:", {
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
      });
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    console.log("🔐 Getting OAuth token from eBay...");
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/buy.browse",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ OAuth Failed:", response.status, errorData);
      throw new Error(`OAuth token failed: ${response.status}`);
    }

    const data: TokenResponse = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // 5 min buffer
    
    console.log("✅ OAuth token obtained, valid for", data.expires_in, "seconds");
    return this.token;
  }

  async search(
    query: string,
    sort: string = "newlyListed",
    country: string = "USA"
  ): Promise<EbayApiItem[]> {
    try {
      const token = await this.getAccessToken();

      // Map sort parameter
      const sortMap: Record<string, string> = {
        newlyListed: "newlyListed",
        price: "price",
        ending: "endingSoonest",
      };

      const sortValue = sortMap[sort] || "newlyListed";

      const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
      url.searchParams.append("q", query);
      url.searchParams.append("sort", sortValue);
      url.searchParams.append("limit", "100");

      console.log(`🔍 Searching eBay Browse API for: "${query}" (sort: ${sortValue})`);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Browse API Error:", response.status, errorData);
        throw new Error(`Browse API returned ${response.status}`);
      }

      const data: EbaySearchResponse = await response.json();
      const items = data.itemSummaries || [];
      
      console.log(`✅ Found ${items.length} items on eBay`);
      return items;
    } catch (error) {
      console.error("❌ Error searching eBay:", error);
      throw error;
    }
  }
}

const ebayClient = new EbayApiClient();

// Mock data for fallback
const MOCK_ITEMS: EbayApiItem[] = [
  {
    itemId: "123456789",
    title: "Vintage Rolex Submariner Automatic Watch",
    price: { value: "2500.00", currency: "USD" },
    image: { imageUrl: "https://via.placeholder.com/300?text=Rolex" },
    itemWebUrl: "https://ebay.com/itm/123456789",
    seller: { username: "luxury_watches" },
    itemLocation: { countryName: "USA" },
  },
  {
    itemId: "987654321",
    title: "Omega Seamaster Professional Divers Watch",
    price: { value: "1800.00", currency: "USD" },
    image: { imageUrl: "https://via.placeholder.com/300?text=Omega" },
    itemWebUrl: "https://ebay.com/itm/987654321",
    seller: { username: "watch_collector" },
    itemLocation: { countryName: "USA" },
  },
  {
    itemId: "456789123",
    title: "Breitling Chronomat Steel Watch",
    price: { value: "3200.00", currency: "USD" },
    image: { imageUrl: "https://via.placeholder.com/300?text=Breitling" },
    itemWebUrl: "https://ebay.com/itm/456789123",
    seller: { username: "authentic_watches" },
    itemLocation: { countryName: "USA" },
  },
];

export async function fetchEbayListingsViaApi(
  term: string,
  bookmarkId: string,
  country: string = "USA",
  marketplace: Marketplace = "eBay"
): Promise<Listing[]> {
  try {
    console.log(`Fetching eBay listings for: "${term}"`);
    let items: EbayApiItem[] = [];

    try {
      items = await ebayClient.search(term, "newlyListed", country);
    } catch (apiError) {
      console.warn("⚠️ eBay API unavailable, using fallback data:", apiError);
      items = MOCK_ITEMS;
    }

    const listings: Listing[] = items.map((item: EbayApiItem, index: number) => ({
      id: item.itemId || `ebay-${bookmarkId}-${index}`,
      bookmarkId,
      marketplace,
      title: item.title,
      price: item.price ? parseFloat(item.price.value) : 0,
      previousPrice: null,
      location: item.itemLocation?.countryName || country,
      listingType: "Buy Now" as const,
      postedAtIso: new Date().toISOString(),
      imageUrl: item.image?.imageUrl || "/placeholder-watch.jpg",
      listingUrl: item.itemWebUrl,
      sellerName: item.seller?.username || "",
      sellerUrl: "",
      currency: item.price?.currency || "USD",
    }));

    console.log(`Fetched ${listings.length} eBay listings`);
    return listings;
  } catch (error) {
    console.error("Error fetching eBay listings via API:", error);
    return [];
  }
}

export { ebayClient };
