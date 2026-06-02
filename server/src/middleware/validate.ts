import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  // Returns the actual Express middleware function
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse req.body against the schema
      // Zod strips out unrecognized fields by default and validates the rest
      req.body = schema.parse(req.body);

      //On success, continue to the route handler
      next();
    } catch (error) {
      // On ZodError, return 400 Bad Request with field-level details
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."), // e.path is an array, join(".") makes it a string like "user.address.street"
            message: e.message,
          })),
        });
      }

      // On any other unexpected error, return 500
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
