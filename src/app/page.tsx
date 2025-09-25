import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // Use tRPC with proper response caching configured in the API handler
  const ycCompanies = await api.ycCompanies.getAll();

  return (
    <HydrateClient>

          {/* YC Companies Data Test */}
          <div className="flex flex-col items-center gap-4 max-w-4xl">
            <h2 className="text-3xl font-bold">YC Companies Data Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="bg-white/10 p-4 rounded-xl">
                <h3 className="text-xl font-semibold mb-2">Data Summary</h3>
                <p>Total Companies: {ycCompanies.length}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <h3 className="text-xl font-semibold mb-2">Recent Batches</h3>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl w-full">
              <h3 className="text-xl font-semibold mb-2">Sample Companies</h3>
              <div className="text-sm space-y-2">
                {ycCompanies.slice(0, 3).map((company, index) => (
                  <div key={index} className="border-b border-white/20 pb-2">
                    <p className="font-semibold">{company.name} ({company.batch})</p>
                    <p className="text-gray-300 truncate">{company.long_description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

    </HydrateClient>
  );
}
