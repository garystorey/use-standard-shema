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

		// Defaults are valid with no errors reported
		expect(ref.current!.getField("name").error).toBe("")
		expect(ref.current!.getErrors("name")).toHaveLength(0)

		// Now set to empty explicitly (this will run single-field validation)
		await act(async () => {
			await ref.current!.setField("name", "")
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
			await ref.current!.setField("name", "")
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
			await ref.current!.setField("name", "Alice")
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
			await ref.current!.setField("name", "Alice")
		})

		await waitFor(() => {
			expect(ref.current!.isDirty("name")).toBe(true)
		})

		await act(async () => {
			await ref.current!.setField("name", "Joe")
		})

		await waitFor(() => {
			expect(ref.current!.isDirty("name")).toBe(false)
			const field = ref.current!.getField("name")
			expect(field.defaultValue).toBe("Joe")
		})
	})

	it("surface errors when interacting with unknown fields", () => {
		const { ref } = renderHookHarness()

		expect(() => ref.current!.getField("missing" as never)).toThrowError('Field "missing" not found')

		expect(() => ref.current!.setError("missing" as never, "Boom")).toThrowError('Field "missing" not found')
	})

	it("setError allows manual control over field errors", async () => {
		const { ref } = renderHookHarness()

		act(() => {
			ref.current!.setError("name", "  Custom issue  ")
		})

		await waitFor(() => {
			expect(ref.current!.getField("name").error).toBe("Custom issue")
		})

		act(() => {
			ref.current!.setError("name", { message: "Another problem" })
		})

		await waitFor(() => {
			expect(ref.current!.getField("name").error).toBe("Another problem")
		})

		act(() => {
			ref.current!.setError("name", new Error("Boom"))
		})

		await waitFor(() => {
			expect(ref.current!.getField("name").error).toBe("Boom")
		})

		act(() => {
			ref.current!.setError("name", { message: "   " })
		})

		await waitFor(() => {
			expect(ref.current!.getField("name").error).toBe("")
		})

		act(() => {
			ref.current!.setError("name", null)
		})

		await waitFor(() => {
			expect(ref.current!.getField("name").error).toBe("")
		})
	})

	it("resets state when form definition changes", async () => {
		const firstForm = makeForm()
		const { ref, rerenderWith } = renderHookHarness(firstForm)

		await act(async () => {
			await ref.current!.setField("name", "")
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
			await ref.current!.setField("contact.email", "no-at-sign")
		})

		await waitFor(() => {
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
				await ref.current!.setField("name", "")
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
		renderFormHarness({ formDef: makeForm(), onSubmitSpy: spy })

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
			await ref.current!.setField("name", "Sally")
			await ref.current!.setField("contact.email", "sally@example.com")
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
			await ref.current!.setField("name", "")
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
