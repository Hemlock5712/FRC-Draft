import { Prisma } from '@prisma/client';

// This will show us what fields are available in the type
type ParticipantFields = Prisma.DraftParticipantUpdateInput;

// Just to make TypeScript happy
export const dummy = true; 