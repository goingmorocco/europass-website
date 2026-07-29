---
name: Drizzle date serialization
description: Drizzle ORM returns Date objects for timestamp columns; OpenAPI-codegen'd Zod schemas expect ISO strings — requires a serialize step.
---

## Rule
Always wrap Drizzle query results in `serialize()` before passing to a Zod schema generated from OpenAPI.

## Why
Drizzle maps `timestamp` columns to JavaScript `Date` objects. OpenAPI codegen produces Zod schemas with `z.string()` for date fields (`format: date-time`). Passing a `Date` to `z.string()` throws a ZodError: "Expected string, received date."

## How to apply
A thin utility in `artifacts/api-server/src/lib/serialize.ts` does `JSON.parse(JSON.stringify(data))` — this converts all Date objects to ISO strings.
Use it in every route: `res.json(SomeZodSchema.parse(serialize(dbResult)))`.
This pattern applies to any route that reads from the database and validates with an OpenAPI-generated Zod schema.
