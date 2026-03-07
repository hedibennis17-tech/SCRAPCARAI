
'use server';
/**
 * @fileOverview A flow for extracting a Vehicle Identification Number (VIN) from an image.
 *
 * - extractVinFromImage - A function that takes an image data URI and returns a 17-character VIN.
 * - VinExtractInput - The input type for the extractVinFromImage function.
 * - VinExtractOutput - The return type for the extractVinFromImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VinExtractInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a VIN, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VinExtractInput = z.infer<typeof VinExtractInputSchema>;

const VinExtractOutputSchema = z.object({
    vin: z.string().describe('The 17-character Vehicle Identification Number (VIN). If not found, return an empty string.')
});
export type VinExtractOutput = z.infer<typeof VinExtractOutputSchema>;

export async function extractVinFromImage(input: VinExtractInput): Promise<VinExtractOutput> {
  return extractVinFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractVinPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: VinExtractInputSchema },
  output: { schema: VinExtractOutputSchema },
  prompt: `You are an expert at extracting Vehicle Identification Numbers (VINs) from images.
  
  Analyze the following image and extract the 17-character VIN. The VIN consists of letters and numbers.
  
  Image: {{media url=imageDataUri}}
  
  Return ONLY the 17-character VIN. If you cannot find a valid VIN, return an empty string.`,
});

const extractVinFlow = ai.defineFlow(
  {
    name: 'extractVinFlow',
    inputSchema: VinExtractInputSchema,
    outputSchema: VinExtractOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
