"use client";

import { useEffect, useMemo, useState } from "react";
import { AddBookmarkForm } from "@/components/dashboard/add-bookmark-form";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { fetchListings } from "@/lib/ebay-service";
import { createInitialBookmarks } from "@/lib/mock-data";
import type { Bookmark, Listing, Marketplace } from "@/types/marketplace";

const STORAGE_KEY = "tracktove.bookmarks.v1";

type GroupedListing = {
  bookmark: Bookmark;
  listings: Listing[];
  loading: boolean;
};

export function DashboardPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const savedRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!savedRaw) {
      return createInitialBookmarks();
    }

    try {
      return JSON.parse(savedRaw) as Bookmark[];
    } catch {
      return createInitialBookmarks();
    }
  });
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [groupedListings, setGroupedListings] = useState<GroupedListing[]>([]);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [scrollRefs, setScrollRefs] = useState<Record<string, HTMLDivElement | null>>({});
  const [selectedCountry, setSelectedCountry] = useState("USA");

  const countries = ["USA", "UK", "Australia", "Canada", "Germany", "France"];

  useEffect(() => {
    if (bookmarks.length === 0) {
      setGroupedListings([]);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Fetch real listings from all marketplaces
  useEffect(() => {
    const fetchAllListings = async () => {
      const groups: GroupedListing[] = [];

      for (const bookmark of bookmarks) {
        groups.push({
          bookmark,
          listings: [],
          loading: true,
        });
      }
      setGroupedListings(groups);

      // Fetch listings for each bookmark (searches all regions and marketplaces)
      const results = await Promise.all(
        bookmarks.map((bookmark) =>
          fetchListings(bookmark.term, bookmark.id, bookmark.country || selectedCountry)
        )
      );

      const updatedGroups = bookmarks.map((bookmark, index) => ({
        bookmark,
        listings: results[index] || [],
        loading: false,
      }));

      setGroupedListings(updatedGroups);
    };

    fetchAllListings();
  }, [bookmarks]);

  function handleAddBookmark(input: { term: string; marketplace: Marketplace }) {
    setBookmarks((previous) => {
      const dedupe = previous.find(
        (bookmark) =>
          bookmark.term.toLowerCase() === input.term.toLowerCase() &&
          bookmark.marketplace === input.marketplace &&
          bookmark.country === selectedCountry
      );

      if (dedupe) {
        return previous;
      }

      return [
        {
          id: crypto.randomUUID(),
          term: input.term,
          marketplace: input.marketplace,
          country: selectedCountry,
          totalLatest: 0,
          lastUpdatedIso: new Date().toISOString(),
          trackingEnabled: true,
        },
        ...previous,
      ];
    });
    setShowAddKeyword(false);
  }

  function handleDeleteBookmark(id: string) {
    setBookmarks((previous) => previous.filter((bookmark) => bookmark.id !== id));
  }

  function handleRefreshBookmark(bookmarkId: string) {
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      setGroupedListings((prev) =>
        prev.map((group) =>
          group.bookmark.id === bookmarkId ? { ...group, loading: true } : group
        )
      );

      fetchListings(bookmark.term, bookmark.id).then((listings) => {
        setGroupedListings((prev) =>
          prev.map((group) =>
            group.bookmark.id === bookmarkId
              ? { ...group, listings, loading: false }
              : group
          )
        );
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="w-full px-6 py-8" style={{ margin: "0 auto" }}>
        {/* Header */}
        <header className="mb-8">
          {/* Keyword Management Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowAddKeyword(!showAddKeyword)}
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
            >
              + Add new keyword
            </button>
            <button
              type="button"
              onClick={() => setEditingKeywords(!editingKeywords)}
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
            >
              ✎ Edit current keywords
            </button>
            <button
              type="button"
              onClick={() => {
                // Refetch all bookmarks
                setGroupedListings(
                  bookmarks.map((b) => ({ bookmark: b, listings: [], loading: true }))
                );

                Promise.all(
                  bookmarks.map((bookmark) =>
                    fetchListings(bookmark.term, bookmark.id)
                  )
                ).then((allListings) => {
                  setGroupedListings(
                    bookmarks.map((bookmark, idx) => ({
                      bookmark,
                      listings: allListings[idx] || [],
                      loading: false,
                    }))
                  );
                });
              }}
              className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/30 border border-blue-500/30"
            >
              🔄 Refresh all
            </button>
          </div>
        </header>

        {/* Add Keyword Form */}
        {showAddKeyword && (
          <div className="mb-8">
            <AddBookmarkForm 
              onSubmit={handleAddBookmark} 
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              countries={countries}
            />
          </div>
        )}

        {/* Edit Keywords Form */}
        {editingKeywords && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Manage Keywords</h3>
            {bookmarks.length === 0 ? (
              <p className="text-slate-400">No keywords yet. Add one above!</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white capitalize">
                        {bookmark.term}
                      </p>
                      <p className="text-xs text-slate-400">
                        {bookmark.marketplace}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-400/20"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listings Groups */}
        {groupedListings.length === 0 ? (
          <EmptyState
            title="No keywords yet"
            description="Add your first keyword above to start browsing marketplace listings."
          />
        ) : (
          <div className="space-y-12">
            {groupedListings.map(({ bookmark, listings, loading }) => (
              <section key={bookmark.id}>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold capitalize">{bookmark.term}</h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRefreshBookmark(bookmark.id)}
                      className="rounded-lg border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-400/20"
                    >
                      🔄 Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-400/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-slate-400">Searching eBay {bookmark.country || "USA"}...</div>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-slate-400">No listings found for "{bookmark.term}"</div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-slate-400">
                      Found {listings.length} listings
                    </div>
                    <div className="relative">
                      {/* Left scroll arrow */}
                      {listings.length > 4 && (
                        <button
                          onClick={() => {
                            const container = scrollRefs[bookmark.id];
                            if (container) {
                              container.scrollBy({ left: -400, behavior: "smooth" });
                            }
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-950/80 hover:bg-slate-900 rounded-full p-2 border border-white/20"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      
                      <div
                        ref={(el) => {
                          if (el) scrollRefs[bookmark.id] = el;
                        }}
                        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                      >
                        {listings.map((listing) => {
                          // Extract city from location string
                          const locationParts = listing.location.split(", ");
                          const city = locationParts[0] || listing.location;
                          
                          return (
                          <a
                            key={listing.id}
                            href={listing.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group shrink-0 w-48 overflow-hidden rounded-lg border border-white/10 bg-slate-900/70 shadow-lg shadow-black/20 transition hover:border-white/20 hover:shadow-xl"
                          >
                            <div className="relative overflow-hidden bg-slate-800">
                              <img
                                src={listing.imageUrl || "/placeholder-watch.svg"}
                                alt={listing.title}
                                className="h-40 w-full object-cover transition group-hover:scale-105"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (img.src !== "/placeholder-watch.svg") {
                                    img.src = "/placeholder-watch.svg";
                                  }
                                }}
                              />
                              {/* Marketplace Badge - no text */}
                              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded" />
                            </div>

                            <div className="space-y-2 p-3">
                              <h3 className="line-clamp-2 text-xs font-semibold text-white">
                                {listing.title}
                              </h3>

                              <div className="space-y-1">
                                <p className="text-xs text-slate-400">{city}</p>
                                <p className="text-xs text-slate-500 font-medium">{listing.listingType}</p>
                              </div>

                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-emerald-400">
                                  ${listing.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </a>
                          );
                        })}
                      </div>

                      {/* Right scroll arrow */}
                      {listings.length > 4 && (
                        <button
                          onClick={() => {
                            const container = scrollRefs[bookmark.id];
                            if (container) {
                              container.scrollBy({ left: 400, behavior: "smooth" });
                            }
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-950/80 hover:bg-slate-900 rounded-full p-2 border border-white/20"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
