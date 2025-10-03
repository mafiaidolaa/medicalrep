'use server';
/**
 * @fileOverview Suggests invoice items for a new order based on a clinic's order history.
 *
 * - suggestInvoiceItems - A function that suggests products and quantities for a new invoice.
 * - SuggestInvoiceItemsInput - The input type for the suggestInvoiceItems function.
 * - SuggestInvoiceItemsOutput - The return type for the suggestInvoiceItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for a single historical order item
const HistoricalOrderItemSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  quantity: z.number().describe('The quantity ordered.'),
});

// Define the schema for a single historical order
const HistoricalOrderSchema = z.object({
  orderDate: z.string().describe('The date of the order (ISO format).'),
  items: z.array(HistoricalOrderItemSchema).describe('The items included in this order.'),
});

// Define the schema for the input to the flow
const SuggestInvoiceItemsInputSchema = z.object({
  clinicName: z.string().describe("The name of the clinic for which to suggest an order."),
  orderHistory: z.array(HistoricalOrderSchema).describe("The clinic's past order history."),
});
export type SuggestInvoiceItemsInput = z.infer<typeof SuggestInvoiceItemsInputSchema>;

// Define the schema for a single suggested item
const SuggestedItemSchema = z.object({
  productName: z.string().describe('The name of the suggested product.'),
  quantity: z.number().describe('The suggested quantity for this product.'),
  reasoning: z.string().describe('A brief reason for suggesting this item and quantity (e.g., "Frequently ordered", "Last ordered 2 months ago").'),
});

// Define the schema for the output of the flow
const SuggestInvoiceItemsOutputSchema = z.object({
  suggestedItems: z.array(SuggestedItemSchema).describe('A list of suggested products and quantities for the new invoice.'),
});
export type SuggestInvoiceItemsOutput = z.infer<typeof SuggestInvoiceItemsOutputSchema>;


export async function suggestInvoiceItems(input: SuggestInvoiceItemsInput): Promise<SuggestInvoiceItemsOutput> {
  return suggestInvoiceItemsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestInvoiceItemsPrompt',
  input: {schema: SuggestInvoiceItemsInputSchema},
  output: {schema: SuggestInvoiceItemsOutputSchema},
  prompt: `You are an AI assistant helping a medical representative create a new order for a clinic.
Your task is to analyze the clinic's past order history and suggest items for a new invoice.

Clinic Name: {{clinicName}}

Order History:
{{#each orderHistory}}
- Order on {{orderDate}}:
  {{#each items}}
  - {{productName}} (Quantity: {{quantity}})
  {{/each}}
{{/each}}

Based on this history, please suggest a list of products and quantities for the new order. Consider factors like:
- Frequency of orders for each product.
- Typical quantity ordered.
- The date of the last order for each product.

Provide a brief reasoning for each suggestion. Do not suggest more than 5 items.
`,
});

const suggestInvoiceItemsFlow = ai.defineFlow(
  {
    name: 'suggestInvoiceItemsFlow',
    inputSchema: SuggestInvoiceItemsInputSchema,
    outputSchema: SuggestInvoiceItemsOutputSchema,
  },
  async input => {
    // If there is no order history, return an empty suggestion.
    if (input.orderHistory.length === 0) {
      return { suggestedItems: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
