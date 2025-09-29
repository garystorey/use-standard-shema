import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React, { act, forwardRef, useImperativeHandle } from "react"
import { describe, expect, it, vi } from "vitest"
import { useStandardSchema } from "../src"
import { defineForm } from "../src/helpers"
import type { ErrorEntry } from "../src/types"
import { email as emailValidator, string as reqString } from "./test-validation-lib"

function makeForm() {
	return defineForm({
		name: { label: "Name", defaultValue: "Joe", validate: reqString() },
		contact: {
			email: { label: "Email", defaultValue: "", validate: emailValidator() },
		},
	})
}

type FormType = ReturnType<typeof makeForm>
type HookApi = ReturnType<typeof useStandardSchema<FormType>>

const Harness = forwardRef<HookApi | null, { formDef: FormType }>(function Harness(props, ref) {
	const api = useStandardSchema(props.formDef)
	useImperativeHandle(ref, () => api, [api])
	return null
})

// Test helpers to reduce repetition in tests
function setupHarness(): { form: ReturnType<typeof makeForm>; ref: React.RefObject<HookApi | null> } {
	const form = makeForm()
	const ref = React.createRef<HookApi | null>()
	render(<Harness ref={ref} formDef={form} />)
	return { form, ref }
}

describe("useStandardSchema (basic)", () => {
	it("getField returns metadata and default value", () => {
		const { form, ref } = setupHarness()

		const field = ref.current!.getField("name")
		expect(field.name).toBe("name")
		expect(field.label).toBe("Name")
		expect(field.defaultValue).toBe("Joe")
		expect(field.error).toBe("")
	})

	it("validate a missing required field produces an error and isDirty/isTouched are set", async () => {
		const { form, ref } = setupHarness()

		// Validate an empty value for name
		let ok: boolean
		await act(async () => {
			ok = await ref.current!.validate("name")
		})
		// validate returns false because defaultValue 'Joe' is valid; to test invalid we set empty via dangerous setter
		expect(ok!).toBe(true)

		// Now set to empty explicitly (this will run single-field validation)
		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "")
		})

		await waitFor(() => {
			const errs = ref.current!.getErrors("name")
			expect(errs.length).toBe(1)
			expect(errs[0].error).toBe("Required")
		})

		expect(ref.current!.isDirty("name")).toBe(true)
		expect(ref.current!.isTouched("name")).toBe(true)
	})

	it("setting a valid value clears the error and updates data; resetForm restores defaults", async () => {
		const { form, ref } = setupHarness()

		// Set a valid name
		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "Alice")
		})

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Alice")
			expect(field.error).toBe("")
		})

		expect(ref.current!.isDirty("name")).toBe(true)
		expect(ref.current!.isTouched("name")).toBe(true)

		// Reset and ensure defaults come back
		act(() => {
			ref.current!.resetForm()
		})

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
			expect(ref.current!.isDirty()).toBe(false)
			expect(ref.current!.isTouched()).toBe(false)
		})
	})

	it("full form validate reports errors for multiple fields", async () => {
		const form = makeForm()
		const ref = React.createRef<HookApi | null>()
		render(<Harness ref={ref} formDef={form} />)

		// Ensure email is invalid by default (empty, email requires @)
		await act(async () => {
			await ref.current!.__dangerouslySetField("contact.email", "no-at-sign")
		})

		await waitFor(async () => {
			const ok = await ref.current!.validate()
			expect(ok).toBe(false)
			const allErrors = ref.current!.getErrors()
			// email should be present in errors
			expect(allErrors.some((e: ErrorEntry) => e.name === "contact.email")).toBe(true)
		})
	})
})

const FormHarness = forwardRef<
	HookApi | null,
	{ formDef: FormType; onSubmitSpy: (data: Record<string, unknown>) => void }
>(function FormHarness(props, ref) {
	const api = useStandardSchema(props.formDef)
	const handlers = api.getForm(props.onSubmitSpy)

	useImperativeHandle(ref, () => api, [api])

	const nameField = api.getField("name")
	const emailField = api.getField("contact.email")

	return (
		<form
			data-testid="form"
			onSubmit={handlers.onSubmit}
			onFocus={handlers.onFocus}
			onBlur={handlers.onBlur}
			onReset={handlers.onReset}
		>
			<label htmlFor="name">{nameField.label}</label>
			<input id="name" name="name" defaultValue={nameField.defaultValue} />

			<label htmlFor="email">{emailField.label}</label>
			<input id="email" name="contact.email" defaultValue={emailField.defaultValue} />

			<button type="submit">Submit</button>
			<button type="reset">Reset</button>
		</form>
	)
})

describe("useStandardSchema getForm handlers (inline)", () => {
	it("onSubmit calls handler when form valid", async () => {
		const form = makeForm()
		const ref = React.createRef<HookApi | null>()
		const spy = vi.fn()
		render(<FormHarness ref={ref} formDef={form} onSubmitSpy={spy} />)

		const user = userEvent.setup()
		const email = screen.getByLabelText("Email") as HTMLInputElement
		await user.type(email, "user@example.com")
		// blur to update data
		fireEvent.blur(email)

		const formEl = screen.getByTestId("form") as HTMLFormElement
		fireEvent.submit(formEl)

		await waitFor(() => expect(spy).toHaveBeenCalled())
		const calledWith = spy.mock.calls[0][0]
		expect(calledWith).toHaveProperty("name")
		expect(calledWith).toHaveProperty("contact.email")
		expect(calledWith["contact.email"]).toBe("user@example.com")
	})

	it("onFocus sets touched and clears error", async () => {
		const form = makeForm()
		const ref = React.createRef<HookApi | null>()
		const spy = vi.fn()
		render(<FormHarness ref={ref} formDef={form} onSubmitSpy={spy} />)

		// create an error by setting invalid value
		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "")
		})

		await waitFor(() => {
			const errs = ref.current!.getErrors("name")
			expect(errs.length).toBe(1)
		})

		const name = screen.getByLabelText("Name") as HTMLInputElement
		fireEvent.focus(name)

		await waitFor(() => {
			const errs = ref.current!.getErrors("name")
			expect(errs.length).toBe(0)
			expect(ref.current!.isTouched("name")).toBe(true)
		})
	})

	it("onBlur updates data and sets dirty when changed", async () => {
		const form = makeForm()
		const ref = React.createRef<HookApi | null>()
		const spy = vi.fn()
		render(<FormHarness ref={ref} formDef={form} onSubmitSpy={spy} />)

		const user = userEvent.setup()
		const name = screen.getByLabelText("Name") as HTMLInputElement
		await user.clear(name)
		await user.type(name, "Janet")
		fireEvent.blur(name)

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Janet")
			expect(ref.current!.isDirty("name")).toBe(true)
			expect(ref.current!.isTouched("name")).toBe(true)
		})
	})

	it("onReset restores defaults and clears flags", async () => {
		const form = makeForm()
		const ref = React.createRef<HookApi | null>()
		const spy = vi.fn()
		render(<FormHarness ref={ref} formDef={form} onSubmitSpy={spy} />)

		const user = userEvent.setup()
		const name = screen.getByLabelText("Name") as HTMLInputElement
		await user.clear(name)
		await user.type(name, "X")
		fireEvent.blur(name)

		const formEl = screen.getByTestId("form") as HTMLFormElement
		fireEvent.reset(formEl)

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
			expect(ref.current!.isDirty()).toBe(false)
			expect(ref.current!.isTouched()).toBe(false)
		})
	})
})
