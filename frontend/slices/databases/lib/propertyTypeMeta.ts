/** @deprecated — moved to `@/shared/lib/databases/propertyTypeMeta` so
 *  the shared store can consume it without inverting the shared → slice
 *  boundary. This file is a thin re-export for back-compat with internal
 *  databases imports; new code should import from `@/slices/databases`
 *  (the barrel) or `@/shared/lib/databases/propertyTypeMeta` directly. */
export * from "@/shared/lib/databases/propertyTypeMeta";
