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
type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// Core folder with stricter schema constraints:
// - Recurse only into FormDefinition
// - Leaves are FieldDefinition
type DotFold<T, Prev extends string = "", Mode extends "paths" | "values" = "paths"> = {
  [K in keyof T]:
    T[K] extends FieldDefinition
      ? (Mode extends "paths"
          ? `${Prev}${K & string}`
          : { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] })
      : T[K] extends FormDefinition
        ? DotFold<T[K], `${Prev}${K & string}.`, Mode>
        : never
}[keyof T]

// Public aliases
export type DotPaths<T, Prev extends string = ""> = DotFold<T, Prev, "paths">

type DotPathsToValues<T, Prev extends string = ""> =
  UnionToIntersection<DotFold<T, Prev, "values">>

export type TypeFromDefinition<T extends FormDefinition> = {
  [K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K]
}

export type FieldMapper<T> = (fieldDef: FieldDefinition, path: string) => T
export type RecurseFn<T> = (subSchema: FormDefinition, path: string) => Record<string, T>
export type ErrorEntry = { key: string; error: string }

/* -------------------------------------------------------------------------- */
/*                Unicode-aware key validation (no whitespace, dot)           */
/* -------------------------------------------------------------------------- */

/** ECMAScript WhiteSpace + LineTerminators + NBSP + BOM */
type WhiteSpaceChar =
  | " " | "\t" | "\n" | "\r" | "\v" | "\f"
  | "\u00A0" | "\u1680"
  | "\u2000" | "\u2001" | "\u2002" | "\u2003" | "\u2004" | "\u2005" | "\u2006" | "\u2007" | "\u2008" | "\u2009" | "\u200A"
  | "\u2028" | "\u2029" | "\u202F" | "\u205F" | "\u3000" | "\uFEFF"

/** A single segment (between dots) is valid iff:
 *  - non-empty
 *  - contains NO Unicode whitespace
 *  - contains NO dot (dot is reserved as path separator)
 */
type _IsValidSegment<S extends string> =
  S extends "" ? false
  : S extends `${string}${WhiteSpaceChar}${string}` ? false
  : S extends `${string}.${string}` ? false
  : true

/** Full key: one or more valid segments separated by dots.
 *  Rejects leading/trailing/double dots via empty-segment rule.
 */
export type FormPathKey<S extends string> =
  S extends `${infer Head}.${infer Tail}`
    ? _IsValidSegment<Head> extends true ? FormPathKey<Tail> : never
    : _IsValidSegment<S> extends true ? S : never

/** Deep key enforcement over a FormDefinition:
 *  - filters out any invalid keys at each level
 *  - recurses only into FormDefinition branches; leaves are FieldDefinition
 */
type _OnlyValidFormKeysDeep<T extends FormDefinition> = {
  [K in keyof T as K extends string
    ? (FormPathKey<K> extends never ? never : K)
    : never
  ]:
    T[K] extends FormDefinition
      ? _OnlyValidFormKeysDeep<T[K]>
      : T[K]
}

/** Compile-time assertion: original keys must survive filtering at every level. */
export type AssertValidFormKeysDeep<T extends FormDefinition> =
  keyof T extends keyof _OnlyValidFormKeysDeep<T>
    ? { [K in keyof T]:
        T[K] extends FormDefinition ? AssertValidFormKeysDeep<T[K]> : T[K]
      }
    : never
