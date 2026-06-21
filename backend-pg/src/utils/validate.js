/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/', validate(createPostSchema, 'body'), createPost);
 *
 * Emits 422 via the standard AppError envelope when validation fails.
 */
import { z } from 'zod';

export const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req[source]);
    if (parsed.success) {
      // Replace the source with the parsed (possibly transformed) data.
      req[source] = parsed.data;
      return next();
    }
    // Flatten Zod issues into a single ZodError so the global handler picks
    // it up and produces a clean 422 envelope.
    const err = new z.ZodError(parsed.error.issues);
    err.statusCode = 422;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  } catch (err) {
    return next(err);
  }
};

// ─── Shared schemas ──────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const uuidSchema = z.string().uuid();

export default validate;
