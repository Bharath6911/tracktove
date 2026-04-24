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

      <div className="space-y-2 p-4">
        {/* Listing Type and Posted Time */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md bg-indigo-400/15 px-2 py-1 font-medium text-indigo-200">
            {listing.listingType}
          </span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-1 font-semibold text-emerald-300">
            {formatRelativeTime(listing.postedAtIso)}
          </span>
        </div>

        {/* Location - City and Country only */}
        <p className="text-xs text-slate-300 font-medium">{listing.location}</p>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{listing.title}</h3>

        {/* Price */}
        <p className="text-lg font-bold text-emerald-400">{formatPrice(listing.price, listing.currency)}</p>

        {/* View Detail Button */}
        <Link
          href={detailHref}
          className="block rounded-lg bg-indigo-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-400"
        >
          View detail
        </Link>
      </div>
    </article>
  );
}
