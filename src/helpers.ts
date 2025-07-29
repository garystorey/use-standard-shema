import { SchemaField, SchemaMap } from "./types"

export function defineSchema<T extends SchemaMap>(schema: T): T {
  return schema
}

export function isSchemaField(obj: unknown): obj is SchemaField {
  return typeof obj === "object" && obj !== null && "label" in obj && "defaultValue" in obj && "schema" in obj
}

export function flattenSchema(map: SchemaMap, prefix = ""): Record<string, SchemaField> {
  const result: Record<string, SchemaField> = {}

  for (const key in map) {
    const value = map[key]
    const path = prefix ? `${prefix}.${key}` : key

    if (isSchemaField(value)) {
      result[path] = value
    } else {
      Object.assign(result, flattenSchema(value, path))
    }
  }

  return result
}

export function flattenDefaults(map: SchemaMap, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {}

  for (const key in map) {
    const value = map[key]
    const path = prefix ? `${prefix}.${key}` : key

    if (isSchemaField(value)) {
      result[path] = value.defaultValue
    } else {
      Object.assign(result, flattenDefaults(value, path))
    }
  }

  return result
}
