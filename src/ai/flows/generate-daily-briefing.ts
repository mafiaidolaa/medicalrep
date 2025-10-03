'use server';
/**
 * @fileOverview Generates a smart daily briefing for a medical representative.
 *
 * - generateDailyBriefing - A function that creates a personalized morning summary.
 * - GenerateDailyBriefingInput - The input type for the function.
 * - GenerateDailyBriefingOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TodayTaskSchema = z.object({
  clinicName: z.string().describe('The name of the clinic for the task.'),
  taskType: z.string().describe('The type of task (e.g., visit, collection).'),
});

const DueInvoiceSchema = z.object({
    clinicName: z.string().describe('The name of the clinic with a due invoice.'),
    invoiceId: z.string().describe('The ID of the due invoice.'),
    amount: z.number().describe('The total amount of the due invoice.')
});

const LowStockProductSchema = z.object({
    productName: z.string().describe('The name of the product that is low in stock.'),
    currentStock: z.number().describe('The current stock level of the product.')
});

const GenerateDailyBriefingInputSchema = z.object({
  repName: z.string().describe("The name of the medical representative."),
  todaysTasks: z.array(TodayTaskSchema).describe("A list of tasks scheduled for today."),
  dueInvoices: z.array(DueInvoiceSchema).describe("A list of invoices that are due or overdue."),
  lowStockProducts: z.array(LowStockProductSchema).describe("A list of products that are running low on stock in the rep's area."),
});
export type GenerateDailyBriefingInput = z.infer<typeof GenerateDailyBriefingInputSchema>;

const GenerateDailyBriefingOutputSchema = z.object({
  greeting: z.string().describe('A personalized greeting for the representative.'),
  tasksSummary: z.string().describe('A summary of the number and types of tasks for the day.'),
  priorityHighlight: z.string().describe('A single, most important priority for the day, such as a high-value overdue invoice or a critical visit.'),
  stockAlert: z.string().optional().describe('An alert about low-stock products, if any.'),
});
export type GenerateDailyBriefingOutput = z.infer<typeof GenerateDailyBriefingOutputSchema>;


export async function generateDailyBriefing(input: GenerateDailyBriefingInput): Promise<GenerateDailyBriefingOutput> {
  return generateDailyBriefingFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateDailyBriefingPrompt',
  input: {schema: GenerateDailyBriefingInputSchema},
  output: {schema: GenerateDailyBriefingOutputSchema},
  prompt: `You are an AI assistant for a pharmaceutical company, and your goal is to provide a motivational and informative daily briefing for a medical representative named {{repName}}.

Today's Date: ${new Date().toLocaleDateString()}

Here is the information for today:
- Today's Tasks: {{json todaysTasks}}
- Due Invoices: {{json dueInvoices}}
- Low Stock Products in their area: {{json lowStockProducts}}

Based on this data, generate a concise and helpful daily briefing.

1.  **Greeting:** Start with a friendly and professional greeting.
2.  **Tasks Summary:** Briefly summarize the number of tasks for the day.
3.  **Priority Highlight:** Analyze all the data and identify the single MOST IMPORTANT priority for the day. This could be collecting a large overdue invoice, visiting a key client, or addressing a critical stock issue. Be specific.
4.  **Stock Alert:** If there are any low-stock products, mention them as a secondary alert.

The tone should be encouraging and professional. The output must be in Arabic.
`,
});

const generateDailyBriefingFlow = ai.defineFlow(
  {
    name: 'generateDailyBriefingFlow',
    inputSchema: GenerateDailyBriefingInputSchema,
    outputSchema: GenerateDailyBriefingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
