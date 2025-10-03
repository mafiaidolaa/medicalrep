'use server';
/**
 * @fileOverview An AI agent that identifies sales opportunities from CRM data.
 *
 * - generateOpportunityRadar - A function that suggests sales opportunities.
 * - GenerateOpportunityRadarInput - The input type for the function.
 * - GenerateOpportunityRadarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClinicOrderHistorySchema = z.object({
  clinicName: z.string(),
  lastOrderDate: z.string().describe("The date of the clinic's last order (ISO format)."),
  totalSpent: z.number().describe("The total amount spent by this clinic."),
});

const RegionalProductTrendSchema = z.object({
    productName: z.string(),
    totalSold: z.number().describe("Total units sold in the region."),
});

const GenerateOpportunityRadarInputSchema = z.object({
  clinicsOrderHistory: z.array(ClinicOrderHistorySchema).describe("The order history for clinics in the representative's area."),
  regionalProductTrends: z.array(RegionalProductTrendSchema).describe("Trending products in the representative's region."),
});
export type GenerateOpportunityRadarInput = z.infer<typeof GenerateOpportunityRadarInputSchema>;

const OpportunitySchema = z.object({
    clinicName: z.string().describe("The name of the clinic the opportunity relates to."),
    opportunity: z.string().describe("A concise description of the sales opportunity (e.g., 'Suggest Product X', 'Schedule follow-up visit')."),
    reasoning: z.string().describe("A brief explanation for why this is a good opportunity (e.g., 'Hasn't ordered in 75 days', 'Product Y is trending in their area')."),
    suggestedAction: z.string().describe("A clear, actionable next step for the representative (e.g., 'Schedule a visit', 'Prepare a quote for Product X').")
});

const GenerateOpportunityRadarOutputSchema = z.object({
  opportunities: z.array(OpportunitySchema).describe('A list of high-potential sales opportunities.'),
});
export type GenerateOpportunityRadarOutput = z.infer<typeof GenerateOpportunityRadarOutputSchema>;


export async function generateOpportunityRadar(input: GenerateOpportunityRadarInput): Promise<GenerateOpportunityRadarOutput> {
  return generateOpportunityRadarFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateOpportunityRadarPrompt',
  input: {schema: GenerateOpportunityRadarInputSchema},
  output: {schema: GenerateOpportunityRadarOutputSchema},
  prompt: `You are an expert sales analyst AI for a pharmaceutical company. Your job is to identify high-potential sales opportunities for medical representatives by analyzing CRM data.

Analyze the following data:
1.  **Clinics Order History:** {{json clinicsOrderHistory}}
2.  **Regional Product Trends:** {{json regionalProductTrends}}

Identify up to 3 concrete sales opportunities. For each opportunity, provide the clinic name, a description of the opportunity, a clear reasoning, and a suggested next action.

Focus on opportunities like:
-   **Dormant Clinics:** Clinics that haven't ordered in a long time (e.g., over 60 days).
-   **Cross-selling:** Suggesting trending products to clinics that haven't purchased them yet.
-   **Upselling:** Identifying clinics with high potential for larger orders.

Today's date is ${new Date().toISOString()}. The output must be in Arabic.
`,
});

const generateOpportunityRadarFlow = ai.defineFlow(
  {
    name: 'generateOpportunityRadarFlow',
    inputSchema: GenerateOpportunityRadarInputSchema,
    outputSchema: GenerateOpportunityRadarOutputSchema,
  },
  async input => {
    // If there is no history, return no opportunities.
    if (input.clinicsOrderHistory.length === 0) {
      return { opportunities: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
