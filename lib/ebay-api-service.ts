import axios from "axios";

interface EbayApiItem {
  itemId: string[];
  title: string[];
  currentPrice: Array<{ __value__: string }>;
  listingType: string[];
  location: string[];
  country: string[];
  postalCode: string[];
  shippingInfo: Array<{
    shipToLocations: string[];
    globalShipping: boolean[];
  }>;
  sellerInfo: Array<{
    sellerUserName: string[];
  }>;
  galleryURL: string[];
  viewItemURL: string[];
  sellerContactInformation?: Array<{
    sellerEmail?: string[];
  }>;
  topRatedListing?: boolean[];
  listingStatus: string[];
  timeLeft?: string[];
}

interface EbayApiResponse {
  searchResult: Array<{
    count: string;
    item: EbayApiItem[];
  }>;
  timestamp: string[];
  ack: string[];
}

interface FetchedEbayItem {
  itemId: string;
  title: string;
  price: number;
  currencyId: string;
  location: string;
  country: string;
  postalCode: string;
  listingType: string;
  imageUrl: string;
  viewItemURL: string;
  postedTime: string;
  seller: string;
  topRated: boolean;
}

// Calculate posted time from timeLeft
function calculatePostedTime(timeLeft: string): string {
  try {
    // timeLeft format: P3DT5H22M3S (ISO 8601 duration)
    // P = period, D = days, T = time separator, H = hours, M = minutes, S = seconds
    const match = timeLeft.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) return new Date().toISOString();
    
    const days = parseInt(match[1]) || 0;
    const hours = parseInt(match[2]) || 0;
    const minutes = parseInt(match[3]) || 0;
    
    // Calculate when listing ends and estimate when it was posted
    const now = new Date();
    const endTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
    
    // eBay listings typically run for 7, 10, or 30 days
    // Estimate by checking typical durations
    const totalMinutesLeft = days * 24 * 60 + hours * 60 + minutes;
    
    let estimatedDurationMinutes = 7 * 24 * 60; // Default 7 days
    if (totalMinutesLeft > 10 * 24 * 60) {
      estimatedDurationMinutes = 30 * 24 * 60; // 30 days
    } else if (totalMinutesLeft > 7 * 24 * 60) {
      estimatedDurationMinutes = 10 * 24 * 60; // 10 days
    }
    
    const postedTime = new Date(endTime.getTime() - estimatedDurationMinutes * 60 * 1000);
    return postedTime.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

// Get value from eBay API array response
function getValue<T>(arr: T[] | undefined, defaultValue: T): T {
  return arr && arr.length > 0 ? arr[0] : defaultValue;
}

export async function fetchEbayListingsViaApi(
  searchTerm: string,
  country: string = "USA",
  sortOrder: string = "EndTimeSoonest"
): Promise<FetchedEbayItem[]> {
  try {
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    const apiUrl = process.env.EBAY_API_URL || "https://svcs.sandbox.ebay.com/services/search/FindingService/v1";

    if (!appId || !certId) {
      console.warn("[eBay API] Missing API credentials, skipping API call");
      return [];
    }

    // Map country to eBay site ID
    const siteIdMap: Record<string, string> = {
      "USA": "0",
      "UK": "3",
      "Canada": "2",
      "Australia": "15",
      "Germany": "77",
      "France": "71",
      "India": "205",
    };

    const siteId = siteIdMap[country] || "0";

    // Map sort parameter to eBay sortOrder values
    const sortMap: Record<string, string> = {
      "newlyListed": "NewestFirst",
      "12h": "EndTimeSoonest",
      "ending": "EndTimeSoonest",
      "price": "PricePlusShippingLowest",
      "priceDrop": "EndTimeSoonest",
    };

    const ebaySort = sortMap[sortOrder] || "EndTimeSoonest";

    console.log(`[eBay API] Searching for: "${searchTerm}" in ${country} (sort: ${ebaySort})`);

    const params = new URLSearchParams({
      OPERATION_NAME: "findItemsByKeywords",
      SERVICE_VERSION: "1.0.0",
      SECURITY_APPNAME: appId,
      GLOBAL_ID: `EBAY-${siteId}`,
      RESPONSE_DATA_FORMAT: "JSON",
      REST_PAYLOAD: "true",
      keywords: searchTerm,
      sortOrder: ebaySort,
      paginationInput: JSON.stringify({ entriesPerPage: "100", pageNumber: "1" }),
      itemFilter: JSON.stringify([
        { name: "ListingType", value: ["AuctionWithBIN", "FixedPrice", "StoreInventory"] },
        { name: "HideDuplicateItems", value: "true" },
        { name: "LocatedIn", value: country },
      ]),
      outputSelector: JSON.stringify([
        "SellerInfo",
        "StoreInfo",
        "RatingDetails",
        "GalleryInfo",
      ]),
    });

    const response = await axios.get(apiUrl, { params });
    const data = response.data as EbayApiResponse;

    if (data.ack[0] !== "Success") {
      console.warn(`[eBay API] API error: ${data.ack[0]}`);
      return [];
    }

    if (!data.searchResult || !data.searchResult[0]?.item) {
      console.log("[eBay API] No items found");
      return [];
    }

    const items = data.searchResult[0].item;
    const results: FetchedEbayItem[] = items
      .slice(0, 40)
      .map((item) => {
        const itemId = getValue(item.itemId, "");
        const title = getValue(item.title, "");
        const price = parseFloat(getValue(item.currentPrice[0]?.__value__ || "", "0"));
        const location = getValue(item.location, country);
        const listingType = getValue(item.listingType, "FixedPrice");
        const imageUrl = getValue(item.galleryURL, "");
        const viewItemUrl = getValue(item.viewItemURL, "");
        const seller = getValue(item.sellerInfo?.[0]?.sellerUserName, ["Unknown"])[0];
        const countryCode = getValue(item.country, country);
        const postalCode = getValue(item.postalCode, "");
        const topRated = getValue(item.topRatedListing, [false])[0] === true;
        const timeLeft = getValue(item.timeLeft, "P7D");

        return {
          itemId,
          title,
          price,
          currencyId: country === "UK" ? "GBP" : country === "Canada" ? "CAD" : country === "Australia" ? "AUD" : country === "Germany" || country === "France" ? "EUR" : "USD",
          location: `${location}${postalCode ? ", " + postalCode : ""}`,
          country: countryCode,
          postalCode,
          listingType: listingType === "Auction" ? "Auction" : "Buy Now",
          imageUrl,
          viewItemURL: viewItemUrl,
          postedTime: calculatePostedTime(timeLeft),
          seller,
          topRated,
        };
      })
      .filter((item) => item.itemId && item.title && item.price > 0);

    console.log(`[eBay API] Successfully fetched ${results.length} listings`);
    return results;
  } catch (error) {
    console.error("[eBay API] Error fetching listings:", error instanceof Error ? error.message : error);
    return [];
  }
}
