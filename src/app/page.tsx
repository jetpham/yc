"use client";

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import * as d3 from "d3";
import Image from "next/image";
import type { WordCorrelationResult } from "~/server/api/routers/yc-companies";

// Loading Animation Component
function LoadingAnimation() {
  return (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <Image
              src="/Y_Combinator_logo.svg"
              alt="Y Combinator Logo"
              width={256}
              height={256}
              className="border-2 border-white animate-spin"
            />
          </div>
  );
}

// Function to perform Pearson correlation test (moved from server)
function performCorrelationTest(x: number[], y: number[]): { correlation: number; pValue: number; isSignificant: boolean } {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return { correlation: 0, pValue: 1, isSignificant: false };
  }
  
  const n = x.length;
  if (n < 3) {
    return { correlation: 0, pValue: 1, isSignificant: false };
  }
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate correlation coefficient
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i]! - meanX;
    const yDiff = y[i]! - meanY;
    numerator += xDiff * yDiff;
    sumXSquared += xDiff * xDiff;
    sumYSquared += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  
  // Simple t-test approximation for p-value
  const t = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
  // Rough approximation: p < 0.05 when |t| > 2.0 for reasonable sample sizes
  const pValue = t > 2.0 ? 0.01 : 0.5;
  const isSignificant = pValue < 0.05;
  
  return { correlation, pValue, isSignificant };
}

// Function to calculate linear regression slope (moved from server)
function calculateSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] || 0), 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const denominator = n * sumXX - sumX * sumX;
  return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
}

// D3 Visualization Component
function CorrelationChart({ data }: { data: WordCorrelationResult }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data.decimalYears) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data.ratios) as number])
      .range([height, 0]);

    // Line generator
    const line = d3.line<number>()
      .x((d, i) => xScale(data.decimalYears[i] || 0))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("fill", "white");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")))
      .selectAll("text")
      .style("fill", "white");

    // Style axis lines and ticks
    g.selectAll(".domain")
      .style("stroke", "white");
    
    g.selectAll(".tick line")
      .style("stroke", "white");

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text("Frequency (%)");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text("Year");

    // Add the line
    g.append("path")
      .datum(data.ratios)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add data points
    g.selectAll(".dot")
      .data(data.ratios)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => xScale(data.decimalYears[i] || 0))
      .attr("cy", (d) => yScale(d))
      .attr("r", 4)
      .attr("fill", "white")
      .on("mouseover", function(event, d) {
        const i = data.ratios.indexOf(d);
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);

        tooltip.html(`${data.batchLabels[i]}<br/>Frequency: ${(d * 100).toFixed(1)}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.selectAll(".tooltip").remove();
      });

    // Add trend line (always show if there's data)
    if (data.ratios.length > 1) {
      const trendLine = d3.line<[number, number]>()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

      const minYear = d3.min(data.decimalYears) as number;
      const maxYear = d3.max(data.decimalYears) as number;
      const meanX = d3.mean(data.decimalYears) as number;
      const meanY = d3.mean(data.ratios) as number;
      
      // Calculate slope for trendline
      const slope = data.slope || calculateSlope(data.decimalYears, data.ratios);
      
      const trendData: [number, number][] = [
        [minYear, meanY + slope * (minYear - meanX)],
        [maxYear, meanY + slope * (maxYear - meanX)]
      ];

      g.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", trendLine)
    }

  }, [data]);

  return (
    <div className="w-full flex justify-center">
      <svg ref={svgRef} width="800" height="400" className="bg-transparent rounded-lg"></svg>
    </div>
  );
}

// Search component that handles URL parameters
function SearchComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize search from URL parameters
  const [searchWord, setSearchWord] = useState(() => {
    return searchParams.get('q') || '';
  });
  
  // Track processing time
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Track if we're updating from URL to avoid feedback loops
  const isUpdatingFromURL = useRef(false);

  // Update search state when URL changes (from browser navigation, not our updates)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (!isUpdatingFromURL.current && urlQuery !== searchWord) {
      setSearchWord(urlQuery);
    }
    isUpdatingFromURL.current = false;
  }, [searchParams]);

  // Update URL when search word changes (debounced)
  const updateURL = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentQuery = params.get('q') || '';
    
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

  // Update URL immediately when search word changes
  useEffect(() => {
    const trimmedSearch = searchWord.trim();
    updateURL(trimmedSearch);
  }, [searchWord, updateURL]);

  // Fetch the batch data once (now includes decimal years from backend)
  const { 
    data: batchData, 
    isLoading: isLoadingData, 
    error: dataError 
  } = api.ycCompanies.getAll.useQuery();

  // Perform client-side analysis using useMemo for performance
  const searchResult = useMemo(() => {
    if (!batchData || !searchWord.trim()) {
      setProcessingTime(null);
      return null;
    }

    const startTime = performance.now();
    
    try {
      // Data is already sorted chronologically by the backend
      const searchTerm = searchWord.toLowerCase().trim();
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
  }, [batchData, searchWord]);

  const error = dataError?.message;
  const isSearching = isLoadingData;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is handled automatically by the debounced effect
  };

  // Show loading animation when data is being fetched initially
  if (isLoadingData) {
    return <LoadingAnimation />;
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold">YC Word Correlation Search</h2>
      <p className="text-white text-center max-w-2xl">
        Search for any word to see how its frequency in YC company descriptions has changed over time.
        The visualization shows correlation trends and statistical significance.
      </p>
      
      {/* Search Interface */}
      <div className=" p-6 rounded-xl w-full max-w-2xl">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="Enter a word to search (e.g., 'AI', 'mobile', 'blockchain')"
            className="flex-1 px-4 py-2 rounded-lg border-2 border-white text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-white"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || !searchWord.trim()}
            className="px-6 py-2 bg-white text-black hover:bg-gray-200  disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className=" border-2 border-white p-4 rounded-xl w-full max-w-2xl">
          <p className="text-white">{error}</p>
        </div>
      )}

      {/* No Results Display */}
      {searchResult?.noResults && (
        <div className=" border-2 border-white p-4 rounded-xl w-full max-w-2xl">
          <p className="text-white">Word "{searchWord.trim()}" not found in any company descriptions. Try a different word or check your spelling.</p>
          {processingTime !== null && (
            <p className="text-gray-400 text-sm mt-2">Processing time: {processingTime.toFixed(1)}ms</p>
          )}
        </div>
      )}

      {/* Results Display */}
      {searchResult && !searchResult.noResults && (
        <div className="w-full space-y-6">
          {/* Statistics */}
          <div className="border-2 border-white p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">Analysis Results for "{searchResult.word}"</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Correlation</p>
                <p className={`font-bold ${searchResult.correlation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {searchResult.correlation.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">P-Value</p>
                <p className="font-bold text-white">
                  {searchResult.pValue < 0.001 ? '<0.001' : searchResult.pValue.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Max Frequency</p>
                <p className="font-bold text-blue-400">
                  {(searchResult.maxRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400">Processing Time</p>
                <p className="font-bold text-yellow-400">
                  {processingTime !== null ? `${processingTime.toFixed(1)}ms` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* D3 Visualization */}
          <div className="border-2 border-white p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">Frequency Trend Over Time</h3>
            <CorrelationChart data={searchResult} />
          </div>
        </div>
      )}

      {/* Instructions */}
      {!searchResult && !error && !isSearching && (
        <div className="border-2 border-white p-6 rounded-xl w-full max-w-2xl text-center">
          <h3 className="text-lg font-semibold mb-2">How to Use</h3>
          <p className="text-gray-300 text-sm">
            Enter any word in the search box above to analyze its frequency trends across YC company descriptions over time. 
            The system will calculate correlation coefficients and statistical significance, then display an interactive D3 visualization.
          </p>
        </div>
      )}
    </div>
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