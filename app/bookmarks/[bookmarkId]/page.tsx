"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ListingCard } from "@/components/listings/listing-card";
import { createListingsForBookmark } from "@/lib/mock-data";
import type { Marketplace } from "@/types/marketplace";

const LISTING_FILTERS = ["All", "Buy Now", "Auction"] as const;

type ListingFilter = (typeof LISTING_FILTERS)[number];

function normalizeMarketplace(value: string | null): Marketplace {
  if (value === "Etsy" || value === "StockX") {
    return value;
  }
  return "eBay";
}

export default function BookmarkListingsPage() {
  const params = useParams<{ bookmarkId: string }>();
  const searchParams = useSearchParams();

  const term = searchParams.get("term") ?? "saved search";
  const marketplace = normalizeMarketplace(searchParams.get("marketplace"));

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListingFilter>("All");

  const listings = useMemo(
    () =>
      createListingsForBookmark({
        bookmarkId: params.bookmarkId,
        term,
        marketplace,
        size: 48,
      }),
    [marketplace, params.bookmarkId, term]
  );

  const visibleListings = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return listings.filter((listing) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        listing.title.toLowerCase().includes(normalizedQuery) ||
        listing.location.toLowerCase().includes(normalizedQuery);

      const matchesFilter = filter === "All" || listing.listingType === filter;

      return matchesQuery && matchesFilter;
    });
  }, [filter, listings, query]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-300">{marketplace}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{term}</h1>
            <p className="mt-1 text-sm text-slate-300">Fast product grid with quick filters and direct listing links.</p>
          </div>

          <Link href="/" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inside these results"
            className="h-11 flex-1 rounded-xl border border-white/15 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-400"
          />

          <div className="flex gap-2">
            {LISTING_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  filter === option
                    ? "bg-indigo-500 text-white"
                    : "border border-white/15 bg-white/5 text-slate-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {visibleListings.length === 0 ? (
          <EmptyState
            title="No listings match your filter"
            description="Try another search term or switch listing type to All."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                detailHref={`/bookmarks/${params.bookmarkId}/listing/${listing.id}?term=${encodeURIComponent(term)}&marketplace=${encodeURIComponent(marketplace)}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
