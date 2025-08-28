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

export type DotPaths<T, Prev extends string = ""> = {
	[K in keyof T]: T[K] extends FieldDefinition
		? `${Prev}${K & string}`
		: T[K] extends object
			? DotPaths<T[K], `${Prev}${K & string}.`>
			: never
}[keyof T]

type DotPathsToValues<T, Prev extends string = ""> = {
	[K in keyof T]: T[K] extends FieldDefinition
		? { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] }
		: T[K] extends FormDefinition
			? DotPathsToValues<T[K], `${Prev}${K & string}.`>
			: never
}[keyof T]

export type TypeFromDefinition<T extends FormDefinition> = {
	[K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K]
}
