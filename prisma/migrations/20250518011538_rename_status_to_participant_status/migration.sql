/*
  Warnings:

  - You are about to drop the column `status` on the `DraftParticipant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DraftParticipant" DROP COLUMN "status",
ADD COLUMN     "participantStatus" "ParticipantStatus" NOT NULL DEFAULT 'PENDING';
