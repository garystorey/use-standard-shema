import type { StandardSchemaV1 } from "@standard-schema/spec"

/* =============================================================================
 * Core domain types
 * ========================================================================== */

export type FormValues = Record<string, string>
export type Flags = Record<string, boolean>
export type Errors = Record<string, string>

export interface FieldDefinition {
	label: string
	description?: string
	defaultValue?: string
	validate: StandardSchemaV1
}

/** A form schema tree: keys map to either fields or nested groups. */
export type FormDefinition = {
	[key: string]: FieldDefinition | FormDefinition
}

/* =============================================================================
 * Utilities
 * ========================================================================== */

/** Merge a union of object types into a single object type. */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/* =============================================================================
 * Dot-path flattener (depth-limited to avoid “excessively deep” errors)
 * ========================================================================== */

type Depth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
type DecMap = { 0: 0; 1: 0; 2: 1; 3: 2; 4: 3; 5: 4; 6: 5; 7: 6; 8: 7; 9: 8; 10: 9 }
type Dec<D extends Depth> = DecMap[D]

/**
 * Folds a FormDefinition into:
 *  - Mode="paths": a union of dot paths
 *  - Mode="values": a map { path: defaultValue } (for union-to-intersection)
 *
 * Depth-limited so TS doesn’t infinitely expand on generics.
 */
type DotFold<T, Prev extends string = "", Mode extends "paths" | "values" = "paths", D extends Depth = 10> = [
	D,
] extends [0]
	? never
	: {
			[K in keyof T]: T[K] extends FieldDefinition
				? Mode extends "paths"
					? `${Prev}${K & string}`
					: { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] }
				: T[K] extends FormDefinition
					? DotFold<T[K], `${Prev}${K & string}.`, Mode, Dec<D>>
					: never
		}[keyof T]

/** Public aliases */
export type DotPaths<T, Prev extends string = "", D extends Depth = 10> = DotFold<T, Prev, "paths", D>

type DotPathsToValues<T, Prev extends string = "", D extends Depth = 10> = UnionToIntersection<
	DotFold<T, Prev, "values", D>
>

export type TypeFromDefinition<T extends FormDefinition> = {
	[K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K]
}

export type FieldMapper<T> = (fieldDef: FieldDefinition, path: string) => T
export type RecurseFn<T> = (subSchema: FormDefinition, path: string) => Record<string, T>
export type ErrorEntry = { name: string; error: string; label: string }

/* =============================================================================
 * Unicode-aware key validation (no whitespace; "." reserved as path separator)
 * ========================================================================== */

/** ECMAScript WhiteSpace + LineTerminators + NBSP + BOM */
type WhiteSpaceChar =
	| " "
	| "\t"
	| "\n"
	| "\r"
	| "\v"
	| "\f"
	| "\u00A0"
	| "\u1680"
	| "\u2000"
	| "\u2001"
	| "\u2002"
	| "\u2003"
	| "\u2004"
	| "\u2005"
	| "\u2006"
	| "\u2007"
	| "\u2008"
	| "\u2009"
	| "\u200A"
	| "\u2028"
	| "\u2029"
	| "\u202F"
	| "\u205F"
	| "\u3000"
	| "\uFEFF"

/**
 * A single segment (between dots) is valid iff:
 *  - non-empty
 *  - contains NO Unicode whitespace chars
 *  - contains NO '.' (reserved for path separation)
 *  All other Unicode code points (incl. hyphens, emoji, etc.) are allowed.
 */
type _IsValidSegment<S extends string> = S extends ""
	? false
	: S extends `${string}${WhiteSpaceChar}${string}`
		? false
		: S extends `${string}.${string}`
			? false
			: true

/** Full key: one or more valid segments separated by dots. */
export type FormPathKey<S extends string> = S extends `${infer Head}.${infer Tail}`
	? _IsValidSegment<Head> extends true
		? FormPathKey<Tail>
		: never
	: _IsValidSegment<S> extends true
		? S
		: never

/** Shape-only path type for APIs not tied to a specific schema. */
export type AnyFormPathKey = FormPathKey<string>

/**
 * Boolean-style deep check that preserves literal keys/inference:
 * - Skips the `string` index signature (`string extends K`)
 * - Checks only literal string keys
 * - Recurse into nested FormDefinition branches
 */
type _HasInvalidKeys<T> = {
	[K in keyof T]: K extends string
		? string extends K
			? false // skip index signature
			: FormPathKey<K> extends never
				? true
				: T[K] extends FormDefinition
					? _HasInvalidKeys<T[K]>
					: false
		: false
}[keyof T]

/**
 * Public assertion:
 * - If any invalid key exists anywhere, resolve to `never`
 * - Otherwise, preserve the exact inferred shape of `T` (recursing only to check)
 */
export type AssertValidFormKeysDeep<T extends FormDefinition> = true extends _HasInvalidKeys<T>
	? never
	: { [K in keyof T]: T[K] extends FormDefinition ? AssertValidFormKeysDeep<T[K]> : T[K] }

export interface FieldDefintionProps extends FieldDefinition {
	name: string
	error: string
	errorId: string
	describedById: string
}
