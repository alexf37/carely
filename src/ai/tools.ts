import { tool as createTool } from "ai";
import { z } from "zod";

export const emergencyHotlinesTool = createTool({
  description:
    "Display emergency hotline phone numbers for the patient to call. Use this tool when the patient describes a medical emergency, crisis situation, or needs specialized support resources.",
  inputSchema: z.object({
    types: z
      .array(
        z.enum([
          "general",
          "poison",
          "suicide",
          "domesticViolence",
          "sexualAssault",
          "childAbuse",
          "substanceAbuse",
          "veterans",
          "lgbtqYouth",
          "eatingDisorders",
        ])
      )
      .min(1)
      .describe(
        "Which emergency hotlines to display: 'general' for 911, 'poison' for Poison Control, 'suicide' for 988 Crisis Lifeline, 'domesticViolence' for National Domestic Violence Hotline, 'sexualAssault' for RAINN, 'childAbuse' for Childhelp, 'substanceAbuse' for SAMHSA, 'veterans' for Veterans Crisis Line, 'lgbtqYouth' for Trevor Project, 'eatingDisorders' for Eating Disorders Hotline"
      ),
  }),
  execute: async function ({ types }) {
    console.log("displayEmergencyHotlines tool executed", { types });
    return { types };
  },
});

export const tools = {
  displayEmergencyHotlines: emergencyHotlinesTool,
};
