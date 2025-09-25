"use client";

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import type { WordCorrelationResult } from "~/server/api/routers/yc-companies";
import { LoadingAnimation } from "./_components/LoadingAnimation";
import { SearchInterface } from "./_components/SearchInterface";
import { ErrorDisplay } from "./_components/ErrorDisplay";
import { NoResultsDisplay } from "./_components/NoResultsDisplay";
import { ResultsDisplay } from "./_components/ResultsDisplay";
import { performCorrelationTest, calculateSlope } from "./_components/correlationUtils";

// Search component that handles URL parameters
function SearchComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize search from URL parameters
  const [searchWord, setSearchWord] = useState(() => {
    return searchParams.get('q') ?? '';
  });
  
  // Separate state for the actual search query that triggers API calls
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('q') ?? '';
  });
  
  // Track processing time
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Track if we're updating from URL to avoid feedback loops
  const isUpdatingFromURL = useRef(false);

  // Update search state when URL changes (from browser navigation, not our updates)
  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    if (!isUpdatingFromURL.current && urlQuery !== searchWord) {
      setSearchWord(urlQuery);
      setSearchQuery(urlQuery);
    }
    isUpdatingFromURL.current = false;
  }, [searchParams, searchWord]);

  // Update URL when search word changes (debounced)
  const updateURL = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentQuery = params.get('q') ?? '';
    
    // Only update URL if the query actually changed
    if (query.trim() !== currentQuery) {
      isUpdatingFromURL.current = true;
      if (query.trim()) {
        params.set('q', query.trim());
      } else {
        params.delete('q');
      }
      const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newURL, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // Debounced URL update and search query effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedSearch = searchWord.trim();
      updateURL(trimmedSearch);
      setSearchQuery(trimmedSearch);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchWord, updateURL]);


  // Fetch the batch data once (now includes decimal years from backend)
  const { 
    data: batchData, 
    isLoading: isLoadingData, 
    error: dataError 
  } = api.ycCompanies.getAll.useQuery();

  // Perform client-side analysis using useMemo for performance
  const searchResult = useMemo(() => {
    if (!batchData || !searchQuery.trim()) {
      setProcessingTime(null);
      return null;
    }

    const startTime = performance.now();
    
    try {
      // Data is already sorted chronologically by the backend
      const searchTerm = searchQuery.toLowerCase().trim();
      const ratios: number[] = [];
      const decimalYears: number[] = [];
      const batchLabels: string[] = [];
      
      batchData.forEach((batch) => {
        const totalCompanies = batch.companies.length;
        const companiesWithWord = batch.companies.filter((company) => {
          if (!company.long_description) return false;
          
          // Convert description to lowercase and split by whitespace, periods, slashes, and commas
          const words = company.long_description
            .toLowerCase()
            .split(/[\s.,/]+/)
            .map(word => word.replace(/^[^\w]+|[^\w]+$/g, '')) // Trim symbols from sides
            .filter(word => word.length > 0); // Remove empty words
          
          return words.includes(searchTerm);
        }).length;
        
        const ratio = totalCompanies > 0 ? companiesWithWord / totalCompanies : 0;
        ratios.push(ratio);
        decimalYears.push(batch.decimalYear);
        batchLabels.push(batch.batch);
      });
      
      // Check if word appears in any companies
      const maxRatio = Math.max(...ratios);
      if (maxRatio === 0) {
        const endTime = performance.now();
        setProcessingTime(endTime - startTime);
        
        return {
          word: searchTerm,
          ratios,
          decimalYears,
          correlation: 0,
          pValue: 1,
          isSignificant: false,
          slope: 0,
          maxRatio: 0,
          batchLabels,
          noResults: true
        };
      }
      
      const corrTest = performCorrelationTest(decimalYears, ratios);
      const slope = calculateSlope(decimalYears, ratios);
      
      const result: WordCorrelationResult = {
        word: searchTerm,
        ratios,
        decimalYears,
        correlation: corrTest.correlation,
        pValue: corrTest.pValue,
        isSignificant: corrTest.isSignificant,
        slope,
        maxRatio,
        batchLabels
      };

      const endTime = performance.now();
      setProcessingTime(endTime - startTime);

      return result;
    } catch (error) {
      console.error('Error in word correlation analysis:', error);
      return null;
    }
  }, [batchData, searchQuery]);

  const error = dataError?.message;
  const isSearching = isLoadingData;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger immediate search by clearing debounce and updating directly
    const trimmedSearch = searchWord.trim();
    setSearchQuery(trimmedSearch);
    updateURL(trimmedSearch);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e as React.FormEvent);
    }
  };

  // Show loading animation when data is being fetched initially
  if (isLoadingData) {
    return <LoadingAnimation />;
  }

  return (
    <>
      <SearchInterface
        searchWord={searchWord}
        setSearchWord={setSearchWord}
        onSubmit={handleSearch}
        onKeyDown={handleKeyDown}
        isSearching={isSearching}
      />

      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}

      {/* No Results Display */}
      {searchResult?.noResults && (
        <NoResultsDisplay 
          searchWord={searchWord} 
          processingTime={processingTime} 
        />
      )}

      {/* Results Display */}
      {searchResult && !searchResult.noResults && (
        <ResultsDisplay 
          searchResult={searchResult} 
          processingTime={processingTime} 
        />
      )}
    </>
  );
}

// Fallback component for Suspense boundary
function SearchFallback() {
  return <LoadingAnimation />;
}

// Main component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchComponent />
    </Suspense>
  );
}