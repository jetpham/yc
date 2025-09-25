import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Interface for the raw YC company data from the API
interface RawYCCompany {
  id: number;
  name: string;
  slug: string;
  former_names: string[];
  small_logo_thumb_url: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  industry: string;
  subindustry: string;
  launched_at: number;
  tags: string[];
  tags_highlighted: string[];
  top_company: boolean;
  isHiring: boolean;
  nonprofit: boolean;
  batch: string;
  status: string;
  industries: string[];
  regions: string[];
  stage: string;
  app_video_public: boolean;
  demo_day_video_public: boolean;
  app_answers: unknown;
  question_answers: boolean;
  url: string;
  api: string;
}

// Interface for our parsed/simplified YC company data
export interface ParsedYCCompany {
  name: string;
  long_description: string;
  batch: string;
}

// Interface for batch data with decimal year
export interface BatchInfo {
  batch: string;
  decimalYear: number;
  companies: ParsedYCCompany[];
}

// Interface for word correlation analysis result (kept for client-side use)
export interface WordCorrelationResult {
  word: string;
  ratios: number[];
  decimalYears: number[];
  correlation: number;
  pValue: number;
  isSignificant: boolean;
  slope: number;
  maxRatio: number;
  batchLabels: string[];
  noResults?: boolean;
}

// Function to parse batch string to decimal year
function parseBatchToDecimalYear(batch: string): number {
  const parts = batch.trim().split(' ');
  if (parts.length !== 2) {
    console.warn(`Unexpected batch format: ${batch}`);
    return 0;
  }
  
  const season = parts[0]?.toLowerCase() ?? '';
  const year = parseInt(parts[1] ?? '0');
  
  if (isNaN(year)) {
    console.warn(`Could not parse year from batch: ${batch}`);
    return 0;
  }
  
  let seasonOffset: number;
  switch (season) {
    case 'winter':
      seasonOffset = 0.0;
      break;
    case 'spring':
      seasonOffset = 0.25;
      break;
    case 'summer':
      seasonOffset = 0.5;
      break;
    case 'fall':
      seasonOffset = 0.75;
      break;
    default:
      console.warn(`Unknown season in batch: ${batch}`);
      seasonOffset = 0.0;
      break;
  }
  
  return year + seasonOffset;
}

export const ycCompaniesRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async (): Promise<BatchInfo[]> => {
      try {
        const response = await fetch('https://yc-oss.github.io/api/companies/all.json');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch YC companies: ${response.status}`);
        }

        const rawData = await response.json() as RawYCCompany[];
        
        // Parse and filter the data to only include companies with valid batch formats
        const companies: ParsedYCCompany[] = rawData
          .filter((company) => {
            // Only include companies with valid batch format: "Season YYYY"
            return typeof company.batch === "string" && 
                   /^(Winter|Spring|Summer|Fall) \d{4}$/.test(company.batch);
          })
          .map((company) => ({
            name: company.name,
            long_description: company.long_description || '', // Handle potential null/undefined
            batch: company.batch, // We know this is valid due to the filter above
          }));

        // Group companies by batch
        const batchMap: Record<string, ParsedYCCompany[]> = {};
        
        companies.forEach((company) => {
          batchMap[company.batch] ??= [];
          batchMap[company.batch]!.push(company);
        });

        // Create batch data with decimal years and sort chronologically
        const batchData: BatchInfo[] = Object.entries(batchMap)
          .map(([batch, batchCompanies]) => ({
            batch,
            decimalYear: parseBatchToDecimalYear(batch),
            companies: batchCompanies
          }))
          .sort((a, b) => a.decimalYear - b.decimalYear);

        return batchData;
      } catch (error) {
        console.error('Error fetching YC companies:', error);
        throw new Error('Failed to fetch YC companies data');
      }
    }),

});
