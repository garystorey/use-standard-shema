import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import type { ErrorEntry } from "../src/types"
import { makeForm, makeThrowingForm, renderFormHarness, renderHookHarness } from "./test-utils"

describe("useStandardSchema (basic)", () => {
	it("getField returns metadata and default value", () => {
		const { ref } = renderHookHarness()

		const field = ref.current!.getField("name")
		expect(field.name).toBe("name")
		expect(field.label).toBe("Name")
		expect(field.defaultValue).toBe("Joe")
		expect(field.error).toBe("")
	})

	it("getField surfaces accessibility ids and flag defaults", () => {
		const { ref } = renderHookHarness()

		const field = ref.current!.getField("contact.email")
		expect(field.describedById).toBe("contact.email-description")
		expect(field.errorId).toBe("contact.email-error")
		expect(field.touched).toBe(false)
		expect(field.dirty).toBe(false)
	})

	it("validate a missing required field produces an error and isDirty/isTouched are set", async () => {
		const { ref } = renderHookHarness()

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

			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("")
			expect(field.error).toBe("Required")
		})

		expect(ref.current!.isDirty("name")).toBe(true)
		expect(ref.current!.isTouched("name")).toBe(true)
	})

	it("getErrors aggregates field metadata when collecting all errors", async () => {
		const { ref } = renderHookHarness()

		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "")
		})

		await waitFor(() => {
			const errors = ref.current!.getErrors()
			expect(errors).toEqual([
				{
					name: "name",
					error: "Required",
					label: "Name",
				},
			])
		})
	})

	it("setting a valid value clears the error and updates data; resetForm restores defaults", async () => {
		const { ref } = renderHookHarness()

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

	it("programmatic updates clear dirty flag when value matches default", async () => {
		const { ref } = renderHookHarness()

		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "Alice")
		})

		await waitFor(() => {
			expect(ref.current!.isDirty("name")).toBe(true)
		})

		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "Joe")
		})

		await waitFor(() => {
			expect(ref.current!.isDirty("name")).toBe(false)
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
		})
	})

	it("resets state when form definition changes", async () => {
		const firstForm = makeForm()
		const { ref, rerenderWith } = renderHookHarness(firstForm)

		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "")
		})

		await waitFor(() => {
			const errors = ref.current!.getErrors("name")
			expect(errors).toHaveLength(1)
		})

		const updatedForm = makeForm("Jane")

		rerenderWith(updatedForm)

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Jane")
			expect(ref.current!.getErrors("name")).toHaveLength(0)
			expect(ref.current!.isDirty()).toBe(false)
			expect(ref.current!.isTouched()).toBe(false)
		})
	})

	it("full form validate reports errors for multiple fields", async () => {
		const { ref } = renderHookHarness()

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

	it("handles validators that throw errors without crashing", async () => {
		const { ref } = renderHookHarness(makeThrowingForm())

		let thrown: unknown
		await act(async () => {
			try {
				await ref.current!.__dangerouslySetField("name", "")
			} catch (error) {
				thrown = error
			}
		})

		expect(thrown).toBeUndefined()

		await waitFor(() => {
			const errs = ref.current!.getErrors("name")
			expect(errs).toHaveLength(1)
			expect(errs[0].error).toContain("Boom!")
		})
	})
})

describe("useStandardSchema getForm handlers (inline)", () => {
	it("onSubmit calls handler when form valid", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

		const user = userEvent.setup()
		const email = screen.getByLabelText("Email") as HTMLInputElement
		await user.type(email, "user@example.com")

		const formEl = screen.getByTestId("form") as HTMLFormElement
		fireEvent.submit(formEl)

		await waitFor(() => expect(spy).toHaveBeenCalled())
		const calledWith = spy.mock.calls[0][0]
		expect(calledWith).toHaveProperty("name")
		expect(calledWith).toHaveProperty("contact.email")
		expect(calledWith["contact.email"]).toBe("user@example.com")
	})

	it("successful submit resets form state and clears flags", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

		const user = userEvent.setup()
		const nameInput = screen.getByLabelText("Name") as HTMLInputElement
		const emailInput = screen.getByLabelText("Email") as HTMLInputElement

		await user.clear(nameInput)
		await user.type(nameInput, "Janet")
		fireEvent.blur(nameInput)

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Janet")
			expect(ref.current!.isDirty()).toBe(true)
			expect(ref.current!.isTouched()).toBe(true)
		})

		await user.type(emailInput, "janet@example.com")

		const formEl = screen.getByTestId("form") as HTMLFormElement
		fireEvent.submit(formEl)

		await waitFor(() => {
			expect(spy).toHaveBeenCalled()
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
			expect(ref.current!.isDirty()).toBe(false)
			expect(ref.current!.isTouched()).toBe(false)
		})
	})

	it("onSubmit retains programmatic updates when no DOM interaction occurs", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

		await act(async () => {
			await ref.current!.__dangerouslySetField("name", "Sally")
			await ref.current!.__dangerouslySetField("contact.email", "sally@example.com")
		})

		const formEl = screen.getByTestId("form") as HTMLFormElement
		fireEvent.submit(formEl)

		await waitFor(() => expect(spy).toHaveBeenCalled())
		const calledWith = spy.mock.calls[0][0]
		expect(calledWith["name"]).toBe("Sally")
		expect(calledWith["contact.email"]).toBe("sally@example.com")
	})

	it("onFocus sets touched and clears error", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

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
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

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

	it("onBlur clears dirty when value reverts to default", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

		const user = userEvent.setup()
		const name = screen.getByLabelText("Name") as HTMLInputElement

		await user.clear(name)
		await user.type(name, "Janet")
		fireEvent.blur(name)

		await waitFor(() => {
			expect(ref.current!.isDirty("name")).toBe(true)
		})

		await user.click(name)
		await user.clear(name)
		await user.type(name, "Joe")
		fireEvent.blur(name)

		await waitFor(() => {
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
			expect(ref.current!.isDirty("name")).toBe(false)
		})
	})

	it("onReset restores defaults and clears flags", async () => {
		const spy = vi.fn()
		const { ref } = renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

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
