// src/server/types/express.d.ts
//
// Augments Express's Request type with the fields our middleware attaches.

declare namespace Express {
  export interface Request {
    userId?: string;
  }
}
