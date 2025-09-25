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

export const ycCompaniesRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async (): Promise<ParsedYCCompany[]> => {
      try {
        const response = await fetch('https://yc-oss.github.io/api/companies/all.json');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch YC companies: ${response.status}`);
        }

        const rawData = await response.json() as RawYCCompany[];
        
        // Parse and filter the data to only include the fields we need
        const parsedData: ParsedYCCompany[] = rawData.map((company) => ({
          name: company.name,
          long_description: company.long_description || '', // Handle potential null/undefined
          batch: company.batch,
        }));

        return parsedData;
      } catch (error) {
        console.error('Error fetching YC companies:', error);
        throw new Error('Failed to fetch YC companies data');
      }
    }),
});
