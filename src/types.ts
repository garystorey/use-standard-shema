import type { StandardSchemaV1 } from "@standard-schema/spec"

/* =============================================================================
 * Core domain types
 * ========================================================================== */

export type FormValues = Record<string, string>
export type Flags = Record<string, boolean>
export type Errors = Record<string, string>

export interface FieldDefinition<Schema extends StandardSchemaV1 = StandardSchemaV1> {
    label: string
    description?: string
    defaultValue?: string
    validate: Schema
}

/** A form schema tree: keys map to either fields or nested groups. */
export interface FormDefinition {
    [key: string]: FieldDefinition | FormDefinition
}

/* =============================================================================
 * Utilities
 * ========================================================================== */

/** Merge a union of object types into a single object type. */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/** Normalize an object type by forcing remapping. */
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/** Extract the Standard Schema output type. */
type SchemaOutput<Schema> = Schema extends StandardSchemaV1<unknown, infer Output> ? Output : unknown

/** Extract the inferred value for a field definition. */
type FieldOutput<Def> = Def extends FieldDefinition<infer Schema> ? SchemaOutput<Schema> : unknown

/** Literal string keys only; filters out the index signature. */
type LiteralStringKeys<T> = {
    [K in Extract<keyof T, string>]: string extends K ? never : K
}[Extract<keyof T, string>]

/** Prefix helper used for dot-path construction. */
type JoinPath<Prefix extends string, Key extends string> = Prefix extends "" ? Key : `${Prefix}.${Key}`

/* =============================================================================
 * Dot-path helpers
 * ========================================================================== */

export type DotPaths<T extends FormDefinition, Prefix extends string = ""> = {
    [K in LiteralStringKeys<T>]: T[K] extends FieldDefinition
        ? JoinPath<Prefix, K>
        : T[K] extends FormDefinition
        ? DotPaths<T[K], JoinPath<Prefix, K>>
        : never
}[LiteralStringKeys<T>]

type DotPathMap<T extends FormDefinition, Prefix extends string = ""> = UnionToIntersection<
    | {
        [K in LiteralStringKeys<T>]: T[K] extends FieldDefinition
            ? { [Path in JoinPath<Prefix, K>]: FieldOutput<T[K]> }
            : T[K] extends FormDefinition
            ? DotPathMap<T[K], JoinPath<Prefix, K>>
            : {}
    }[LiteralStringKeys<T>]
    | {}
>

export type TypeFromDefinition<T extends FormDefinition> = Simplify<DotPathMap<T>>

export type FieldMapper<T> = (fieldDef: FieldDefinition, path: string) => T
export type RecurseFn<T> = (subSchema: FormDefinition, path: string) => Record<string, T>

type FieldRuntimeState = {
    name: string
    error: string
    errorId: string
    describedById: string
    touched: boolean
    dirty: boolean
}

export type FieldDefintionProps = FieldDefinition & FieldRuntimeState
export type ErrorEntry = Pick<FieldDefintionProps, "name" | "label" | "error">

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
type _HasInvalidKeys<T> = LiteralStringKeys<T> extends never
    ? false
    : {
        [K in LiteralStringKeys<T>]: FormPathKey<K> extends never
            ? true
            : T[K] extends FormDefinition
            ? _HasInvalidKeys<T[K]>
            : false
    }[LiteralStringKeys<T>]

/**
 * Public assertion:
 * - If any invalid key exists anywhere, resolve to `never`
 * - Otherwise, preserve the exact inferred shape of `T` (recursing only to check)
 */
export type AssertValidFormKeysDeep<T extends FormDefinition> = true extends _HasInvalidKeys<T>
    ? never
    : { [K in keyof T]: T[K] extends FormDefinition ? AssertValidFormKeysDeep<T[K]> : T[K] }

