import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it } from "vitest"
import {
	DEFAULT_VALIDATION_ERROR,
	defineForm,
	extractIssues,
	flattenDefaults,
	flattenFormDefinition,
	isFieldDefinition,
	normalizeThrownError,
	readIssueMessage,
	toFormData,
} from "../src/helpers"

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

	describe("readIssueMessage", () => {
		it("returns the first non-empty trimmed message", () => {
			const issues = [
				{ message: "   " },
				{ message: " second " },
				{ message: "third" },
			] as Array<{ message: string }>
			expect(readIssueMessage(issues)).toBe("second")
		})

		it("returns undefined when there are no usable messages", () => {
			const issues = [{ message: "   " }] as Array<{ message: string }>
			expect(readIssueMessage(issues)).toBeUndefined()
			expect(readIssueMessage(undefined)).toBeUndefined()
		})
	})

	describe("extractIssues", () => {
		it("filters non-issue values and reports if issues were present", () => {
			const result = extractIssues({
				issues: [
					{ message: "first" },
					{ message: 123 },
					{ message: "second" },
				],
			})

			expect(result).toEqual({
				issues: [{ message: "first" }, { message: "second" }],
				hadIssues: true,
			})
		})

		it("returns undefined when shape does not match", () => {
			expect(extractIssues(null)).toBeUndefined()
			expect(extractIssues({ issues: "nope" })).toBeUndefined()
			expect(extractIssues({})).toBeUndefined()
		})
	})

	describe("normalizeThrownError", () => {
		it("prefers Error/string messages and falls back when empty", () => {
                        expect(normalizeThrownError(new Error(" Bad things "))).toBe("Bad things")
                        expect(normalizeThrownError(" explicit ")).toBe("explicit")
			expect(normalizeThrownError(new Error("  "))).toBe(DEFAULT_VALIDATION_ERROR)
		})

		it("uses provided issues when present", () => {
			const message = normalizeThrownError({
				issues: [{ message: " from issues " }],
			})
			expect(message).toBe("from issues")
		})

		it("falls back when issues exist but contain no text", () => {
			const message = normalizeThrownError({ issues: [{ message: "   " }] })
			expect(message).toBe(DEFAULT_VALIDATION_ERROR)
		})
	})
})
