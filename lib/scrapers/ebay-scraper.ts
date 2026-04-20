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
      "India": "ebay.in",
      "Australia": "ebay.com.au",
      "Germany": "ebay.de",
      "France": "ebay.fr",
    };

    const domain = countryDomainMap[country] || "ebay.com";

    const searchUrl = `https://${domain}/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_sop=12`;
    console.log(`[eBay] Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Wait longer for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to wait for items to appear
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('a[href*="/itm/"]').length > 0,
        { timeout: 10000 }
      );
      console.log("[eBay] Items found on page");
    } catch (e) {
      console.log("[eBay] Timeout waiting for items, continuing with evaluate");
    }

    // Extract listings from the page
    const listings = await page.evaluate((countryParam: string) => {
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
          
          // Find the listing container (parent element)
          let container = link.closest('li') || link.closest('div[class*="item"]') || link.parentElement?.parentElement;
          while (container && !container.textContent?.includes('$')) {
            container = container.parentElement;
            if (container?.tagName === 'BODY') {
              container = null;
              break;
            }
          }
          
          if (!container) container = link.parentElement?.parentElement?.parentElement;
          
          // Extract price
          let price = 0;
          if (container) {
            const containerText = container.textContent || '';
            // Find price pattern $XXX.XX or $X,XXX.XX
            const priceMatches = containerText.match(/\$[\d,]+\.?\d*/g);
            if (priceMatches && priceMatches.length > 0) {
              // Take the first reasonable price (usually the main price)
              for (const match of priceMatches) {
                const val = parseFloat(match.replace(/[$,]/g, ''));
                if (val > 0.5 && val < 10000000) {
                  price = val;
                  break;
                }
              }
            }
          }
          
          // Extract image URL
          let imageUrl = '';
          const img = container?.querySelector('img') as HTMLImageElement;
          if (img?.src && !img.src.includes('pixel') && !img.src.includes('clear.gif') && img.src.startsWith('http')) {
            imageUrl = img.src;
          }

          items.push({
            itemId,
            title,
            price,
            imageUrl,
            url: href,
            location: countryParam,
          });
        } catch (e) {
          // Skip
        }
      });
      
      // Return top 40 items
      return items.slice(0, 40);
    }, country);

    console.log(`[eBay] Extracted ${listings.length} real listings (${listings.filter(l => l.price > 0).length} with prices)`);

    console.log(`✓ Found ${listings.length} real eBay listings`);

    const results: ScrapedEbayItem[] = listings.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      price: item.price,
      currencyId: "USD",
      location: item.location,
      listingType: "Buy It Now",
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
