"use client";

import React from "react";

interface SearchInterfaceProps {
  searchWord: string;
  setSearchWord: (word: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isSearching: boolean;
}

export function SearchInterface({
  searchWord,
  setSearchWord,
  onSubmit,
  onKeyDown,
  isSearching
}: SearchInterfaceProps) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-white">YC Word Correlation</h2>
      <p className="text-white text-center max-w-2xl">
        Search for a word to find out what percentage of Y Combinator companies in each batch mention it in their company descriptions over time.
      </p>
      
      {/* Search Interface */}
      <div className="p-6 rounded-xl w-full max-w-2xl">
        <form onSubmit={onSubmit} className="flex gap-4">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Enter a word to search (e.g., 'AI', 'mobile', 'blockchain')"
            className="flex-1 px-4 py-2 rounded-lg border-2 border-white text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-white bg-transparent"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || !searchWord.trim()}
            className="px-6 py-2 bg-white text-[#f26522] hover:bg-gray-200 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>
    </div>
  );
}
