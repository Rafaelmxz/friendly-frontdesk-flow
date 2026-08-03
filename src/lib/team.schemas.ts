import { z } from "zod";

export const memberIdSchema = z.object({
  userId: z.string().uuid(),
});

export const inviteIdSchema = z.object({
  inviteId: z.string().uuid(),
});