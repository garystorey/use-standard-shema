import type { StandardSchemaV1 } from "@standard-schema/spec"

export type FormValues = Record<string, string>
export type Flags = Record<string, boolean>
export type Errors = Record<string, string>

export interface FieldDefinition {
	label: string
	description?: string
	defaultValue?: string
	validate: StandardSchemaV1
}

export type FormDefinition = {
	[key: string]: FieldDefinition | FormDefinition
}

// Helper to merge a union of object types into a single object type
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// Core folder with stricter schema constraints:
// - Recurse only into FormDefinition
// - Leaves are FieldDefinition
type DotFold<T, Prev extends string = "", Mode extends "paths" | "values" = "paths"> = {
	[K in keyof T]: T[K] extends FieldDefinition
		? Mode extends "paths"
			? `${Prev}${K & string}`
			: { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] }
		: T[K] extends FormDefinition
			? DotFold<T[K], `${Prev}${K & string}.`, Mode>
			: never
}[keyof T]

// Public aliases
export type DotPaths<T, Prev extends string = ""> = DotFold<T, Prev, "paths">

type DotPathsToValues<T, Prev extends string = ""> = UnionToIntersection<DotFold<T, Prev, "values">>

export type TypeFromDefinition<T extends FormDefinition> = {
	[K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K]
}

export type FieldMapper<T> = (fieldDef: FieldDefinition, path: string) => T
export type RecurseFn<T> = (subSchema: FormDefinition, path: string) => Record<string, T>
export type ErrorEntry = { key: string; error: string };
