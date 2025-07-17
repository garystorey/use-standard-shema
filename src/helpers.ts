import { useState, useCallback } from "react";
import {
  FieldDefinition,
  NestedSchema,
  FlattenedSchema,
  InferValues,
} from "./types";

/**
 * Checks if an object is a FieldDefinition.
 * @param obj The object to check.
 * @returns True if the object is a FieldDefinition, false otherwise.
 */
export function isFieldDefinition(obj: any): obj is FieldDefinition {
  return obj && typeof obj === "object" && "schema" in obj && "label" in obj;
}

/**
 * Flattens a nested schema into a single level object with dot notation keys.
 * @param schema The nested schema to flatten.
 * @param prefix The prefix for the keys (used for recursion).
 * @returns A flattened schema object.
 */
export function flattenSchema(
  schema: NestedSchema,
  prefix = ""
): FlattenedSchema {
  const result: FlattenedSchema = {};

  for (const key in schema) {
    const value = schema[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      // Assume array of nested schemas
      const firstItem = value[0];
      if (firstItem && typeof firstItem === "object") {
        const nested = flattenSchema(firstItem as NestedSchema, `${path}[0]`);
        Object.assign(result, nested);
      }
    } else if (isFieldDefinition(value)) {
      result[path] = value;
    } else {
      Object.assign(result, flattenSchema(value as NestedSchema, path));
    }
  }

  return result;
}

/**
 * Utility functions to get and set values in an object using a dot notation path.
 * @param obj The object to operate on.
 * @param path The dot notation path to the value.
 * @returns The value at the specified path.
 */
export function getValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

/**
 * Sets a value in an object at a specified dot notation path.
 * If the path does not exist, it will create the necessary nested objects.
 * @param obj The object to modify.
 * @param path The dot notation path where the value should be set.
 * @param value The value to set at the specified path.
 * @returns A new object with the updated value.
 */
export function setValue(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[lastKey] = value;
  return { ...obj };
}
