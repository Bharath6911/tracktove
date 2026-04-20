"use client";

import { useState } from "react";
import type { Marketplace } from "@/types/marketplace";

type AddBookmarkFormProps = {
  onSubmit: (payload: { term: string; marketplace: Marketplace }) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  countries: string[];
};

const MARKETPLACES: Marketplace[] = ["eBay", "Etsy", "StockX"];

export function AddBookmarkForm({ onSubmit, selectedCountry, onCountryChange, countries }: AddBookmarkFormProps) {
  const [term, setTerm] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace>("eBay");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = term.trim();
    if (!trimmed) {
      return;
    }

    onSubmit({ term: trimmed, marketplace });
    setTerm("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <p className="text-sm text-amber-200">
          ℹ️ Currently only <strong>eBay</strong> is fully supported. Other marketplaces coming soon!
        </p>
      </div>
      
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Track anything: watches, books, cards, laptops..."
          className="h-11 flex-1 rounded-xl border border-white/15 bg-slate-950/70 px-4 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-400"
        />

        <select
          value={selectedCountry}
          onChange={(event) => onCountryChange(event.target.value)}
          className="h-11 rounded-xl border border-white/15 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-indigo-400"
        >
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        <select
          value={marketplace}
          onChange={(event) => setMarketplace(event.target.value as Marketplace)}
          className="h-11 rounded-xl border border-white/15 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-indigo-400"
        >
          {MARKETPLACES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Add Bookmark
        </button>
      </div>
    </form>
  );
}
