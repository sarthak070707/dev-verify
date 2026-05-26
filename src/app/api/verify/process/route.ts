import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const MOCK_CODE_SNIPPETS: Record<string, string> = {
  default: `import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validateSchema } from '@/utils/validator';

const router = Router();

router.post('/api/data', authenticate, async (req, res) => {
  const { body, headers } = req;
  const schema = validateSchema(body);

  if (!schema.valid) {
    return res.status(400).json({ error: schema.message });
  }

  const result = await processData(body, headers.authorization);
  return res.status(200).json({ data: result });
});

router.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'operational' });
});

export default router;`,
  "api-route": `import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(['create', 'read', 'update', 'delete']),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, action, payload } = parsed.data;
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  switch (action) {
    case 'create':
      const record = await db.record.create({ data: payload as any });
      return NextResponse.json({ record }, { status: 201 });
    case 'read':
      const records = await db.record.findMany({ where: { userId } });
      return NextResponse.json({ records });
    default:
      return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  }
}`,
  "react-component": `"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useCallback(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const paginated = sorted().slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          {columns.map((col) => (
            <th key={col.key} onClick={() => toggleSort(col.key)}>
              {col.label}
            </th>
          ))}
        </thead>
        <AnimatePresence>
          {paginated.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => onRowClick?.(row)}
            />
          ))}
        </AnimatePresence>
      </table>
    </div>
  );
}`,
  "database-schema": `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  avatar    String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}`,
  "websocket-handler": `import { Server as SocketServer } from 'socket.io';
import { verifyToken } from '@/lib/auth';

export function setupWebSocket(io: SocketServer) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = await verifyToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    console.log(\`User \${user.name} connected\`);

    socket.join(\`user:\${user.id}\`);

    socket.on('message', async (payload) => {
      const { recipientId, content } = payload;
      io.to(\`user:\${recipientId}\`).emit('message', {
        from: user.id,
        content,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(\`User \${user.name} disconnected\`);
    });
  });
}`,
};

function getSnippetForPath(filePath: string): string {
  if (filePath.includes("api") || filePath.includes("route")) return MOCK_CODE_SNIPPETS["api-route"];
  if (filePath.includes("component") || filePath.includes(".tsx")) return MOCK_CODE_SNIPPETS["react-component"];
  if (filePath.includes("schema") || filePath.includes(".prisma")) return MOCK_CODE_SNIPPETS["database-schema"];
  if (filePath.includes("socket") || filePath.includes("ws")) return MOCK_CODE_SNIPPETS["websocket-handler"];
  return MOCK_CODE_SNIPPETS["default"];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json(
        { error: "Missing required field: claimId" },
        { status: 400 }
      );
    }

    const claim = await db.resumeClaim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        status: true,
        filePath: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    if (claim.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Claim is already verified" },
        { status: 409 }
      );
    }

    const codeSnippet = getSnippetForPath(claim.filePath);
    const linesOfCode = codeSnippet.split("\n").length;

    const analysisResult = {
      linesOfCode: `${linesOfCode} lines`,
      complexity: linesOfCode > 40 ? "Advanced" : linesOfCode > 20 ? "Intermediate" : "Basic",
      language: claim.filePath.endsWith(".tsx")
        ? "TypeScript React"
        : claim.filePath.endsWith(".ts")
          ? "TypeScript"
          : claim.filePath.endsWith(".prisma")
            ? "Prisma Schema"
            : "JavaScript",
      codeSnippet,
      verifiedAt: new Date().toISOString(),
      metrics: {
        functions: (codeSnippet.match(/function|const.*=.*\(|=>/g) || []).length,
        imports: (codeSnippet.match(/^import\s/gm) || []).length,
        errorHandling: (codeSnippet.match(/try|catch|error|Error/g) || []).length,
      },
    };

    const updatedClaim = await db.resumeClaim.update({
      where: { id: claimId },
      data: {
        status: "VERIFIED",
        analysisResult,
      },
      select: {
        id: true,
        userId: true,
        bulletText: true,
        githubRepo: true,
        filePath: true,
        status: true,
        analysisResult: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ claim: updatedClaim });
  } catch (error) {
    console.error("Error processing verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
