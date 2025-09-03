import type { AnyFormPathKey, AssertValidFormKeysDeep, DotPaths, FieldDefinition, FieldMapper, FormDefinition, FormValues, RecurseFn } from "./types"

/** Define and return the form definition as is. */
export function defineForm<T extends FormDefinition>(
  formDefinition: AssertValidFormKeysDeep<T>
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
export function toFormData(data: Record<AnyFormPathKey, string>): FormData;
export function toFormData(data: FormValues): FormData;
export function toFormData(data: Record<string, string>) {
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

// ---------------- flattenFormDefinition ----------------
export function flattenFormDefinition<Def extends FormDefinition>(
  formDefinition: Def,
  parentPath?: string
): Record<DotPaths<Def>, FieldDefinition>;

export function flattenFormDefinition(
  formDefinition: FormDefinition,
  parentPath?: string
): Record<AnyFormPathKey, FieldDefinition>;

// implementation (unchanged body; note the general return type)
export function flattenFormDefinition(
  formDefinition: FormDefinition,
  parentPath = "",
): Record<string, FieldDefinition> {
  const flattened: Record<string, FieldDefinition> = {}

  for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
    const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

    applyFlattening<FieldDefinition>(
      flattened,
      propertyValue,
      fullPath,
      (fieldDef: FieldDefinition) => fieldDef,
      (subSchema: FormDefinition, path: string) => flattenFormDefinition(subSchema, path),
    )
  }

  return flattened
}

// ---------------- flattenDefaults ----------------
export function flattenDefaults<Def extends FormDefinition>(
  formDefinition: Def,
  parentPath?: string
): Record<DotPaths<Def>, string>;

export function flattenDefaults(
  formDefinition: FormDefinition,
  parentPath?: string
): Record<AnyFormPathKey, string>;

// implementation (unchanged body; note the general return type)
export function flattenDefaults(formDefinition: FormDefinition, parentPath = ""): Record<string, string> {
  const flattened: Record<string, string> = {}

  for (const [propertyKey, propertyValue] of Object.entries(formDefinition as Record<string, unknown>)) {
    const fullPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey

    applyFlattening<string>(
      flattened,
      propertyValue,
      fullPath,
      (fieldDef: FieldDefinition) => fieldDef.defaultValue ?? "",
      (subSchema: FormDefinition, path: string) => flattenDefaults(subSchema, path),
    )
  }

  return flattened
}

