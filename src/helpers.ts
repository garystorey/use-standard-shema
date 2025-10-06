import type {
	AnyFormPathKey,
	AssertValidFormKeysDeep,
	DotPaths,
	FieldDefinition,
	FormDefinition,
	FormValues,
} from "./types"

/** Define and return the form definition as is. */
export function defineForm<T extends FormDefinition>(
	formDefinition: AssertValidFormKeysDeep<T>,
): AssertValidFormKeysDeep<T> {
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
export function toFormData(data: Record<AnyFormPathKey, string>): FormData
export function toFormData(data: FormValues): FormData
export function toFormData(data: Record<string, string>) {
	const formData = new FormData()
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value))
		}
	})
	return formData
}

// ---------------- flattenFormDefinition ----------------
export function flattenFormDefinition<Def extends FormDefinition>(
	formDefinition: Def,
	parentPath?: string,
): Record<DotPaths<Def>, FieldDefinition>

export function flattenFormDefinition(
	formDefinition: FormDefinition,
	parentPath?: string,
): Record<AnyFormPathKey, FieldDefinition>

// implementation (unchanged body; note the general return type)
export function flattenFormDefinition(
	formDefinition: FormDefinition,
	parentPath = "",
): Record<string, FieldDefinition> {
	const flattened: Record<string, FieldDefinition> = {}

	for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
		const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

		if (isFieldDefinition(propertyValue)) {
			flattened[fullPath] = propertyValue
			continue
		}

		if (isPlainObject(propertyValue)) {
			Object.assign(flattened, flattenFormDefinition(propertyValue as FormDefinition, fullPath))
		}
	}

	return flattened
}

// ---------------- flattenDefaults ----------------
export function flattenDefaults<Def extends FormDefinition>(
	formDefinition: Def,
	parentPath?: string,
): Record<DotPaths<Def>, string>

export function flattenDefaults(formDefinition: FormDefinition, parentPath?: string): Record<AnyFormPathKey, string>

// implementation (unchanged body; note the general return type)
export function flattenDefaults(formDefinition: FormDefinition, parentPath = ""): Record<string, string> {
	const flattened: Record<string, string> = {}

	for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
		const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

		if (isFieldDefinition(propertyValue)) {
			flattened[fullPath] = propertyValue.defaultValue ?? ""
			continue
		}

		if (isPlainObject(propertyValue)) {
			Object.assign(flattened, flattenDefaults(propertyValue as FormDefinition, fullPath))
		}
	}

	return flattened
}
