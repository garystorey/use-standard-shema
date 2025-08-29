import type { FieldDefinition, FieldMapper, FormDefinition, FormValues, RecurseFn } from "./types"

/** Add JSDoc comments  */
/** Define and return the form definition as is. */
export function defineForm<T extends FormDefinition>(formDefinition: T): T {
	return formDefinition
}

/** Check if a value is a plain object (not an array, function, etc.) */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
	)
}

/** Check if a value is a FieldDefinition */
export function isFieldDefinition(obj: unknown): obj is FieldDefinition {
	return typeof obj === "object" && obj !== null && "label" in obj && "validate" in obj
}

/** Convert a flat object of key-value pairs to FormData */
export function toFormData(data: FormValues) {
	const formData = new FormData()
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value))
		}
	})
	return formData
}

/** Helper function to apply flattening logic recursively */
/** This function modifies the resultMap in place. */
/** It uses the fieldMapper to map FieldDefinitions and recurseFn to handle nested objects. */
/** It checks if the currentValue is a FieldDefinition or a plain object and applies the appropriate logic. */
function applyFlattening<T>(
	resultMap: Record<string, T>,
	currentValue: unknown,
	currentPath: string,
	fieldMapper: FieldMapper<T>,
	recurseFn: RecurseFn<T>,
): void {
	if (isFieldDefinition(currentValue)) {
		resultMap[currentPath] = fieldMapper(currentValue, currentPath)
		return
	}

	if (isPlainObject(currentValue)) {
		Object.assign(resultMap, recurseFn(currentValue as FormDefinition, currentPath))
	}
}

/** Flatten a nested FormDefinition into a flat map of dot-notated paths to FieldDefinitions */
export function flattenFormDefinition(formDefinition: FormDefinition, parentPath = ""): Record<string, FieldDefinition> {
	const flattened: Record<string, FieldDefinition> = {}

	for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
		const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

		applyFlattening<FieldDefinition>(
			flattened,
			propertyValue,
			fullPath,
			(fieldDef) => fieldDef,
			(subSchema, path) => flattenFormDefinition(subSchema, path),
		)
	}

	return flattened
}

/** Flatten a nested FormDefinition into a flat map of dot-notated paths to their default values */
export function flattenDefaults(formDefinition: FormDefinition, parentPath = ""): Record<string, string> {
	const flattened: Record<string, string> = {}

	for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
		const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

		applyFlattening<string>(
			flattened,
			propertyValue,
			fullPath,
			(fieldDef) => fieldDef.defaultValue ?? "",
			(subSchema, path) => flattenDefaults(subSchema, path),
		)
	}

	return flattened
}
