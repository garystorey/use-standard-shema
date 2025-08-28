import type { FieldDefinition, FormDefinition, FormValues } from "./types";

export function defineForm<T extends FormDefinition>(schema: T): T {
    return schema;
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

export function isSchemaField(obj: unknown): obj is FieldDefinition {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "label" in obj &&
        "defaultValue" in obj &&
        "validate" in obj // <-- was "schema"
    );
}

export function flattenSchema(
    map: FormDefinition,
    prefix = ""
): Record<string, FieldDefinition> {
    const result: Record<string, FieldDefinition> = {};
    for (const key in map) {
        const value = (map as FormDefinition)[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (isSchemaField(value)) {
            result[path] = value;
        } else if (value && typeof value === "object") {
            // only recurse into plain objects that are not fields
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
        const value = (map as FormDefinition)[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (isSchemaField(value)) {
            result[path] = value.defaultValue ?? "";
        } else if (value && typeof value === "object") {
            Object.assign(
                result,
                flattenDefaults(value as FormDefinition, path)
            );
        }
    }
    return result;
}
