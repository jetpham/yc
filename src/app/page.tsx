import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const ycCompanies = await api.ycCompanies.getAll();

  // Create a HashSet (Set in JavaScript) to store unique words
  const uniqueWords = new Set<string>();

  // Process each company's description
  ycCompanies.forEach((company) => {
    if (company.long_description) {
      // Split by whitespace, periods, commas, semicolons, and forward slashes
      const words = company.long_description
        .split(/[\s.,;/]+/)
        .filter(word => word.length > 0) // Remove empty strings
        .map(word => word.toLowerCase().trim())
        .map(word => word.replace(/^[^\w]+|[^\w]+$/g, '')) // Trim symbols from both ends
        .filter(word => word.length > 0); // Remove empty strings after symbol trimming
      
      // Add each word to the HashSet
      words.forEach(word => uniqueWords.add(word));
    }
  });

  // Convert Set to Array for rendering
  const wordsArray = Array.from(uniqueWords).sort();

  return (
    <HydrateClient>
      <div className="flex flex-col items-center gap-4 max-w-4xl">
        <h2 className="text-3xl font-bold">Unique Words from YC Company Descriptions</h2>
        <div className="bg-white/10 p-4 rounded-xl w-full">
          <h3 className="text-xl font-semibold mb-2">
            Total Unique Words: {wordsArray.length}
          </h3>
          <div className="max-h-96 overflow-y-auto text-sm">
            <div className="grid grid-cols-4 gap-2">
              {wordsArray.map((word, index) => (
                <div key={index} className="text-gray-300 p-1 bg-white/5 rounded">
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
