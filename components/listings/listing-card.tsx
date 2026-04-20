import Link from "next/link";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { Listing } from "@/types/marketplace";

type ListingCardProps = {
  listing: Listing;
  detailHref: string;
};

export function ListingCard({ listing, detailHref }: ListingCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/20">
      <img src={listing.imageUrl} alt={listing.title} className="h-52 w-full object-cover" loading="lazy" />

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-indigo-400/15 px-2 py-1 text-xs font-medium text-indigo-200">
            {listing.listingType}
          </span>
          <span className="text-xs text-slate-300">{listing.location}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-white">{listing.title}</h3>

        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-white">{formatPrice(listing.price, listing.currency)}</p>
          <p className="text-xs text-slate-400">{formatRelativeTime(listing.postedAtIso)}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={detailHref}
            className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-400"
          >
            View detail
          </Link>
        </div>
      </div>
    </article>
  );
}
