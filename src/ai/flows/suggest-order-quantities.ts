'use server';
/**
 * @fileOverview Suggests optimal order quantities for products that are running low on stock.
 *
 * - suggestOrderQuantities - A function that suggests order quantities based on current stock levels.
 * - SuggestOrderQuantitiesInput - The input type for the suggestOrderQuantities function.
 * - SuggestOrderQuantitiesOutput - The return type for the suggestOrderQuantities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOrderQuantitiesInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  currentStock: z.number().describe('The current stock level of the product.'),
  averageDailyUsage: z.number().describe('The average daily usage of the product.'),
  daysUntilNextVisit: z.number().describe('The number of days until the next clinic visit.'),
});
export type SuggestOrderQuantitiesInput = z.infer<typeof SuggestOrderQuantitiesInputSchema>;

const SuggestOrderQuantitiesOutputSchema = z.object({
  suggestedQuantity: z
    .number()
    .describe('The suggested order quantity to ensure adequate supply until the next visit.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested quantity, considering stock levels and usage.'),
});
export type SuggestOrderQuantitiesOutput = z.infer<typeof SuggestOrderQuantitiesOutputSchema>;

export async function suggestOrderQuantities(input: SuggestOrderQuantitiesInput): Promise<SuggestOrderQuantitiesOutput> {
  return suggestOrderQuantitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOrderQuantitiesPrompt',
  input: {schema: SuggestOrderQuantitiesInputSchema},
  output: {schema: SuggestOrderQuantitiesOutputSchema},
  prompt: `You are an AI assistant helping medical representatives determine optimal order quantities for products.

  Given the following information, suggest an order quantity that ensures the clinic has enough stock until the next visit:

  Product Name: {{productName}}
  Current Stock: {{currentStock}}
  Average Daily Usage: {{averageDailyUsage}}
  Days Until Next Visit: {{daysUntilNextVisit}}

  Consider the current stock level, average daily usage, and the number of days until the next visit to calculate the suggested quantity.
  Explain your reasoning for the suggested quantity.
  `,
});

const suggestOrderQuantitiesFlow = ai.defineFlow(
  {
    name: 'suggestOrderQuantitiesFlow',
    inputSchema: SuggestOrderQuantitiesInputSchema,
    outputSchema: SuggestOrderQuantitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
