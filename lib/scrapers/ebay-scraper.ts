import puppeteer from "puppeteer";

interface ScrapedEbayItem {
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

// Fetch real eBay data using Puppeteer
async function fetchRealEbayListings(searchTerm: string, country: string = "USA"): Promise<ScrapedEbayItem[]> {
  let browser;
  try {
    console.log(`[eBay] Launching Puppeteer for: "${searchTerm}" in ${country}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Map country to eBay domain
    const countryDomainMap: Record<string, string> = {
      "USA": "ebay.com",
      "UK": "ebay.co.uk",
      "Canada": "ebay.ca",
      "Australia": "ebay.com.au",
      "Germany": "ebay.de",
      "France": "ebay.fr",
    };

    // Map country to currency code
    const countryCurrencyMap: Record<string, string> = {
      "USA": "USD",
      "UK": "GBP",
      "Canada": "CAD",
      "Australia": "AUD",
      "Germany": "EUR",
      "France": "EUR",
    };

    const domain = countryDomainMap[country] || "ebay.com";
    const currency = countryCurrencyMap[country] || "USD";

    // Include both auction and fixed-price listings
    const searchUrl = `https://${domain}/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_sop=12&LH_ItemCondition=3000`;
    console.log(`[eBay] Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // India eBay loads slower - add extra wait
    const waitTime = country === "India" ? 5000 : 3000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Try to wait for items to appear
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('a[href*="/itm/"]').length > 0,
        { timeout: country === "India" ? 20000 : 10000 }
      );
      console.log(`[eBay] Items found on page for ${country}`);
    } catch (e) {
      console.log(`[eBay] Timeout waiting for items on ${country}, continuing anyway`);
    }

    // Extract listings from the page
    const listings = await page.evaluate((countryParam: string, currencyParam: string) => {
      const items: any[] = [];
      
      // Find all links to item pages
      const allItemLinks = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
      
      const processedIds = new Set<string>();
      
      // Filter out links that are not listings (tracking, etc)
      const realListingLinks = allItemLinks.filter((link) => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        
        // Skip if title looks like code or tracking or navigation
        if (text.includes('utag') || text.includes('var ') || text.startsWith('{') || text.length < 5) {
          return false;
        }
        
        // Skip common navigation/header links
        if (text === 'Shop on eBay' || text === 'eBay' || text === 'Buy' || text === 'Sell' || text === 'Help') {
          return false;
        }
        
        // Must be a proper item URL
        return href.includes('/itm/') && !href.includes('trk=') && !href.includes('tracking');
      });
      
      realListingLinks.forEach((link) => {
        try {
          const href = (link as HTMLAnchorElement).href;
          // Clean up URL to remove tracking parameters
          const cleanUrl = href.split('&')[0]; // Remove tracking params
          const itemIdMatch = cleanUrl.match(/\/itm\/(\d+)/);
          const itemId = itemIdMatch?.[1];
          
          if (!itemId || processedIds.has(itemId)) return;
          processedIds.add(itemId);
          
          // Get title
          let title = link.textContent?.trim() || '';
          title = title.replace(/\s+/g, ' ').substring(0, 120).trim();
          
          if (title.length < 5) return;
          
          // Skip if title is just a marketplace name or placeholder
          if (title === 'Shop on eBay' || title === 'eBay' || title === 'Buy Now') {
            return;
          }
          
          // Find the listing card container - be more specific
          let container = link.closest('[class*="s-item"]') || 
                         link.closest('div[class*="item"]') || 
                         link.closest('li') ||
                         link.parentElement?.parentElement;
          
          if (!container) return;
          
          // Extract price - look for the main price, not shipping or other numbers
          let price = 0;
          let listingType = "Buy Now";
          let location = countryParam;
          
          const containerText = container.textContent || '';
          
          // Look for price patterns: $ followed by 1-5 digit groups with max 2 decimals
          // Real prices are typically $0.99 to $99,999.99
          const priceMatches = containerText.match(/([$€£¥₹₽₩₪₨₱₡₲₴₵₸₺₼₾])\s*([\d,]+\.?\d{0,2})/g) || [];
          
          // Filter for realistic prices (between $1 and $500k)
          for (const priceStr of priceMatches) {
            let numStr = priceStr.replace(/[$€£¥₹₽₩₪₨₱₡₲₴₵₸₺₼₾\s]/g, '');
            
            // Handle decimal separators
            if (numStr.includes(',') && numStr.includes('.')) {
              const lastDot = numStr.lastIndexOf('.');
              const lastComma = numStr.lastIndexOf(',');
              if (lastDot > lastComma) {
                numStr = numStr.replace(/,/g, '');  // US format
              } else {
                numStr = numStr.replace(/\./g, '').replace(',', '.');  // EU format
              }
            } else if (numStr.includes(',')) {
              const parts = numStr.split(',');
              if (parts[1]?.length === 2) {
                numStr = numStr.replace(',', '.');  // EU decimal
              } else if (parts[1]?.length === 3) {
                numStr = numStr.replace(',', '');  // Thousands separator
              }
            }
            
            const val = parseFloat(numStr);
            // Accept reasonable prices: $1.00 to $500,000
            if (val >= 0.99 && val <= 500000) {
              price = val;
              break;  // Take first realistic price
            }
          }
          
          // Check for listing type (Auction vs Buy It Now)
          // Auctions have bid information like "(X bids)" or "Bid:" or "bid"
          // Also look for "Auction" keyword
          const hasBidInfo = containerText.match(/\(?\d+\s*bids?\)?|\bBid\b/i);
          const hasAuctionKeyword = containerText.match(/\bAuction\b/i);
          
          if (hasBidInfo || hasAuctionKeyword) {
            listingType = "Auction";
          }
          
          // Try to extract location with city/state info
          // Look for location indicators like comma-separated city, state patterns
          let locationText = countryParam;
          const locationMatch = containerText.match(/(?:Ship to|Ships to|from|Location)[:\s]+([^•\n]+)/i);
          if (locationMatch && locationMatch[1]) {
            locationText = locationMatch[1]
              .trim()
              .substring(0, 50)
              // Clean up common eBay text fragments
              .replace(/Opens in a new window.*$/i, '')
              .replace(/Pre-Owned.*$/i, '')
              .replace(/New$/i, '')
              .trim();
          }
          
          // Use cleaned location or fallback to country
          location = locationText || countryParam;
          
          // Extract image URL
          let imageUrl = '';
          const img = container.querySelector('img') as HTMLImageElement;
          if (img?.src && !img.src.includes('pixel') && !img.src.includes('clear.gif') && img.src.startsWith('http')) {
            imageUrl = img.src;
          }

          items.push({
            itemId,
            title,
            price,
            imageUrl,
            url: href,
            location,
            currency: currencyParam,
            listingType,
          });
        } catch (e) {
          // Skip
        }
      });
      
      // Return top 40 items
      return items.slice(0, 40);
    }, country, currency);

    console.log(`[eBay] Extracted ${listings.length} real listings (${listings.filter(l => l.price > 0).length} with prices)`);

    console.log(`✓ Found ${listings.length} real eBay listings`);

    const results: ScrapedEbayItem[] = listings.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      price: item.price,
      currencyId: item.currency || "USD",
      location: item.location,
      listingType: item.listingType || "Buy It Now",
      imageUrl: item.imageUrl,
      viewItemURL: item.url,
      postedTime: new Date().toISOString(),
      seller: "eBay Seller",
    }));

    await page.close();
    return results;
  } catch (error) {
    console.error("[eBay] Puppeteer error:", error instanceof Error ? error.message : error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapeEbayListings(
  searchTerm: string,
  sort: string = "12h",
  country: string = "USA"
): Promise<ScrapedEbayItem[]> {
  try {
    console.log(`[Scraper] Searching for: "${searchTerm}" in ${country}`);

    const listings = await fetchRealEbayListings(searchTerm, country);

    if (listings.length > 0) {
      console.log(`✓ Successfully retrieved ${listings.length} real eBay listings`);
      return listings;
    }

    console.warn("[Scraper] No real listings found");
    return [];
  } catch (error) {
    console.error("[Scraper] Fatal error:", error);
    return [];
  }
}
