
'use server';
/**
 * @fileOverview A flow for summarizing vehicle condition from text and images.
 *
 * - summarizeVehicleCondition - Analyzes vehicle condition and provides a structured summary.
 * - ConditionSummaryInput - The input type for the summarizeVehicleCondition function.
 * - ConditionSummaryOutput - The return type for the summarizeVehicleCondition function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConditionWizardDataSchema = z.object({
  runs: z.boolean().optional(),
  missingParts: z.array(z.string()).optional(),
  accident: z.boolean().optional(),
  hasMechanicalIssues: z.boolean().optional(),
  mechanicalIssues: z.string().optional(),
  hasRust: z.boolean().optional(),
  rustDetails: z.string().optional(),
  wheelType: z.string().optional(),
  hasBodyDamage: z.boolean().optional(),
  bodyDamageDetails: z.string().optional(),
  isComplete: z.boolean().optional(),
  incompleteDetails: z.string().optional(),
  photos: z.array(z.string()).optional(),
});


const ConditionSummaryInputSchema = z.object({
  conditionData: ConditionWizardDataSchema,
});
export type ConditionSummaryInput = z.infer<typeof ConditionSummaryInputSchema>;

const ConditionSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, one-sentence summary of the vehicle\'s overall condition.'),
  conditionScore: z.number().min(0).max(10).describe('A score from 0 (scrap) to 10 (perfect) representing the vehicle condition.'),
});
export type ConditionSummaryOutput = z.infer<typeof ConditionSummaryOutputSchema>;

export async function summarizeVehicleCondition(input: ConditionSummaryInput): Promise<ConditionSummaryOutput> {
  return summarizeConditionFlow(input);
}

const summarizeConditionPrompt = ai.definePrompt({
    name: 'summarizeConditionPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: ConditionSummaryInputSchema },
    output: { schema: ConditionSummaryOutputSchema },
    prompt: `You are an expert vehicle appraiser. Your task is to analyze the provided vehicle condition data and generate a concise summary and a condition score.

    Analyze the following data:
    - Does it run? {{conditionData.runs}}
    - Was it in an accident? {{conditionData.accident}}
    - Missing parts: {{#if conditionData.missingParts}} {{#each conditionData.missingParts}}{{{this}}}, {{/each}} {{else}}None{{/if}}
    - Mechanical issues: {{#if conditionData.hasMechanicalIssues}} Yes: {{conditionData.mechanicalIssues}} {{else}}No{{/if}}
    - Rust: {{#if conditionData.hasRust}} Yes: {{conditionData.rustDetails}} {{else}}No{{/if}}
    - Body damage: {{#if conditionData.hasBodyDamage}} Yes: {{conditionData.bodyDamageDetails}} {{else}}No{{/if}}
    - Is it complete? {{conditionData.isComplete}}
    {{#if conditionData.incompleteDetails}} - Missing details: {{conditionData.incompleteDetails}} {{/if}}
    
    {{#if conditionData.photos}}
    Images:
    {{#each conditionData.photos}}
    {{media url=this}}
    {{/each}}
    {{/if}}

    Based on all this information, provide a one-sentence summary of the car's state and a condition score from 0 (total scrap) to 10 (perfect condition).
    A running car with no major issues should be at least a 5. Deduct points for accidents, rust, major mechanical problems, and missing critical parts like the engine or catalyst.
    Be realistic in your assessment.`,
});

const summarizeConditionFlow = ai.defineFlow(
  {
    name: 'summarizeConditionFlow',
    inputSchema: ConditionSummaryInputSchema,
    outputSchema: ConditionSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeConditionPrompt(input);
    return output!;
  }
);
