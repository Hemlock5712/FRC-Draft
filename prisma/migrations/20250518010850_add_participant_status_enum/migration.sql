/*
  Warnings:

  - The `status` column on the `DraftParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "DraftParticipant" DROP COLUMN "status",
ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING';
