"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { createListingsForBookmark } from "@/lib/mock-data";
import type { Marketplace } from "@/types/marketplace";

function normalizeMarketplace(value: string | null): Marketplace {
  if (value === "Etsy" || value === "StockX") {
    return value;
  }
  return "eBay";
}

export default function ListingDetailPage() {
  const params = useParams<{ bookmarkId: string; listingId: string }>();
  const searchParams = useSearchParams();

  const term = searchParams.get("term") ?? "saved search";
  const marketplace = normalizeMarketplace(searchParams.get("marketplace"));

  const listing = useMemo(() => {
    const all = createListingsForBookmark({
      bookmarkId: params.bookmarkId,
      term,
      marketplace,
      size: 80,
    });

    return all.find((item) => item.id === params.listingId) ?? null;
  }, [marketplace, params.bookmarkId, params.listingId, term]);

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h1 className="text-xl font-semibold">Listing not found</h1>
          <p className="mt-2 text-sm text-slate-300">This mock listing is no longer available.</p>
          <Link
            href={`/bookmarks/${params.bookmarkId}?term=${encodeURIComponent(term)}&marketplace=${encodeURIComponent(marketplace)}`}
            className="mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold hover:bg-indigo-400"
          >
            Back to listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:px-8">
        <article className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70">
          <img src={listing.imageUrl} alt={listing.title} className="h-[460px] w-full object-cover" />
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-wide text-indigo-300">{listing.marketplace}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{listing.title}</h1>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <span className="text-slate-300">Price</span>
              <span className="text-lg font-bold">{formatPrice(listing.price)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <span className="text-slate-300">Location</span>
              <span>{listing.location}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <span className="text-slate-300">Listing type</span>
              <span>{listing.listingType}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <span className="text-slate-300">Posted</span>
              <span>{formatRelativeTime(listing.postedAtIso)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <span className="text-slate-300">Seller</span>
              <a href={listing.sellerUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-200 underline decoration-indigo-400/60 underline-offset-4">
                {listing.sellerName}
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/bookmarks/${params.bookmarkId}?term=${encodeURIComponent(term)}&marketplace=${encodeURIComponent(marketplace)}`}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Back to listings
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
