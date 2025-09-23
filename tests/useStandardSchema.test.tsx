import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { defineForm } from "../src"
import { Harness, type HarnessApi } from "./test-harness"
import { email, string } from "./test-validation-lib"

describe("useStandardSchema", () => {
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
		await act(async () => await api!.validate("user.contact.email"))

		expect(screen.getByTestId("email-error")).toHaveTextContent("Invalid email")

		// Fix email, blur to commit, then validate field again -> clears error
		await user.clear(emailInput)
		await user.type(emailInput, "valid@example.com")
		await user.tab()

		await act(async () => await api!.validate("user.contact.email"))

		expect(screen.getByTestId("email-error")).toHaveTextContent("")

		// Full-form validate should be FALSE right now because name is still required & empty
		await act(async () => await expect(api!.validate()).resolves.toBe(false))

		// Fill name, blur to commit
		await user.type(nameInput, "Alice")
		await user.tab()

		// Now full-form validate should pass
		await act(async () => await expect(api!.validate()).resolves.toBe(true))
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
