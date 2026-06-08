import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 25));
    const action = params.get("action")?.trim();
    const username = params.get("username")?.trim();

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (username) {
      where.username = { contains: username, mode: "insensitive" };
    }

    const [total, events] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          username: true,
          action: true,
          entityType: true,
          details: true,
        },
      }),
    ]);

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        createdAt: event.createdAt.toISOString(),
        username: event.username,
        action: event.action,
        entityType: event.entityType,
        details: event.details,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load security events");
  }
}
