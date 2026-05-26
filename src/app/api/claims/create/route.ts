import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bulletText, githubRepo, filePath } = body;

    if (!userId || !bulletText || !githubRepo || !filePath) {
      return NextResponse.json(
        { error: "Missing required fields: userId, bulletText, githubRepo, filePath" },
        { status: 400 }
      );
    }

    const userExists = await db.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const claim = await db.resumeClaim.create({
      data: {
        userId,
        bulletText,
        githubRepo,
        filePath,
        status: "PENDING",
      },
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
