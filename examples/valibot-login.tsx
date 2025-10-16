import React from "react"
import { defineForm, useStandardSchema, type TypeFromDefinition, type ErrorEntry } from "use-standard-schema"
import { pipe, string, email, minLength } from "valibot"

const loginForm = defineForm({
	email: {
		label: "Email",
		defaultValue: "",
		validate: pipe(string("Enter an email"), email("Enter a valid email address")),
	},
	password: {
		label: "Password",
		defaultValue: "",
		validate: pipe(string("Enter a password"), minLength(8, "Use at least 8 characters")),
	},
})

const submitHandler = (values: TypeFromDefinition<typeof loginForm>) => {
    console.log("Valibot login submitted:", values)
}


export function ValibotLoginExample() {


	const { getForm, getField, getErrors} = useStandardSchema(loginForm)
	const formHandlers = getForm(submitHandler)

	const emailField = getField("email")
	const passwordField = getField("password")
	const errors = getErrors()

	return (
		<form {...formHandlers}>
			{errors.length > 0 && (
				<div role="alert">
					<ul>
						{errors.map((error:ErrorEntry) => (
							<li key={error.name}>{error.label}:{error.error}</li>
						))}
					</ul>
				</div>
			)}

			<label htmlFor={emailField.name}>{emailField.label}</label>
			<input
				id={emailField.name}
				name={emailField.name}
				type="email"
				value={emailField.defaultValue ?? ""}
				aria-describedby={emailField.describedById}
				aria-errormessage={emailField.errorId}
			/>
			<p id={emailField.describedById}>We use your email to send confirmations.</p>
			<p id={emailField.errorId} role="alert">
				{emailField.error}
			</p>

			<label htmlFor={passwordField.name}>{passwordField.label}</label>
			<input
				id={passwordField.name}
				name={passwordField.name}
				type="password"
				value={passwordField.defaultValue ?? ""}
				aria-describedby={passwordField.describedById}
				aria-errormessage={passwordField.errorId}
			/>
			<p id={passwordField.describedById}>Choose something memorable with letters and numbers.</p>
			<p id={passwordField.errorId} role="alert">
				{passwordField.error}
			</p>

			<button type="submit">Log in</button>
		</form>
	)
}
