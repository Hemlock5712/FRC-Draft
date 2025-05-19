-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "team" TEXT,
    "role" TEXT DEFAULT 'user',
    "preferences" JSONB DEFAULT '{}',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "stateProv" TEXT,
    "country" TEXT,
    "rookieYear" INTEGER,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeasonData" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "totalRPs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRPs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "districtRank" INTEGER,
    "regionalWins" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSeasonData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "teamSeasonId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "awardType" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "maxTeams" INTEGER NOT NULL DEFAULT 8,
    "pickTimeSeconds" INTEGER NOT NULL DEFAULT 120,
    "snakeFormat" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftRoomId" TEXT NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "draftRoomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastSyncTime" TIMESTAMP(3) NOT NULL,
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamNumber_key" ON "Team"("teamNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonData_teamId_key" ON "TeamSeasonData"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftParticipant_draftRoomId_userId_key" ON "DraftParticipant"("draftRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftParticipant_draftRoomId_pickOrder_key" ON "DraftParticipant"("draftRoomId", "pickOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftRoomId_pickNumber_key" ON "DraftPick"("draftRoomId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftRoomId_teamId_key" ON "DraftPick"("draftRoomId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_type_key" ON "SyncState"("type");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonData" ADD CONSTRAINT "TeamSeasonData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeasonData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftRoom" ADD CONSTRAINT "DraftRoom_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftParticipant" ADD CONSTRAINT "DraftParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftParticipant" ADD CONSTRAINT "DraftParticipant_draftRoomId_fkey" FOREIGN KEY ("draftRoomId") REFERENCES "DraftRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftRoomId_fkey" FOREIGN KEY ("draftRoomId") REFERENCES "DraftRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "DraftParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
