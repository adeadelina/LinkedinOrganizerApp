import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth, registerAuthRoutes } from "./auth";
import { runMigrations } from "./migrations";
import PgSession from "connect-pg-simple";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: '.env.local' });

// Check for required environment variables and warn if missing
const requiredEnvVars = ['OPENAI_API_KEY', 'ZENROWS_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`Missing environment variables: ${missingEnvVars.join(', ')}. Some features will be limited.`);
}

// Use memory store fallback if DB is not available
import connectMemoryStore from "memorystore";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const ONE_DAY = 1000 * 60 * 60 * 24;
const SESSION_SECRET = process.env.SESSION_SECRET || 'linkedin-post-analysis-secret';

let sessionStore;
if (process.env.DATABASE_URL) {
  // Use PostgreSQL session store
  const PostgresqlStore = PgSession(session);
  sessionStore = new PostgresqlStore({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
  });
  log("Using PostgreSQL session store");
} else {
  // Fallback to memory store for development
  const MemoryStore = connectMemoryStore(session);
  sessionStore = new MemoryStore({
    checkPeriod: ONE_DAY, // Prune expired entries
  });
  log("Using memory session store (fallback)");
}

// Configure session middleware
app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_DAY * 7, // 1 week
  }
}));

// Initialize authentication
setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run database migrations before starting the server
  try {
    log("Running database migrations...");
    await runMigrations();
    log("Database migrations completed");
  } catch (error) {
    log(`Error running migrations: ${error}`);
    // Continue even if migrations fail
  }

  // Register authentication routes
  registerAuthRoutes(app);
  
  // Register API routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();