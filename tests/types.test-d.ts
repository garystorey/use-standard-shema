// This file is a TypeScript-only (d.ts) style assertion to ensure exported types match expected shapes.
// It's not executed at runtime; it helps catch regressions in the public API surface.

import { UseStandardSchemaReturn, useStandardSchema } from "../src"
import { defineForm } from "../src/helpers"
import type { TypeFromDefinition } from "../src/types"

// Use a minimal StandardSchemaV1-shaped stub for the validator in a type-only way.
const form = defineForm({
	foo: {
		label: "Foo",
		defaultValue: "",
		validate: undefined as unknown as import("../src/types").FieldDefinition["validate"],
	},
})

type Form = typeof form

type Hook = ReturnType<typeof useStandardSchema<Form>>

// Assert Hook matches exported UseStandardSchemaReturn<Form>
type _Assert = Hook extends UseStandardSchemaReturn<Form> ? true : never

export {}
