import { describe, it, expect } from "vitest"
import { defineForm, flattenDefaults, flattenFormDefinition, toFormData, isFieldDefinition } from "../src/helpers"
import type { StandardSchemaV1 } from "@standard-schema/spec"

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

	it("toFormData includes only defined values and stringifies", () => {
		const fd = toFormData({ a: "1", b: 2 as any, c: undefined as any, d: null as any })
		expect(fd.get("a")).toBe("1")
		expect(fd.get("b")).toBe("2")
		expect(fd.get("c")).toBeNull() // omitted
		expect(fd.get("d")).toBeNull() // omitted
	})

	it("isFieldDefinition correctly detects FieldDefinition shape", () => {
		expect(isFieldDefinition({ label: "X", validate: noopString() })).toBe(true)
		expect(isFieldDefinition({ label: "X" })).toBe(false)
		expect(isFieldDefinition(null)).toBe(false)
	})
})
