import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it } from "vitest"
import {
	defineForm,
	deriveValidationMessage,
	flattenDefaults,
	flattenFormDefinition,
	isFieldDefinition,
	toFormData,
} from "../src/helpers"
import type { FormValues } from "../src/types"

interface StringSchema extends StandardSchemaV1<string> {
	type: "string"
	message: string
}

function noopString(): StringSchema {
	return {
		type: "string",
		message: "",
		"~standard": {
			version: 1,
			vendor: "tests",
			validate(value) {
				return typeof value === "string" ? { value } : { issues: [{ message: "Invalid" }] }
			},
		},
	}
}

describe("helpers", () => {
	const form = defineForm({
		a: { label: "A", defaultValue: "1", validate: noopString() },
		group: {
			b: { label: "B", defaultValue: "", validate: noopString() },
			c: { label: "C", defaultValue: "3", validate: noopString() },
		},
	})

	it("flattenFormDefinition returns dot-path FieldDefinition map", () => {
		const flat = flattenFormDefinition(form)
		expect(Object.keys(flat).sort()).toEqual(["a", "group.b", "group.c"])
		expect(flat["a"].label).toBe("A")
	})

	it("flattenDefaults returns dot-path defaults (empty string if missing)", () => {
		const defs = flattenDefaults(form)
		expect(defs).toEqual({
			a: "1",
			"group.b": "",
			"group.c": "3",
		})
	})

	it("isFieldDefinition correctly detects FieldDefinition shape", () => {
		expect(isFieldDefinition({ label: "X", validate: noopString() })).toBe(true)
		expect(isFieldDefinition({ label: "X" })).toBe(false)
		expect(isFieldDefinition(null)).toBe(false)
	})

	it("toFormData stringifies defined values and excludes nullish entries", () => {
		const values = {
			username: "alice",
			age: 42,
			empty: "",
			city: null,
			optional: undefined,
		} satisfies Record<string, string | number | null | undefined>

		const formData = toFormData(values as unknown as FormValues)
		const entries: Array<[string, string]> = []

		for (const [key, value] of formData.entries()) {
			entries.push([key, value as string])
			expect(typeof value).toBe("string")
		}

		expect(entries).toEqual([
			["username", "alice"],
			["age", "42"],
			["empty", ""],
		])
	})

	it("deriveValidationMessage falls back to the top-level message when issue message is blank", () => {
		const message = deriveValidationMessage({
			issues: [{ message: "" }],
			message: "Fallback",
		})

		expect(message).toBe("Fallback")
	})
})
