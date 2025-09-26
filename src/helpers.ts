import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
	AnyFormPathKey,
	AssertValidFormKeysDeep,
	DotPaths,
	FieldDefinition,
	FieldMapper,
	FormDefinition,
	FormValues,
	RecurseFn,
} from "./types"

export const DEFAULT_VALIDATION_ERROR = "Validation failed"

type ExtractedIssues = {
	issues: ReadonlyArray<StandardSchemaV1.Issue>
	hadIssues: boolean
}

export function readIssueMessage(issues: ReadonlyArray<StandardSchemaV1.Issue> | undefined): string | undefined {
	if (!issues || issues.length === 0) {
		return undefined
	}

	for (const issue of issues) {
		const message = typeof issue.message === "string" ? issue.message.trim() : ""
		if (message.length > 0) {
			return message
		}
	}

	return undefined
}

export function extractIssues(value: unknown): ExtractedIssues | undefined {
	if (!value || typeof value !== "object" || !("issues" in value)) {
		return undefined
	}

	const rawIssues = (value as { issues?: unknown }).issues
	if (!Array.isArray(rawIssues)) {
		return undefined
	}

	const typedIssues: StandardSchemaV1.Issue[] = []
	for (const issue of rawIssues) {
		if (
			issue &&
			typeof issue === "object" &&
			"message" in issue &&
			typeof (issue as { message?: unknown }).message === "string"
		) {
			typedIssues.push(issue as StandardSchemaV1.Issue)
		}
	}

	return { issues: typedIssues, hadIssues: rawIssues.length > 0 }
}

export function normalizeThrownError(
	error: unknown,
	fallback: string = DEFAULT_VALIDATION_ERROR,
	readMessage: typeof readIssueMessage = readIssueMessage,
	issueExtractor: typeof extractIssues = extractIssues,
): string {
	if (error instanceof Error) {
		const message = typeof error.message === "string" ? error.message.trim() : ""
		return message.length > 0 ? message : fallback
	}

	if (typeof error === "string") {
		const message = error.trim()
		return message.length > 0 ? message : fallback
	}

	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message
		if (typeof message === "string") {
			const trimmed = message.trim()
			if (trimmed.length > 0) {
				return trimmed
			}
		}
	}

	const extracted = issueExtractor(error)
	if (extracted?.hadIssues) {
		const message = readMessage(extracted.issues)
		return message ?? fallback
	}

	return fallback
}

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
	parentPath?: string,
): Record<DotPaths<Def>, string>

export function flattenDefaults(formDefinition: FormDefinition, parentPath?: string): Record<AnyFormPathKey, string>

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
