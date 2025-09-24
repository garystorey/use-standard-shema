import React from "react"
import { z } from "zod"
import { useStandardSchema, defineForm } from "../src/index"

// Simulate API call to check username availability
const checkUsernameAvailability = async (username: string): Promise<{ error?: string }> => {
	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 800))

	// Mock taken usernames
	const takenUsernames = ["admin", "user", "test", "john", "jane"]

	if (takenUsernames.includes(username.toLowerCase())) {
		return { error: "Username is already taken" }
	}

	return {}
}

// Simulate email verification API
const verifyEmailDomain = async (email: string): Promise<{ error?: string }> => {
	await new Promise(resolve => setTimeout(resolve, 600))

	// Block disposable email domains
	const blockedDomains = ["tempmail.com", "throwaway.email", "guerrillamail.com"]
	const domain = email.split("@")[1]?.toLowerCase()

	if (blockedDomains.includes(domain)) {
		return { error: "Please use a permanent email address" }
	}

	return {}
}

const signupForm = defineForm({
	username: {
		label: "Username",
		description: "Choose a unique username",
		validate: z.string().min(3, "Minimum 3 characters").max(20, "Maximum 20 characters"),
		validateAsync: checkUsernameAvailability,
	},
	email: {
		label: "Email",
		description: "Your email address",
		validate: z.string().email("Invalid email format"),
		validateAsync: verifyEmailDomain,
	},
	password: {
		label: "Password",
		validate: z.string().min(8, "Minimum 8 characters"),
	},
})

export function AsyncValidationDemo() {
	const { getForm, getField, getErrors } = useStandardSchema(signupForm)

	const handleSubmit = (data: any) => {
		console.log("Form submitted:", data)
		alert("Account created successfully!")
	}

	const formHandlers = getForm(handleSubmit)
	const errors = getErrors()

	const usernameField = getField("username")
	const emailField = getField("email")
	const passwordField = getField("password")

	return (
		<div style={{ maxWidth: "400px", margin: "2rem auto", fontFamily: "system-ui" }}>
			<h2>Async Validation Demo</h2>
			<p style={{ color: "#666", fontSize: "14px" }}>
				Try usernames: admin, user, test (taken)<br/>
				Try emails with: tempmail.com (blocked)
			</p>

			<form {...formHandlers} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
				<div>
					<label htmlFor={usernameField.name} style={{ display: "block", marginBottom: "4px" }}>
						{usernameField.label}
						{usernameField.validating === "true" && (
							<span style={{ marginLeft: "8px", color: "#999" }}>Checking...</span>
						)}
					</label>
					<input
						id={usernameField.name}
						name={usernameField.name}
						defaultValue={usernameField.defaultValue}
						aria-describedby={usernameField.describedById}
						aria-invalid={usernameField.error ? "true" : "false"}
						style={{
							width: "100%",
							padding: "8px",
							border: usernameField.error ? "1px solid red" : "1px solid #ccc",
							borderRadius: "4px"
						}}
					/>
					{usernameField.error && (
						<span id={usernameField.errorId} style={{ color: "red", fontSize: "14px" }}>
							{usernameField.error}
						</span>
					)}
					{usernameField.description && (
						<span id={usernameField.describedById} style={{ fontSize: "12px", color: "#666" }}>
							{usernameField.description}
						</span>
					)}
				</div>

				<div>
					<label htmlFor={emailField.name} style={{ display: "block", marginBottom: "4px" }}>
						{emailField.label}
						{emailField.validating === "true" && (
							<span style={{ marginLeft: "8px", color: "#999" }}>Verifying...</span>
						)}
					</label>
					<input
						id={emailField.name}
						name={emailField.name}
						type="email"
						defaultValue={emailField.defaultValue}
						aria-describedby={emailField.describedById}
						aria-invalid={emailField.error ? "true" : "false"}
						style={{
							width: "100%",
							padding: "8px",
							border: emailField.error ? "1px solid red" : "1px solid #ccc",
							borderRadius: "4px"
						}}
					/>
					{emailField.error && (
						<span id={emailField.errorId} style={{ color: "red", fontSize: "14px" }}>
							{emailField.error}
						</span>
					)}
					{emailField.description && (
						<span id={emailField.describedById} style={{ fontSize: "12px", color: "#666" }}>
							{emailField.description}
						</span>
					)}
				</div>

				<div>
					<label htmlFor={passwordField.name} style={{ display: "block", marginBottom: "4px" }}>
						{passwordField.label}
					</label>
					<input
						id={passwordField.name}
						name={passwordField.name}
						type="password"
						defaultValue={passwordField.defaultValue}
						aria-invalid={passwordField.error ? "true" : "false"}
						style={{
							width: "100%",
							padding: "8px",
							border: passwordField.error ? "1px solid red" : "1px solid #ccc",
							borderRadius: "4px"
						}}
					/>
					{passwordField.error && (
						<span id={passwordField.errorId} style={{ color: "red", fontSize: "14px" }}>
							{passwordField.error}
						</span>
					)}
				</div>

				<button type="submit" style={{
					padding: "10px",
					backgroundColor: "#007bff",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: "pointer"
				}}>
					Create Account
				</button>
			</form>

			{errors.length > 0 && (
				<div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#fee", borderRadius: "4px" }}>
					<strong>Errors:</strong>
					<ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
						{errors.map(err => (
							<li key={err.name}>{err.label}: {err.error}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}