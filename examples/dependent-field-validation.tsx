import React, { useEffect } from "react"
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const locationForm = defineForm({
	country: {
		label: "Country",
		defaultValue: "usa",
		validate: z.enum(["usa", "canada"]),
	},
	state: {
		label: "State / Province",
		defaultValue: "ca",
		validate: z.string().min(1, "Select a region"),
	},
})

const countryOptions = [
	{ value: "usa", label: "United States" },
	{ value: "canada", label: "Canada" },
] as const

type CountryValue = (typeof countryOptions)[number]["value"]

const statesByCountry: Record<CountryValue, { value: string; label: string }[]> = {
	usa: [
		{ value: "ca", label: "California" },
		{ value: "ny", label: "New York" },
	],
	canada: [
		{ value: "on", label: "Ontario" },
		{ value: "qc", label: "Quebec" },
	],
} as const

export function DependentFieldValidationExample() {
	const submitHandler = (values: TypeFromDefinition<typeof locationForm>) => {
		console.log("Location submitted:", values)
	}

	const { getForm, getField, setField, setError } = useStandardSchema(locationForm)
	const handlers = getForm(submitHandler)

	const country = getField("country")
	const state = getField("state")
	const currentCountry = (country.defaultValue as CountryValue) ?? "usa"
	const stateOptions = statesByCountry[currentCountry] ?? []

	useEffect(() => {
		if (stateOptions.length === 0) {
			setField("state", "")
			setError("state", "No regions available for the selected country")
			return
		}

		if (!stateOptions.some((option) => option.value === state.defaultValue)) {
			setField("state", "")
			setError("state", "Select a region for the chosen country")
			return
		}

		setError("state", "")
	}, [setError, setField, state.defaultValue, stateOptions])

	return (
		<form {...handlers}>
			<label htmlFor={country.name}>{country.label}</label>
			<select
				id={country.name}
				name={country.name}
				value={country.defaultValue}
				onChange={(event) => void setField("country", event.target.value)}
			>
				{countryOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>

			<label htmlFor={state.name}>{state.label}</label>
			<select
				id={state.name}
				name={state.name}
				value={state.defaultValue}
				onChange={(event) => void setField("state", event.target.value)}
				aria-describedby={state.describedById}
				aria-errormessage={state.errorId}
			>
				{stateOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>

			<p id={state.errorId} role="alert">
				{state.error}
			</p>

			<button type="submit">Submit</button>
		</form>
	)
}
