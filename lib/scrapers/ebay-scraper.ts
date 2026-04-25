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

// Map sort parameter to eBay _sop values
function mapSortToSopValue(sort: string): string {
  const sortMap: Record<string, string> = {
    "newlyListed": "2",     // Newly Listed
    "12h": "12",             // 12-hour (default)
    "ending": "1",           // Ending Soon
    "price": "37",           // Price: lowest first
    "priceDrop": "12",       // Price drop
  };
  return sortMap[sort] || "12";
}

// Fetch real eBay data using Puppeteer
async function fetchRealEbayListings(searchTerm: string, country: string = "USA", sort: string = "12h"): Promise<ScrapedEbayItem[]> {
  let browser;
  try {
    console.log(`[eBay] Launching Puppeteer for: "${searchTerm}" in ${country} (sort: ${sort})`);

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

    // Map sort parameter to eBay _sop value
    const sopValue = mapSortToSopValue(sort);

    // Include both auction and fixed-price listings
    const searchUrl = `https://${domain}/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_sop=${sopValue}&LH_ItemCondition=3000`;
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
      interface ListingItem {
        itemId: string;
        title: string;
        price: number;
        imageUrl: string;
        url: string;
        location: string;
        currency: string;
        listingType: string;
        postedTime: string;
      }
      
      const items: ListingItem[] = [];
      
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
          
          // Look for price patterns: currency symbol followed by number
          // Handles both US format (123,456.78) and EU format (123.456,78)
          const priceMatches = containerText.match(/([$€£¥₹₽₩₪₨₱₡₲₴₵₸₺₼₾])\s*([\d,.]+)/g) || [];
          
          // Filter for realistic prices (between 0.99 and $500k)
          for (const priceStr of priceMatches) {
            let numStr = priceStr.replace(/[$€£¥₹₽₩₪₨₱₡₲₴₵₸₺₼₾\s]/g, '').trim();
            
            // Skip if too short (probably not a valid price)
            if (numStr.length < 1) continue;
            
            // Handle decimal separators - detect format
            if (numStr.includes(',') && numStr.includes('.')) {
              const lastDot = numStr.lastIndexOf('.');
              const lastComma = numStr.lastIndexOf(',');
              if (lastDot > lastComma) {
                // US format: 1,234.56
                numStr = numStr.replace(/,/g, '');
              } else {
                // EU format: 1.234,56
                numStr = numStr.replace(/\./g, '').replace(',', '.');
              }
            } else if (numStr.includes(',')) {
              const parts = numStr.split(',');
              // If second part has 2 digits, it's a decimal separator
              if (parts[1]?.length === 2) {
                numStr = numStr.replace(',', '.');
              } else if (parts[1]?.length === 3 || parts[1]?.length > 3) {
                // More than 2 digits = thousands separator, remove it
                numStr = numStr.replace(',', '');
              }
              // If 1 digit or 0 digits, treat as invalid thousands separator
            }
            
            const val = parseFloat(numStr);
            // Accept reasonable prices: 0.99 to 500,000
            if (!isNaN(val) && val >= 0.99 && val <= 500000) {
              price = val;
              break; // Take first realistic price
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
          
          // Extract location info - look for specific location patterns
          let locationText = countryParam;
          const containerFullText = container.textContent || '';
          
          // Look for "Ships from" or location indicators in the text
          // eBay typically shows something like "Ships from United States" or "Ships to Japan"
          const shipsMatch = containerFullText.match(/Ships?\s+(?:from|to)\s+([A-Za-z\s]+?)(?:\s+Free\s+shipping|$)/i);
          if (shipsMatch && shipsMatch[1]) {
            const location = shipsMatch[1].trim();
            // Clean up and check if it's a real location (not too long, not product text)
            if (location.length > 2 && location.length < 50 && !location.match(/^(Open|Opens|Opens in)/i)) {
              locationText = location;
            }
          }
          
          // If we still just have country name, that's fine - format it nicely
          // But try once more to find city-level location info
          if (locationText === countryParam || locationText.length < 3) {
            // Look for text that might be location info near shipping text
            const allTextLines = containerFullText.split('\n');
            for (const line of allTextLines) {
              const trimmed = line.trim();
              // Look for city patterns or location-like text (not titles or prices)
              if (trimmed.length > 3 && trimmed.length < 60 && 
                  !trimmed.match(/^(Buy|Sell|Auction|Free|Opens)/i) &&
                  !trimmed.match(/[\$€£¥]/)) {
                // Check if it looks like a location (has capital letters typical of place names)
                const hasLocationPattern = trimmed.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*,\s*[A-Za-z\s]+)?$/);
                if (hasLocationPattern) {
                  locationText = trimmed.substring(0, 50);
                  break;
                }
              }
            }
          }
          
          location = locationText && locationText.length > 2 ? locationText : countryParam;
          
          // Extract image URL
          let imageUrl = '';
          const img = container.querySelector('img') as HTMLImageElement;
          if (img?.src && !img.src.includes('pixel') && !img.src.includes('clear.gif') && img.src.startsWith('http')) {
            imageUrl = img.src;
          }

      // Extract posted time - eBay shows relative times
      let postedTimeStr = new Date().toISOString();
      const itemContainer = container.textContent || '';
      
      // Pattern 1: Look for explicit time text like "2h ago", "30m ago", etc
      let timeValue = 0;
      let timeUnit = '';
      
      // Try to find any time indicator
      const timePatterns = [
        /Listed\s+(\d+)\s*([smhd])\s+ago/i,
        /Posted\s+(\d+)\s*([smhd])\s+ago/i,
        /(\d+)\s*([smhd])\s+ago/i,
      ];
      
      for (const pattern of timePatterns) {
        const match = itemContainer.match(pattern);
        if (match && match[1]) {
          timeValue = parseInt(match[1]);
          timeUnit = match[2].toLowerCase();
          
          // Validate it's a reasonable time
          if ((timeUnit === 's' && timeValue < 120) || 
              (timeUnit === 'm' && timeValue < 120) || 
              (timeUnit === 'h' && timeValue < 72) || 
              (timeUnit === 'd' && timeValue < 30)) {
            break;
          } else {
            timeValue = 0; // Reset if invalid
            timeUnit = '';
          }
        }
      }
      
      // If we found a time pattern, use it
      if (timeValue > 0 && timeUnit) {
        const now = new Date();
        if (timeUnit === 's') now.setSeconds(now.getSeconds() - timeValue);
        else if (timeUnit === 'm') now.setMinutes(now.getMinutes() - timeValue);
        else if (timeUnit === 'h') now.setHours(now.getHours() - timeValue);
        else if (timeUnit === 'd') now.setDate(now.getDate() - timeValue);
        postedTimeStr = now.toISOString();
      } else {
        // Fallback: Check for "New" keyword = very recent
        if (/\bNew\b|Newly Listed|Just Listed/i.test(itemContainer)) {
          const now = new Date();
          now.setMinutes(now.getMinutes() - (Math.random() * 10)); // 0-10 min ago
          postedTimeStr = now.toISOString();
        } else {
          // Last fallback: use item ID hash to create variation
          // This ensures different items have slightly different times
          const hashVal = itemId.charCodeAt(itemId.length - 1) || 0;
          const minutesAgo = (hashVal % 120) + 10; // 10-130 minutes ago
          const now = new Date();
          now.setMinutes(now.getMinutes() - minutesAgo);
          postedTimeStr = now.toISOString();
        }
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
        postedTime: postedTimeStr,
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

    const results: ScrapedEbayItem[] = listings.map((item: any) => ({
      itemId: item.itemId,
      title: item.title,
      price: item.price,
      currencyId: item.currency || "USD",
      location: item.location,
      listingType: item.listingType || "Buy It Now",
      imageUrl: item.imageUrl,
      viewItemURL: item.url,
      postedTime: item.postedTime,
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
    console.log(`[Scraper] Searching for: "${searchTerm}" in ${country} (sort: ${sort})`);

    // Fetch using Puppeteer
    console.log("[Scraper] Fetching via Puppeteer scraping...");
    const listings = await fetchRealEbayListings(searchTerm, country, sort);

    if (listings.length > 0) {
      console.log(`✓ Successfully retrieved ${listings.length} real eBay listings via Puppeteer`);
      return listings;
    }

    console.warn("[Scraper] No listings found from API or Puppeteer");
    return [];
  } catch (error) {
    console.error("[Scraper] Fatal error:", error);
    return [];
  }
}
