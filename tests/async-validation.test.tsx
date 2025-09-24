import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { useStandardSchema, defineForm } from "../src/index"

describe("Async Validation", () => {
	it("should support async validation after sync validation passes", async () => {
		const asyncValidator = vi.fn().mockResolvedValue({ error: "Username taken" })

		const form = defineForm({
			username: {
				label: "Username",
				validate: z.string().min(3),
				validateAsync: asyncValidator,
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		// Trigger validation with valid sync input
		await act(async () => {
			await result.current.validate("username")
		})

		// Initial state has no value, so sync validation fails
		expect(asyncValidator).not.toHaveBeenCalled()

		// Set valid value and validate
		await act(async () => {
			await result.current.__dangerouslySetField("username", "johndoe")
		})

		await waitFor(() => {
			expect(asyncValidator).toHaveBeenCalledWith("johndoe")
		})

		const field = result.current.getField("username")
		expect(field.error).toBe("Username taken")
	})

	it("should skip async validation if sync validation fails", async () => {
		const asyncValidator = vi.fn().mockResolvedValue({ error: "Username taken" })

		const form = defineForm({
			username: {
				label: "Username",
				validate: z.string().min(5, "Too short"),
				validateAsync: asyncValidator,
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		// Set invalid value (too short)
		await act(async () => {
			await result.current.__dangerouslySetField("username", "joe")
		})

		// Async validator should not be called
		expect(asyncValidator).not.toHaveBeenCalled()

		const field = result.current.getField("username")
		expect(field.error).toBe("Too short")
	})

	it("should show validating state during async validation", async () => {
		let resolveValidation: (value: any) => void
		const asyncValidator = vi.fn().mockImplementation(() => {
			return new Promise((resolve) => {
				resolveValidation = resolve
			})
		})

		const form = defineForm({
			email: {
				label: "Email",
				validate: z.string().email(),
				validateAsync: asyncValidator,
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		// Start async validation
		act(() => {
			result.current.__dangerouslySetField("email", "test@example.com")
		})

		// Should be validating
		await waitFor(() => {
			const field = result.current.getField("email")
			expect(field.validating).toBe("true")
		})

		// Resolve the validation
		await act(async () => {
			resolveValidation!({ error: "" })
		})

		// Should no longer be validating
		await waitFor(() => {
			const field = result.current.getField("email")
			expect(field.validating).toBe("false")
		})
	})

	it("should cancel in-flight validations when new validation starts", async () => {
		let resolveFirst: (value: any) => void
		let resolveSecond: (value: any) => void
		let callCount = 0

		const asyncValidator = vi.fn().mockImplementation((value: string) => {
			callCount++
			if (callCount === 1) {
				return new Promise((resolve) => {
					resolveFirst = resolve
				})
			} else {
				return new Promise((resolve) => {
					resolveSecond = resolve
				})
			}
		})

		const form = defineForm({
			username: {
				label: "Username",
				validate: z.string(),
				validateAsync: asyncValidator,
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		// Start first validation
		act(() => {
			result.current.__dangerouslySetField("username", "user1")
		})

		await waitFor(() => {
			expect(asyncValidator).toHaveBeenCalledWith("user1")
		})

		// Start second validation before first completes
		act(() => {
			result.current.__dangerouslySetField("username", "user2")
		})

		await waitFor(() => {
			expect(asyncValidator).toHaveBeenCalledWith("user2")
		})

		// Resolve second validation
		await act(async () => {
			resolveSecond!({ error: "" })
		})

		// Wait for state to settle
		await waitFor(() => {
			const field = result.current.getField("username")
			expect(field.validating).toBe("false")
			expect(field.error).toBe("")
		})

		// First validation should have been cancelled
		expect(asyncValidator).toHaveBeenCalledTimes(2)
	})

	it("should handle async validation errors gracefully", async () => {
		const asyncValidator = vi.fn().mockRejectedValue(new Error("Network error"))

		const form = defineForm({
			email: {
				label: "Email",
				validate: z.string().email(),
				validateAsync: asyncValidator,
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		await act(async () => {
			await result.current.__dangerouslySetField("email", "test@example.com")
		})

		await waitFor(() => {
			const field = result.current.getField("email")
			expect(field.error).toBe("Validation failed")
			expect(field.validating).toBe("false")
		})
	})

	it("should only run async validation for fields that have it", async () => {
		const asyncValidator = vi.fn().mockResolvedValue({ error: "" })

		const form = defineForm({
			username: {
				label: "Username",
				validate: z.string(),
				validateAsync: asyncValidator,
			},
			password: {
				label: "Password",
				validate: z.string().min(8),
			},
		})

		const { result } = renderHook(() => useStandardSchema(form))

		// Validate password (no async validator)
		await act(async () => {
			await result.current.__dangerouslySetField("password", "securepass123")
		})

		// Password should not trigger async validation
		expect(asyncValidator).not.toHaveBeenCalled()

		const passwordField = result.current.getField("password")
		expect(passwordField.validating).toBe("false")

		// Validate username (has async validator)
		await act(async () => {
			await result.current.__dangerouslySetField("username", "johndoe")
		})

		await waitFor(() => {
			expect(asyncValidator).toHaveBeenCalledWith("johndoe")
		})
	})
})