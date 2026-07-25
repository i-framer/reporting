import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { z } from "zod";
import { executeMySQLWithParams } from "./mysql";
import { storage } from "./storage";
import crypto from "crypto";

const loginSchema = z.object({
  framerId: z.string().nullable(),
  isAdmin: z.boolean(),
});

declare module "express-session" {
  interface SessionData {
    framerId: string | null;
    framerName: string | null;
    isAdmin: boolean;
  }
}

// In-memory token store as fallback when cookies don't work
const tokenStore = new Map<string, { framerId: string | null; framerName: string; isAdmin: boolean; expires: number }>();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function cleanExpiredTokens() {
  const now = Date.now();
  tokenStore.forEach((data, token) => {
    if (data.expires < now) {
      tokenStore.delete(token);
    }
  });
}

const PgSession = connectPgSimple(session);

export async function setupCustomAuth(app: Express) {
  app.set("trust proxy", 1);
  
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
        createTableIfMissing: false, // Table already exists from previous auth setup
      }),
      secret: process.env.SESSION_SECRET || "datadeck-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        sameSite: "none" as const,
        partitioned: true, // CHIPS support for cross-site cookies
      },
    })
  );
}

export function registerCustomAuthRoutes(app: Express) {
  // Clean expired tokens periodically
  setInterval(cleanExpiredTokens, 60000);

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }
      
      const { framerId, isAdmin } = parsed.data;
      
      // Generate a token for fallback auth
      const token = generateToken();
      const expires = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week

      if (isAdmin) {
        req.session.framerId = null;
        req.session.framerName = "Administration";
        req.session.isAdmin = true;
        
        // Store in token store as fallback
        tokenStore.set(token, {
          framerId: null,
          framerName: "Administration",
          isAdmin: true,
          expires
        });
        
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          }
          return res.json({
            framerId: null,
            framerName: "Administration",
            isAdmin: true,
            token, // Return token for localStorage fallback
          });
        });
        return;
      }

      if (!framerId) {
        return res.status(400).json({ message: "Framer ID is required" });
      }

      const dataSources = await storage.getDataSources();
      const dataSource = dataSources[0];
      
      if (!dataSource) {
        return res.status(500).json({ message: "No data source configured" });
      }

      // Try matching by ID first, then by Name (case-insensitive)
      const result = await executeMySQLWithParams(
        dataSource.config,
        `SELECT ID, Name FROM framer WHERE (ID = ? OR LOWER(Name) = LOWER(?)) AND Deleted = 0 LIMIT 1`,
        [framerId, framerId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid Framer ID" });
      }

      const framer = result.rows[0] as { ID: string; Name: string };
      
      req.session.framerId = framer.ID;
      req.session.framerName = framer.Name || "Unknown Framer";
      req.session.isAdmin = false;

      // Store in token store as fallback
      tokenStore.set(token, {
        framerId: framer.ID,
        framerName: framer.Name || "Unknown Framer",
        isAdmin: false,
        expires
      });

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }
        res.json({
          framerId: framer.ID,
          framerName: framer.Name,
          isAdmin: false,
          token, // Return token for localStorage fallback
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    // First try session-based auth
    if (req.session.framerId || req.session.isAdmin) {
      return res.json({
        framerId: req.session.framerId,
        framerName: req.session.framerName,
        isAdmin: req.session.isAdmin,
      });
    }

    // Fallback to token-based auth
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const userData = tokenStore.get(token);
      
      if (userData && userData.expires > Date.now()) {
        return res.json({
          framerId: userData.framerId,
          framerName: userData.framerName,
          isAdmin: userData.isAdmin,
        });
      }
    }

    return res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Remove token if provided
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      tokenStore.delete(token);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}

// Helper to get user data from token
function getUserFromToken(req: Request): { framerId: string | null; framerName: string; isAdmin: boolean } | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const userData = tokenStore.get(token);
    if (userData && userData.expires > Date.now()) {
      return {
        framerId: userData.framerId,
        framerName: userData.framerName,
        isAdmin: userData.isAdmin
      };
    }
  }
  return null;
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check session first
  if (req.session.framerId || req.session.isAdmin) {
    return next();
  }
  
  // Fallback to token-based auth
  const tokenUser = getUserFromToken(req);
  if (tokenUser && (tokenUser.framerId || tokenUser.isAdmin)) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
}

export function getFramerContext(req: Request): { framerId: string | null; isAdmin: boolean } {
  // Check session first
  if (req.session.framerId || req.session.isAdmin) {
    return {
      framerId: req.session.framerId || null,
      isAdmin: req.session.isAdmin || false,
    };
  }
  
  // Fallback to token-based auth
  const tokenUser = getUserFromToken(req);
  if (tokenUser) {
    return {
      framerId: tokenUser.framerId,
      isAdmin: tokenUser.isAdmin,
    };
  }
  
  return {
    framerId: null,
    isAdmin: false,
  };
}
