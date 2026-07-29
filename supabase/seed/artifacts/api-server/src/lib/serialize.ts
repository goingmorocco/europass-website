/**
 * Converts Drizzle Date objects to ISO strings for Zod validation.
 * Zod schemas generated from OpenAPI expect string dates, but Drizzle returns Date objects.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
