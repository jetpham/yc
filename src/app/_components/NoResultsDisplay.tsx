interface NoResultsDisplayProps {
  searchWord: string;
  processingTime: number | null;
}

export function NoResultsDisplay({ searchWord, processingTime }: NoResultsDisplayProps) {
  return (
    <div className="flex justify-center">
      <div className="border-2 border-white p-4 rounded-xl w-fit">
        <p className="text-white text-center">Word &quot;{searchWord.trim()}&quot; not found in any company descriptions. Try a different word or check your spelling.</p>
        {processingTime !== null && (
          <p className="text-white text-sm mt-2 text-center">Processing time: {processingTime.toFixed(1)}ms</p>
        )}
      </div>
    </div>
  );
}
