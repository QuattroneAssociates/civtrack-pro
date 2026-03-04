import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { Resend } from "resend";
import { db } from "./db";
import { users, authCodes } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgStore({ pool, tableName: "session" }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/request-code", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.loginEmail, normalizedEmail));

    if (!user || !user.isActive || !user.authRole) {
      return res.status(403).json({ message: "This email is not authorized to access CivTrack Pro." });
    }

    await db
      .update(authCodes)
      .set({ used: true })
      .where(and(eq(authCodes.userId, user.id), eq(authCodes.used, false)));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(authCodes).values({
      userId: user.id,
      code,
      expiresAt,
      used: false,
    });

    try {
      await resend.emails.send({
        from: "CivTrack Pro <onboarding@resend.dev>",
        to: normalizedEmail,
        subject: "CivTrack Pro Login Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="text-align: center; color: #1a1a2e; font-size: 22px; margin-bottom: 4px;">Quattrone &amp; Associates, Inc.</h1>
            <h2 style="text-align: center; color: #1a1a2e; font-size: 18px; font-weight: 600; margin-top: 0;">Your Access Pin</h2>
            <p style="text-align: center; color: #555; font-size: 14px;">Please use the following code to sign in to CivTrack Pro.</p>
            <div style="background: #f5f0e0; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 6px; color: #1a1a2e;">${code}</span>
            </div>
            <p style="text-align: center; color: #999; font-size: 12px;">This code expires in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="text-align: center; color: #999; font-size: 11px;">&copy; ${new Date().getFullYear()} Quattrone &amp; Associates, Inc. All rights reserved.</p>
          </div>
        `,
      });
    } catch (err: any) {
      console.error("Resend email error:", err);
      return res.status(500).json({ message: "Failed to send login code. Please try again." });
    }

    res.json({ message: "Code sent to your email" });
  });

  app.post("/api/auth/verify-code", async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.loginEmail, normalizedEmail));

    if (!user || !user.isActive || !user.authRole) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const [validCode] = await db
      .select()
      .from(authCodes)
      .where(
        and(
          eq(authCodes.userId, user.id),
          eq(authCodes.code, code),
          eq(authCodes.used, false)
        )
      );

    if (!validCode) {
      return res.status(401).json({ message: "Invalid code" });
    }

    if (new Date() > validCode.expiresAt) {
      await db.update(authCodes).set({ used: true }).where(eq(authCodes.id, validCode.id));
      return res.status(401).json({ message: "Code has expired. Please request a new one." });
    }

    await db.update(authCodes).set({ used: true }).where(eq(authCodes.id, validCode.id));

    req.session.userId = user.id;

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      loginEmail: user.loginEmail,
      authRole: user.authRole,
      role: user.role,
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user || !user.isActive || !user.authRole) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      loginEmail: user.loginEmail,
      authRole: user.authRole,
      role: user.role,
    });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  if (req.session.userId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user || !user.authRole || !roles.includes(user.authRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    (req as any).user = user;
    next();
  };
}
