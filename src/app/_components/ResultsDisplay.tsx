import type { WordCorrelationResult } from "~/server/api/routers/yc-companies";
import { CorrelationChart } from "./CorrelationChart";

interface ResultsDisplayProps {
  searchResult: WordCorrelationResult;
  processingTime: number | null;
}

export function ResultsDisplay({ searchResult, processingTime }: ResultsDisplayProps) {
  return (
    <div className="flex flex-col items-center space-y-0 max-w-6xl mx-auto p-2">
      {/* D3 Visualization with integrated stats */}
      <div className="border-2 border-white p-6 rounded-xl w-fit">
        <h3 className="text-xl font-semibold mb-4 text-white">Analysis Results for &quot;{searchResult.word}&quot;</h3>
        <CorrelationChart data={searchResult} processingTime={processingTime} />
      </div>
    </div>
  );
}
