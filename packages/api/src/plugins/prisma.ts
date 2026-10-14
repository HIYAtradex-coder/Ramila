import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { type PrismaClient, createPrismaClient } from "@hiya/db";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export type PrismaPluginOpts = {
  prisma?: PrismaClient;
  databaseUrl?: string;
};

const prismaPlugin: FastifyPluginAsync<PrismaPluginOpts> = async (app, opts) => {
  const client = opts.prisma ?? createPrismaClient(opts.databaseUrl);
  app.decorate("prisma", client);
  app.addHook("onClose", async () => {
    await client.$disconnect();
  });
};

export default fp(prismaPlugin, { name: "hiya-prisma" });
