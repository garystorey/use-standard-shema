import type { StandardSchemaV1 } from "@standard-schema/spec"

export interface SchemaField {
	label: string
	description?: string
	defaultValue: string
	schema: StandardSchemaV1
}

export type Schema = {
	[key: string]: SchemaField | Schema
}

export type DotPaths<T, Prev extends string = ""> = {
	[K in keyof T]: T[K] extends SchemaField
		? `${Prev}${K & string}`
		: T[K] extends object
			? DotPaths<T[K], `${Prev}${K & string}.`>
			: never
}[keyof T]

type DotPathsToValues<T, Prev extends string = ""> = {
	[K in keyof T]: T[K] extends SchemaField
		? { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] }
		: T[K] extends Schema
			? DotPathsToValues<T[K], `${Prev}${K & string}.`>
			: never
}[keyof T]

export type TypeFromSchema<T extends Schema> = {
	[K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K]
}
