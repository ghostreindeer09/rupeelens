// src/server/middleware/validate.ts
//
// Generic validation middleware. Every route that accepts user input
// (body, query, or params) validates it through a Zod schema before
// any handler logic runs. Unknown/extra fields are stripped by default
// (Zod's default behaviour for object schemas without .strict()), and
// malformed input is rejected with a 400, never silently coerced into
// something dangerous.

import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    // Replace with the parsed (and coerced/defaulted) data.
    req[source] = result.data;
    next();
  };
}
