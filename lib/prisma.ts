import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    // Enable Accelerate and Edge compatibility
    // @see https://www.prisma.io/docs/accelerate
    // @see https://www.prisma.io/docs/guides/deployment/edge-deployment
    log: ['error', 'warn'],
  });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export default prisma; 