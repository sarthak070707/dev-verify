import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Clean up existing data
    await db.resumeClaim.deleteMany();
    await db.user.deleteMany();

    // Create the demo user
    const user = await db.user.create({
      data: {
        name: "Sarthak Arya",
        email: "sarthak@devverify.io",
        githubToken: "ghp_demo_token_x9k2m",
      },
    });

    // Create sample resume claims
    const claims = await Promise.all([
      db.resumeClaim.create({
        data: {
          userId: user.id,
          bulletText: "Architected and deployed a real-time collaborative editor using WebSocket connections and CRDT conflict resolution, supporting 500+ concurrent users",
          githubRepo: "sarthakarya/collab-editor",
          filePath: "src/server/websocket-handler.ts",
          status: "PENDING",
        },
      }),
      db.resumeClaim.create({
        data: {
          userId: user.id,
          bulletText: "Built a type-safe REST API layer with Zod validation, Prisma ORM, and automated OpenAPI documentation generation",
          githubRepo: "sarthakarya/api-framework",
          filePath: "src/app/api/route.ts",
          status: "PENDING",
        },
      }),
      db.resumeClaim.create({
        data: {
          userId: user.id,
          bulletText: "Designed and implemented a polymorphic data table component with virtualized rendering, server-side pagination, and animated row transitions",
          githubRepo: "sarthakarya/ui-toolkit",
          filePath: "src/components/DataTable.tsx",
          status: "PENDING",
        },
      }),
      db.resumeClaim.create({
        data: {
          userId: user.id,
          bulletText: "Modeled a normalized relational database schema with cascading deletes, composite indexes, and referential integrity constraints",
          githubRepo: "sarthakarya/db-blueprint",
          filePath: "prisma/schema.prisma",
          status: "PENDING",
        },
      }),
      db.resumeClaim.create({
        data: {
          userId: user.id,
          bulletText: "Engineered a high-throughput Express.js routing middleware with JWT authentication, rate limiting, and request payload validation",
          githubRepo: "sarthakarya/express-gateway",
          filePath: "src/routes/api-router.ts",
          status: "PENDING",
        },
      }),
    ]);

    return NextResponse.json({
      message: "Seed data created successfully",
      user,
      claims,
    });
  } catch (error) {
    console.error("Error seeding data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
