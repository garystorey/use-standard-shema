import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import type { StandardSchemaV1 } from "@standard-schema/spec"
import { defineForm, type TypeFromDefinition } from "../src"
import { Harness, type HarnessApi } from "./test-harness"
import { email, string } from "./test-validation-lib"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function asyncEmail(delays: Record<string, number>, message: string = "Invalid email"): StandardSchemaV1<string> {
	return {
		type: "string",
		message,
		"~standard": {
			version: 1,
			vendor: "tests",
			async validate(raw: unknown) {
				if (typeof raw !== "string") {
					return { issues: [{ message }] }
				}

				const value = raw
				const delay = delays[value] ?? 0
				await new Promise((resolve) => setTimeout(resolve, delay))

				if (!/@/.test(value)) {
					return { issues: [{ message }] }
				}

				return { value }
			},
		},
	}
}

function throwingEmail(message: string = "Exploded"): StandardSchemaV1<string> {
	return {
		type: "string",
		message,
		"~standard": {
			version: 1,
			vendor: "tests",
			async validate(raw: unknown) {
				if (typeof raw !== "string" || raw === "boom") {
					throw new Error(message)
				}

				if (!/@/.test(raw)) {
					return { issues: [{ message }] }
				}

				return { value: raw }
			},
		},
	}
}

function throwingIssuesWithoutMessage(): StandardSchemaV1<string> {
	return {
		type: "string",
		message: "Schema fallback message",
		"~standard": {
			version: 1,
			vendor: "tests",
			async validate() {
				throw { issues: [{}] }
			},
		},
	}
}

describe("useStandardSchema", () => {
	it("TypeFromDefinition infers validator output types without defaults", () => {
		const typedForm = defineForm({
			field: {
				label: "Field",
				validate: string(),
			},
		})

		type Values = TypeFromDefinition<typeof typedForm>

		expectTypeOf<Values>().toEqualTypeOf<{ field: string }>()
	})

	const schema = defineForm({
		user: {
			name: {
				label: "Name",
				description: "Your full name",
				defaultValue: "",
				validate: string("Required"),
			},
			contact: {
				email: {
					label: "Email",
					defaultValue: "default@example.com",
					validate: email("Invalid email"),
				},
			},
		},
	})

	it("initializes defaults, touched/dirty flags, and getField metadata", () => {
		const onSubmit = vi.fn()

		render(<Harness schema={schema} onSubmit={onSubmit} />)

		const name = screen.getByTestId("name") as HTMLInputElement
		const emailInput = screen.getByTestId("email") as HTMLInputElement

		expect(name.value).toBe("")
		expect(emailInput.value).toBe("default@example.com")

		// ARIA links exist and point to real nodes
		const nameDescId = name.getAttribute("aria-describedby")
		const emailErrId = emailInput.getAttribute("aria-errormessage")

		expect(document.getElementById(nameDescId!)).toBeTruthy()
		expect(document.getElementById(emailErrId!)).toBeTruthy()
		expect(screen.getByTestId("name-touched")).toHaveTextContent("false")
		expect(screen.getByTestId("name-dirty")).toHaveTextContent("false")
		expect(screen.getByTestId("email-touched")).toHaveTextContent("false")
		expect(screen.getByTestId("email-dirty")).toHaveTextContent("false")
	})

	it("onBlur marks touched; only marks dirty & validates when value changed", async () => {
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(<Harness schema={schema} onSubmit={onSubmit} />)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		// Blur without change -> touched true, dirty false, no validation
		await user.click(emailInput)
		await user.tab()

		expect(screen.getByTestId("email-touched")).toHaveTextContent("true")
		expect(screen.getByTestId("email-dirty")).toHaveTextContent("false")
		expect(screen.getByTestId("email-error")).toHaveTextContent("")

		// Change to invalid (no '@'), blur -> dirty true + error set
		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "not-an-email")
		await user.tab()

		expect(screen.getByTestId("email-dirty")).toHaveTextContent("true")
		expect(screen.getByTestId("email-error")).toHaveTextContent("Invalid email")
		expect(emailInput).toHaveAttribute("aria-invalid", "true")
	})

	it("onFocus clears error for that field", async () => {
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(<Harness schema={schema} onSubmit={onSubmit} />)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		await user.clear(emailInput)
		await user.type(emailInput, "oops")
		await user.tab() // blur -> validate

		expect(screen.getByTestId("email-error")).toHaveTextContent("Invalid email")

		await user.click(emailInput) // focus -> clear error
		expect(screen.getByTestId("email-error")).toHaveTextContent("")
		expect(emailInput).not.toHaveAttribute("aria-invalid")
	})

	it("surfaces thrown validator errors", async () => {
		const onSubmit = vi.fn()
		const user = userEvent.setup()
		const throwingSchema = defineForm({
			user: {
				name: {
					label: "Name",
					description: "Your full name",
					defaultValue: "",
					validate: string("Required"),
				},
				contact: {
					email: {
						label: "Email",
						defaultValue: "default@example.com",
						validate: throwingEmail(),
					},
				},
			},
		})

		render(<Harness schema={throwingSchema} onSubmit={onSubmit} />)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "boom")
		await user.tab()

		await waitFor(() => {
			expect(screen.getByTestId("email-error")).toHaveTextContent("Exploded")
			expect(emailInput).toHaveAttribute("aria-invalid", "true")
		})
	})

	it("ignores stale async validation results", async () => {
		const delays = { slow: 60, "fast@example.com": 5 }
		const asyncSchema = defineForm({
			user: {
				name: {
					label: "Name",
					description: "Your full name",
					defaultValue: "",
					validate: string("Required"),
				},
				contact: {
					email: {
						label: "Email",
						defaultValue: "default@example.com",
						validate: asyncEmail(delays),
					},
				},
			},
		})

		render(<Harness schema={asyncSchema} onSubmit={vi.fn()} />)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		fireEvent.focus(emailInput)
		fireEvent.change(emailInput, { target: { value: "slow" } })
		fireEvent.blur(emailInput) // kicks off slow async validation returning an error

		fireEvent.focus(emailInput)
		fireEvent.change(emailInput, { target: { value: "fast@example.com" } })
		fireEvent.blur(emailInput) // kicks off faster validation returning success

		await waitFor(() => {
			expect(screen.getByTestId("email-error")).toHaveTextContent("")
			expect(emailInput).not.toHaveAttribute("aria-invalid")
		})

		await act(async () => {
			await sleep(delays.slow + 10)
		})

		expect(screen.getByTestId("email-error")).toHaveTextContent("")
		expect(emailInput).not.toHaveAttribute("aria-invalid")
	})

	it("surfaces async validator messages when validation fails", async () => {
		const delays = { slow: 20 }
		const asyncSchema = defineForm({
			user: {
				name: {
					label: "Name",
					description: "Your full name",
					defaultValue: "",
					validate: string("Required"),
				},
				contact: {
					email: {
						label: "Email",
						defaultValue: "default@example.com",
						validate: asyncEmail(delays, "Async failure"),
					},
				},
			},
		})

		render(<Harness schema={asyncSchema} onSubmit={vi.fn()} />)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		fireEvent.focus(emailInput)
		fireEvent.change(emailInput, { target: { value: "slow" } })
		fireEvent.blur(emailInput)

		await waitFor(() => {
			expect(screen.getByTestId("email-error")).toHaveTextContent("Async failure")
			expect(emailInput).toHaveAttribute("aria-invalid", "true")
		})
	})

	it("getErrors(name) returns entry for a specific field", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		const emailInput = screen.getByTestId("email") as HTMLInputElement
		await user.clear(emailInput)
		await user.type(emailInput, "bad")
		await user.tab()

		await waitFor(() => {
			expect(api!.getErrors("user.contact.email")).toEqual([
				{ name: "user.contact.email", error: "Invalid email", label: "Email" },
			])
		})

		expect(api!.getErrors("user.name")).toEqual([])
	})

	it("tracks dirty, touched, and valid state per-field and for the whole form", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		expect(api!.isDirty()).toBe(false)
		expect(api!.isDirty("user.contact.email")).toBe(false)
		expect(api!.isTouched()).toBe(false)
		expect(api!.isTouched("user.contact.email")).toBe(false)
		expect(api!.isValid()).toBe(true)
		expect(api!.isValid("user.contact.email")).toBe(true)

		const emailInput = screen.getByTestId("email") as HTMLInputElement

		await user.click(emailInput)
		await user.tab()

		await waitFor(() => {
			expect(api!.isTouched("user.contact.email")).toBe(true)
		})
		expect(api!.isDirty("user.contact.email")).toBe(false)
		expect(api!.isDirty()).toBe(false)

		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "bad")
		await user.tab()

		await waitFor(() => {
			expect(api!.isDirty("user.contact.email")).toBe(true)
			expect(api!.isDirty()).toBe(true)
			expect(api!.isValid("user.contact.email")).toBe(false)
			expect(api!.isValid()).toBe(false)
		})

		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "good@example.com")
		await user.tab()

		await waitFor(() => {
			expect(api!.isValid("user.contact.email")).toBe(true)
			expect(api!.isValid()).toBe(true)
		})
	})

	it("getDirty() and getTouched() return frozen snapshots", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		const initialDirty = api!.getDirty()
		const initialTouched = api!.getTouched()

		expect(initialDirty).toEqual({})
		expect(initialTouched).toEqual({})
		expect(Object.isFrozen(initialDirty)).toBe(true)
		expect(Object.isFrozen(initialTouched)).toBe(true)

		const emailInput = screen.getByTestId("email") as HTMLInputElement
		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "oops")
		await user.tab()

		const dirtySnapshot = api!.getDirty()
		const touchedSnapshot = api!.getTouched()

		expect(Object.isFrozen(dirtySnapshot)).toBe(true)
		expect(Object.isFrozen(touchedSnapshot)).toBe(true)
		expect(dirtySnapshot).not.toBe(initialDirty)
		expect(touchedSnapshot).not.toBe(initialTouched)
		expect(dirtySnapshot["user.contact.email"]).toBe(true)
		expect(touchedSnapshot["user.contact.email"]).toBe(true)
		expect(initialDirty["user.contact.email"]).toBeUndefined()
		expect(initialTouched["user.contact.email"]).toBeUndefined()
	})

	it("validate(name) validates one field; validate() validates entire form", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		const nameInput = screen.getByTestId("name") as HTMLInputElement
		const emailInput = screen.getByTestId("email") as HTMLInputElement

		// Make email invalid and BLUR so the hook commits internal data
		await user.clear(emailInput)
		await user.type(emailInput, "bad")
		await user.tab() // commit via onBlur

		// validate only the email field -> should show error
		let emailValidationResult: boolean | undefined
		await act(async () => {
			emailValidationResult = await api!.validate("user.contact.email")
		})

		expect(screen.getByTestId("email-error")).toHaveTextContent("Invalid email")
		expect(emailValidationResult).toBe(false)

		// Fix email, blur to commit, then validate field again -> clears error
		await user.clear(emailInput)
		await user.type(emailInput, "valid@example.com")
		await user.tab()

		await act(async () => {
			emailValidationResult = await api!.validate("user.contact.email")
		})

		expect(screen.getByTestId("email-error")).toHaveTextContent("")
		expect(emailValidationResult).toBe(true)

		// Full-form validate should be FALSE right now because name is still required & empty
		let formValidationResult: boolean | undefined
		await act(async () => {
			formValidationResult = await api!.validate()
		})
		expect(formValidationResult).toBe(false)

		// Fill name, blur to commit
		await user.type(nameInput, "Alice")
		await user.tab()

		// Now full-form validate should pass
		await act(async () => {
			formValidationResult = await api!.validate()
		})
		expect(formValidationResult).toBe(true)
	})

	it("__dangerouslySetField sets value and flags (and validates) before data commit", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		await act(async () => await api!.__dangerouslySetField("user.contact.email", "invalid"))

		expect(screen.getByTestId("email-dirty")).toHaveTextContent("true")
		expect(screen.getByTestId("email-touched")).toHaveTextContent("true")
		expect(screen.getByTestId("email-error")).toHaveTextContent("Invalid email")

		await act(async () => {
			await api!.__dangerouslySetField("user.contact.email", "good@ex.com")
		})
		expect(screen.getByTestId("email-error")).toHaveTextContent("")
	})

	it("falls back to default messaging when thrown issues lack text", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const throwingSchema = defineForm({
			user: {
				name: {
					label: "Name",
					description: "Your full name",
					defaultValue: "",
					validate: string("Required"),
				},
				contact: {
					email: {
						label: "Email",
						defaultValue: "default@example.com",
						validate: throwingIssuesWithoutMessage(),
					},
				},
			},
		})

		render(
			<Harness
				schema={throwingSchema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		await act(async () => {
			await api!.__dangerouslySetField("user.contact.email", "whatever")
		})

		expect(screen.getByTestId("email-error")).toHaveTextContent("Validation failed")
	})

	it("getErrors returns only populated errors", async () => {
		let api: HarnessApi
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		const emailInput = screen.getByTestId("email") as HTMLInputElement
		await user.clear(emailInput)
		await user.type(emailInput, "nope")
		await user.tab() // commit

		await act(async () => {
			await api!.validate("user.contact.email")
		})

		const errs = api!.getErrors()
		expect(Array.isArray(errs)).toBe(true)
		expect(errs).toEqual([{ name: "user.contact.email", error: "Invalid email", label: "Email" }])
	})

	it("getForm: prevents submit when invalid, submits when valid, and supports reset", async () => {
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(<Harness schema={schema} onSubmit={onSubmit} />)

		const name = screen.getByTestId("name") as HTMLInputElement
		const emailInput = screen.getByTestId("email") as HTMLInputElement

		// Make invalid
		await user.clear(emailInput)
		await user.type(emailInput, "bad")
		await user.click(screen.getByText("Submit"))

		expect(onSubmit).not.toHaveBeenCalled() // blocked by validation

		// Fix values
		await user.clear(name)
		await user.type(name, "Alice")
		await user.clear(emailInput)
		await user.type(emailInput, "alice@example.com")
		await user.click(screen.getByText("Submit"))

		expect(onSubmit).toHaveBeenCalledTimes(1)

		await user.click(screen.getByText("Reset"))

		expect(screen.getByTestId("name-touched")).toHaveTextContent("false")
		expect(screen.getByTestId("email-dirty")).toHaveTextContent("false")
	})

	it("resets internal state after a successful submit", async () => {
		const onSubmit = vi.fn()
		const user = userEvent.setup()

		render(<Harness schema={schema} onSubmit={onSubmit} />)

		const nameInput = screen.getByTestId("name") as HTMLInputElement
		const emailInput = screen.getByTestId("email") as HTMLInputElement

		await user.click(nameInput)
		await user.type(nameInput, "Alice")
		await user.tab()

		await user.click(emailInput)
		await user.clear(emailInput)
		await user.type(emailInput, "alice@example.com")
		await user.tab()

		await waitFor(() => {
			expect(screen.getByTestId("name-touched")).toHaveTextContent("true")
			expect(screen.getByTestId("email-dirty")).toHaveTextContent("true")
		})

		await user.click(screen.getByText("Submit"))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
			expect(screen.getByTestId("name-touched")).toHaveTextContent("false")
			expect(screen.getByTestId("email-dirty")).toHaveTextContent("false")
			expect(nameInput.value).toBe("")
			expect(emailInput.value).toBe("default@example.com")
		})
	})

	it("getField throws for unknown keys", () => {
		let api: HarnessApi
		const onSubmit = vi.fn()

		render(
			<Harness
				schema={schema}
				onSubmit={onSubmit}
				onApi={(x) => {
					api = x
				}}
			/>,
		)

		expect(() => api!.getField("user.unknown")).toThrow('Field "user.unknown" does not exist in the form definition.')
	})
})
