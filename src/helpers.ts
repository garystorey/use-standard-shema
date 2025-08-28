// helpers.ts
import type { FieldDefinition, FormDefinition, FormValues } from "./types";

export function defineForm<T extends FormDefinition>(schema: T): T {
    return schema;
}

// NEW: narrow to plain objects only
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        (Object.getPrototypeOf(value) === Object.prototype ||
            Object.getPrototypeOf(value) === null)
    );
}

export function isSchemaField(obj: unknown): obj is FieldDefinition {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "label" in obj &&
        // defaultValue is optional; don't require it for detection
        "validate" in obj // <-- was "schema"
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
    map: FormDefinition,
    prefix = ""
): Record<string, FieldDefinition> {
    const result: Record<string, FieldDefinition> = {};
    for (const key in map) {
        const value = (map as Record<string, unknown>)[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (isSchemaField(value)) {
            result[path] = value;
        } else if (isPlainObject(value)) {
            Object.assign(result, flattenSchema(value as FormDefinition, path));
        }
    }
    return result;
}

export function flattenDefaults(
    map: FormDefinition,
    prefix = ""
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in map) {
        const value = (map as Record<string, unknown>)[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (isSchemaField(value)) {
            result[path] = value.defaultValue ?? "";
        } else if (isPlainObject(value)) {
            Object.assign(
                result,
                flattenDefaults(value as FormDefinition, path)
            );
        }
    }
    return result;
}
