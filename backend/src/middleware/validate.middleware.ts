import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid input", issues: result.error.issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Express 5 made req.query a read-only getter, so a validated query can no longer be
// written back onto it — it's stashed on req.validatedQuery instead.
export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: "Invalid query", issues: result.error.issues });
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}
