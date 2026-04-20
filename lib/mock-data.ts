import type { Bookmark, Listing, ListingType, Marketplace } from "@/types/marketplace";

const PLACES = [
  "New York, US",
  "Los Angeles, US",
  "Austin, US",
  "London, UK",
  "Berlin, DE",
  "Tokyo, JP",
  "Toronto, CA",
  "Sydney, AU",
];

const ADJECTIVES = [
  "Rare",
  "Collector",
  "Vintage",
  "Premium",
  "Authentic",
  "Mint",
  "Limited",
  "Refurbished",
];

const MARKETPLACE_SEARCH_URLS: Record<Marketplace, string> = {
  eBay: "https://www.ebay.com/sch/i.html?_nkw=",
  Etsy: "https://www.etsy.com/search?q=",
  StockX: "https://stockx.com/search?s=",
};

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededNumber(seed: string, min: number, max: number): number {
  const hash = hashString(seed);
  return min + (hash % (max - min + 1));
}

function pick<T>(array: T[], seed: string): T {
  return array[hashString(seed) % array.length];
}

function createSvgDataUrl(
  title: string,
  marketplace: Marketplace,
  index: number,
  seed: string,
): string {
  const hue = hashString(seed) % 360;
  const hue2 = (hue + 48) % 360;
  const accent = pick(["#ffffff", "#e0f2fe", "#ddd6fe", "#fce7f3", "#dcfce7"], seed);
  const accent2 = pick(["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#f59e0b"], `${seed}-accent`);
  const safeTitle = `${marketplace} ${title}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 72% 18%)" />
          <stop offset="100%" stop-color="hsl(${hue2} 72% 30%)" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.26)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)" />
      <circle cx="160" cy="180" r="230" fill="url(#glow)" />
      <circle cx="620" cy="610" r="250" fill="rgba(255,255,255,0.06)" />
      <rect x="112" y="160" width="136" height="420" rx="68" fill="rgba(255,255,255,0.10)" transform="rotate(-12 180 370)" />
      <rect x="390" y="150" width="178" height="430" rx="36" fill="rgba(255,255,255,0.09)" transform="rotate(14 479 365)" />
      <circle cx="260" cy="250" r="34" fill="rgba(255,255,255,0.16)" />
      <circle cx="540" cy="540" r="78" fill="rgba(255,255,255,0.12)" />
      <path d="M120 640 C240 560, 340 560, 420 610 S580 690, 720 610" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" opacity="0.85" />
      <path d="M104 684 C232 604, 356 604, 448 654 S606 736, 726 660" fill="none" stroke="${accent2}" stroke-width="14" stroke-linecap="round" opacity="0.7" />
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function estimateLatestCount(term: string): number {
  return seededNumber(`${term}-latest-count`, 25, 240);
}

export function createInitialBookmarks(): Bookmark[] {
  const now = new Date().toISOString();

  const seeds: Array<{ term: string; marketplace: Marketplace }> = [
    { term: "vintage watches", marketplace: "eBay" },
    { term: "retro sneakers", marketplace: "eBay" },
    { term: "pokemon cards", marketplace: "eBay" },
  ];

  return seeds.map((seed, index) => ({
    id: `bookmark-${index + 1}`,
    term: seed.term,
    marketplace: seed.marketplace,
    totalLatest: estimateLatestCount(seed.term),
    lastUpdatedIso: now,
    trackingEnabled: true,
  }));
}

export function refreshBookmarkStats(bookmarks: Bookmark[]): Bookmark[] {
  const now = new Date().toISOString();

  return bookmarks.map((bookmark) => {
    if (!bookmark.trackingEnabled) {
      return bookmark;
    }

    const variance = seededNumber(`${bookmark.term}-${Date.now()}`, -4, 10);
    const nextTotal = Math.max(0, bookmark.totalLatest + variance);

    return {
      ...bookmark,
      totalLatest: nextTotal,
      lastUpdatedIso: now,
    };
  });
}

export function createListingsForBookmark(input: {
  bookmarkId: string;
  term: string;
  marketplace: Marketplace;
  size?: number;
}): Listing[] {
  const size = input.size ?? 36;

  const listings: Listing[] = Array.from({ length: size }, (_, index) => {
    const seed = `${input.term}-${index + 1}`;
    const id = `${input.bookmarkId}-listing-${index + 1}`;
    const price = seededNumber(seed, 45, 2800);
    const hadPriceDrop = seededNumber(`${seed}-drop`, 0, 100) > 70;
    const previousPrice = hadPriceDrop ? price + seededNumber(`${seed}-delta`, 5, 250) : null;
    const listingType: ListingType = seededNumber(`${seed}-type`, 0, 100) > 45 ? "Buy Now" : "Auction";
    const postedMinutesAgo = seededNumber(`${seed}-age`, 5, 60 * 72);

    const itemTitle = `${pick(ADJECTIVES, `${seed}-adj`)} ${input.term}`;
    const searchQuery = encodeURIComponent(`${input.term} ${itemTitle}`);
    const marketplaceSearchUrl = `${MARKETPLACE_SEARCH_URLS[input.marketplace]}${searchQuery}`;

    return {
      id,
      bookmarkId: input.bookmarkId,
      marketplace: input.marketplace,
      title: itemTitle,
      price,
      previousPrice,
      location: pick(PLACES, `${seed}-loc`),
      listingType,
      postedAtIso: new Date(Date.now() - postedMinutesAgo * 60 * 1000).toISOString(),
      imageUrl: createSvgDataUrl(itemTitle, input.marketplace, index, seed),
      listingUrl: marketplaceSearchUrl,
      sellerName: `seller_${seededNumber(`${seed}-seller`, 1000, 9999)}`,
      sellerUrl: `${MARKETPLACE_SEARCH_URLS[input.marketplace]}${encodeURIComponent(`seller ${input.term}`)}`,
    };
  });

  return listings;
}
