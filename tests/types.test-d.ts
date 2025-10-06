// This file is a TypeScript-only (d.ts) style assertion to ensure exported types match expected shapes.
// It's not executed at runtime; it helps catch regressions in the public API surface.

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { useStandardSchema } from "../src"
import type { AssertValidFormKeysDeep, FormDefinition, UseStandardSchemaReturn } from "../src/types"

type Validator = StandardSchemaV1<string>

type TestFormDefinition = AssertValidFormKeysDeep<{
	foo: {
		label: "Foo"
		defaultValue: ""
		validate: Validator
	}
}>

type Hook = typeof useStandardSchema extends <T extends FormDefinition>(formDefinition: TestFormDefinition) => infer R
	? R
	: never

// Assert Hook matches exported UseStandardSchemaReturn<TestFormDefinition>
type _Assert = Hook extends UseStandardSchemaReturn<TestFormDefinition> ? true : never

export {}
