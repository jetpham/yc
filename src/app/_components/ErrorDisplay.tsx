interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="border-2 border-white p-4 rounded-xl w-full max-w-2xl">
      <p className="text-white">{error}</p>
    </div>
  );
}
