import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { LoginRequest, ROLE_CAPABILITIES, type StaffRole } from "@hiya/contracts";
import { appendAudit } from "../services/audit.js";
import { capabilitiesForRole } from "../lib/capabilities.js";

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", async (request, reply) => {
    const parsed = LoginRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid login payload",
        code: "validation_error",
        details: parsed.error.flatten(),
      });
    }

    const { email, password, organizationId } = parsed.data;
    const matches = await app.prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
        active: true,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        memberships: {
          where: { active: true, store: { active: true } },
          include: { store: true },
        },
      },
      take: 2,
    });

    if (matches.length > 1) {
      return reply.code(400).send({
        error: "organizationId is required when email matches multiple organizations",
        code: "organization_required",
      });
    }

    const user = matches[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials", code: "invalid_credentials" });
    }

    const accessToken = await reply.jwtSign(
      {
        sub: user.id,
        org: user.organizationId,
        email: user.email,
        name: user.displayName,
      },
      { expiresIn: "8h" },
    );

    await appendAudit(app.prisma, {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      payloadJson: { membershipCount: user.memberships.length },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
      },
      memberships: user.memberships.map((m) => ({
        storeId: m.storeId,
        storeName: m.store.name,
        storeCode: m.store.code,
        role: m.role as StaffRole,
        capabilities: capabilitiesForRole(m.role),
      })),
    };
  });

  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request) => {
      const memberships = await app.prisma.storeMembership.findMany({
        where: {
          userId: request.actor.userId,
          active: true,
          store: { active: true, organizationId: request.actor.organizationId },
        },
        include: { store: true },
      });

      return {
        user: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
          organizationId: request.actor.organizationId,
        },
        memberships: memberships.map((m) => ({
          storeId: m.storeId,
          storeName: m.store.name,
          storeCode: m.store.code,
          role: m.role,
          capabilities:
            m.role in ROLE_CAPABILITIES
              ? [...ROLE_CAPABILITIES[m.role as StaffRole]]
              : [],
        })),
      };
    },
  );
};

export default authRoutes;
