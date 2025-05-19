/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DraftParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `DraftParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `pickOrder` on the `DraftParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DraftParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `DraftPick` table. All the data in the column will be lost.
  - You are about to drop the column `roundNumber` on the `DraftPick` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `DraftRoom` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `DraftRoom` table. All the data in the column will be lost.
  - You are about to drop the column `pickTimeSeconds` on the `DraftRoom` table. All the data in the column will be lost.
  - You are about to drop the column `snakeFormat` on the `DraftRoom` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `DraftRoom` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roomId,userId]` on the table `DraftParticipant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomId,pickNumber]` on the table `DraftPick` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomId,teamId]` on the table `DraftPick` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roomId` to the `DraftParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `DraftPick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `DraftRoom` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DraftParticipant" DROP CONSTRAINT "DraftParticipant_roomId_fkey";

-- DropForeignKey
ALTER TABLE "DraftPick" DROP CONSTRAINT "DraftPick_roomId_fkey";

-- DropForeignKey
ALTER TABLE "DraftRoom" DROP CONSTRAINT "DraftRoom_createdBy_fkey";

-- DropIndex
DROP INDEX "DraftParticipant_roomId_pickOrder_key";

-- DropIndex
DROP INDEX "DraftParticipant_roomId_userId_key";

-- DropIndex
DROP INDEX "DraftPick_roomId_pickNumber_key";

-- DropIndex
DROP INDEX "DraftPick_roomId_teamId_key";

-- AlterTable
ALTER TABLE "DraftParticipant" DROP COLUMN "createdAt",
DROP COLUMN "roomId",
DROP COLUMN "pickOrder",
DROP COLUMN "updatedAt",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "roomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DraftPick" DROP COLUMN "roomId",
DROP COLUMN "roundNumber",
ADD COLUMN     "roomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DraftRoom" DROP COLUMN "createdBy",
DROP COLUMN "endTime",
DROP COLUMN "pickTimeSeconds",
DROP COLUMN "snakeFormat",
DROP COLUMN "startTime",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "isSnakeDraft" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pickTimeLimit" INTEGER NOT NULL DEFAULT 120,
ALTER COLUMN "maxTeams" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "DraftParticipant_roomId_userId_key" ON "DraftParticipant"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_roomId_pickNumber_key" ON "DraftPick"("roomId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_roomId_teamId_key" ON "DraftPick"("roomId", "teamId");

-- AddForeignKey
ALTER TABLE "DraftRoom" ADD CONSTRAINT "DraftRoom_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftParticipant" ADD CONSTRAINT "DraftParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DraftRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DraftRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- First, rename columns in DraftRoom
ALTER TABLE "DraftRoom" RENAME COLUMN "createdBy" TO "creatorId";
ALTER TABLE "DraftRoom" RENAME COLUMN "pickTimeSeconds" TO "pickTimeLimit";
ALTER TABLE "DraftRoom" RENAME COLUMN "snakeFormat" TO "isSnakeDraft";

-- Then, rename columns in DraftPick
ALTER TABLE "DraftPick" RENAME COLUMN "drafterId" TO "participantId";
ALTER TABLE "DraftPick" RENAME COLUMN "timestamp" TO "pickedAt";

-- Add unique constraints
CREATE UNIQUE INDEX "DraftPick_roomId_pickNumber_key" ON "DraftPick"("roomId", "pickNumber");
CREATE UNIQUE INDEX "DraftPick_roomId_teamId_key" ON "DraftPick"("roomId", "teamId");
