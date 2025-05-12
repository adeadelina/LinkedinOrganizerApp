import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { storage } from "./storage";
import { compare, hash } from "bcryptjs";
import { Express, Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

// Define user session type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name?: string;
      email?: string;
      picture?: string;
    }
  }
}

// Initialize passport
export function setupAuth(app: Express): void {
  // Serialize the user ID only to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize by fetching the user from the database
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }

      return done(null, {
        id: user.id,
        username: user.username,
        name: user.name || undefined,
        email: user.email || undefined,
        picture: user.picture || undefined
      });
    } catch (err) {
      return done(err);
    }
  });

  // Local strategy for username/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          // Try to find user by username or email
          let user = await storage.getUserByUsername(username);
          if (!user && username.includes('@')) {
            user = await storage.getUserByEmail(username);
          }

          // User not found
          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }

          // Password validation (only for local accounts)
          if (!user.password) {
            return done(null, false, { message: "This account requires OAuth login" });
          }

          // Verify password
          const isValid = await compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Incorrect password" });
          }

          return done(null, {
            id: user.id,
            username: user.username,
            name: user.name || undefined,
            email: user.email || undefined,
            picture: user.picture || undefined
          });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Google OAuth2 strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // For Replit, we need to detect the current URL to support both development and production
    const protocol = process.env.REPL_SLUG ? "https" : "http";
    const host = process.env.REPL_SLUG ? 
                 `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
                 "0.0.0.0:5000";
    const callbackURL = `${protocol}://${host}/api/auth/google/callback`;

    console.log(`Configuring Google OAuth with callback URL: ${callbackURL}`);

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Try to find the user by Google ID
            let user = await storage.getUserByGoogleId(profile.id);

            // If user doesn't exist, create a new user
            if (!user) {
              // Create a username from email or profile ID
              const email = profile.emails?.[0]?.value;
              const baseUsername = email ? email.split('@')[0] : `user_${profile.id.substring(0, 10)}`;

              // Make sure username is unique by appending a number if needed
              let username = baseUsername;
              let counter = 1;
              let existingUser = await storage.getUserByUsername(username);

              while (existingUser) {
                username = `${baseUsername}_${counter}`;
                counter++;
                existingUser = await storage.getUserByUsername(username);
              }

              // Create the new user
              user = await storage.createUser({
                username,
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                picture: profile.photos?.[0]?.value,
              });
            } else {
              // Update the existing user with latest Google profile info
              await storage.updateUser(user.id, {
                name: profile.displayName,
                email: profile.emails?.[0]?.value,
                picture: profile.photos?.[0]?.value,
              });

              // Get the updated user
              user = await storage.getUser(user.id) as User;
            }

            return done(null, {
              id: user.id,
              username: user.username,
              name: user.name || undefined,
              email: user.email || undefined,
              picture: user.picture || undefined
            });
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to enable it.");
  }

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());
}

// User authentication check middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Register authentication routes
export function registerAuthRoutes(app: Express): void {
  // Local registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, name, email } = req.body;

      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      // Hash the password
      const hashedPassword = await hash(password, 10);

      // Create the user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email,
      });

      if (!user || !user.id) {
        return res.status(500).json({ error: "Failed to create user account" });
      }

      // Log the user in
      return new Promise<void>((resolve, reject) => {
        req.login(
          {
            id: user.id,
            username: user.username,
            name: user.name || undefined,
            email: user.email || undefined,
            picture: user.picture || undefined
          },
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            res.status(201).json({
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              picture: user.picture
            });
            resolve();
          }
        );
      });

    } catch (error) {
      console.error("Registration error:", error);
      // Send a more specific error message if available
      const errorMessage = error instanceof Error ? error.message : "Failed to register user";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Local login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Authentication failed" });
      }
      req.login(user, (err: Error | null) => {
        if (err) {
          return next(err);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  // Google authentication routes - only register if Google OAuth is configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google"));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", {
        failureRedirect: "/login",
      }),
      (req, res) => {
        // Successful authentication, redirect to home page
        res.redirect("/");
      }
    );
  } else {
    // Provide informative error if Google OAuth is not configured
    app.get("/api/auth/google", (req, res) => {
      res.status(501).json({ 
        error: "Google OAuth is not configured", 
        message: "Google authentication is not available. Please use username and password to login."
      });
    });
  }

  // Get currently authenticated user
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ error: "Not authenticated" });
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ success: true });
    });
  });
}