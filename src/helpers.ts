import type { FormValues, Schema, SchemaField } from "./types";

export function defineSchema<T extends Schema>(schema: T): T {
  return schema;
}

export function isSchemaField(obj: unknown): obj is SchemaField {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "label" in obj &&
    "defaultValue" in obj &&
    "schema" in obj
  );
}

export function toFormData(data: FormValues) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  return formData;
}

export function flattenSchema(
  map: Schema,
  prefix = ""
): Record<string, SchemaField> {
  const result: Record<string, SchemaField> = {};

  for (const key in map) {
    const value = map[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (isSchemaField(value)) {
      result[path] = value;
    } else {
      Object.assign(result, flattenSchema(value, path));
    }
  }

  return result;
}

export function flattenDefaults(
  map: Schema,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key in map) {
    const value = map[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (isSchemaField(value)) {
      result[path] = value.defaultValue ?? "";
    } else {
      Object.assign(result, flattenDefaults(value, path));
    }
  }

  return result;
}
