import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.REPL_SLUG !== undefined,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUserFromOidc(claims: any) {
  const email = claims["email"]?.toLowerCase();
  
  // Check if user exists by email first (link accounts by email)
  const existingUser = await storage.getUserByEmail(email);
  
  if (existingUser) {
    // Update user profile info but preserve password and role
    await storage.updateUser(existingUser.id, {
      firstName: claims["first_name"] || existingUser.firstName,
      lastName: claims["last_name"] || existingUser.lastName,
      profileImageUrl: claims["profile_image_url"],
    });
    return existingUser;
  }
  
  // Create new user from OIDC claims (no password, staff role by default)
  return await storage.createUser({
    email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: "staff",
    isActive: "yes",
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const ALLOWED_DOMAIN = "artisantilect.com";
  const ALLOWED_EMAILS = ["ed@risevm.com"]; // Specific emails allowed outside the domain

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("Failed to get user claims."), undefined);
    }
    
    const email = claims["email"] as string | undefined;
    
    if (!email) {
      return verified(new Error("Email is required for login."), undefined);
    }
    
    const normalizedEmail = email.toLowerCase();
    const isAllowedDomain = normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`);
    const isAllowedEmail = ALLOWED_EMAILS.includes(normalizedEmail);
    
    if (!isAllowedDomain && !isAllowedEmail) {
      return verified(new Error(`Access denied. Only @${ALLOWED_DOMAIN} email addresses or authorized users are allowed.`), undefined);
    }
    
    const user = {};
    updateUserSession(user, tokens);
    await upsertUserFromOidc(claims);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login-failed",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Email/password login for @artisantilect.com users
  const EMAIL_PASSWORD = "@Artisan1200";
  
  app.post("/api/login/email", async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.status(401).json({ message: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
    }
    
    if (password !== EMAIL_PASSWORD) {
      return res.status(401).json({ message: "Invalid password" });
    }
    
    // Create a unique user ID based on email
    const userId = `email_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
    const firstName = normalizedEmail.split('@')[0];
    
    // Upsert user in database
    await storage.upsertUser({
      id: userId,
      email: normalizedEmail,
      firstName: firstName,
      lastName: null,
      profileImageUrl: null,
    });
    
    // Create session manually
    const user: any = {
      claims: {
        sub: userId,
        email: normalizedEmail,
        first_name: firstName,
      },
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
    };
    
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      return res.json({ success: true, user: { id: userId, email: normalizedEmail, firstName } });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
