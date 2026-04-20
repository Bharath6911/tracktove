import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import type { Bookmark } from "@/types/marketplace";

type BookmarkCardProps = {
  bookmark: Bookmark;
  href: string;
  onToggleTracking: (id: string) => void;
  onDelete: (id: string) => void;
};

export function BookmarkCard({ bookmark, href, onToggleTracking, onDelete }: BookmarkCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">{bookmark.marketplace}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{bookmark.term}</h3>
        </div>

        <button
          type="button"
          onClick={() => onDelete(bookmark.id)}
          className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-400/20"
        >
          Delete
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">Latest listings</p>
          <p className="mt-1 text-lg font-semibold text-white">{bookmark.totalLatest}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">Last updated</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatRelativeTime(bookmark.lastUpdatedIso)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggleTracking(bookmark.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            bookmark.trackingEnabled
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-slate-700/60 text-slate-300"
          }`}
        >
          {bookmark.trackingEnabled ? "Tracking Enabled" : "Tracking Disabled"}
        </button>

        <Link
          href={href}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
        >
          Open listings
        </Link>
      </div>
    </article>
  );
}
