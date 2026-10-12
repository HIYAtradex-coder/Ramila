import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { ActorContext } from "../services/authz.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      org: string;
      email: string;
      name: string;
    };
    user: {
      sub: string;
      org: string;
      email: string;
      name: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    actor: ActorContext;
  }
}

export type AuthPluginOpts = {
  jwtSecret: string;
};

const authPlugin: FastifyPluginAsync<AuthPluginOpts> = async (app, opts) => {
  await app.register(fjwt, { secret: opts.jwtSecret });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user;
      request.actor = {
        userId: payload.sub,
        organizationId: payload.org,
        email: payload.email,
        displayName: payload.name,
      };
    } catch {
      reply.code(401).send({ error: "Unauthorized", code: "unauthorized" });
    }
  });
};

export default fp(authPlugin, { name: "hiya-auth" });
