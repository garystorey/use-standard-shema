import React from "react"
import { z } from "zod"
import { useStandardSchema, defineForm } from "../src/index"

// Simulate API delay for async validation
const checkUsernameAPI = async (username: string): Promise<{ error?: string }> => {
	await new Promise(resolve => setTimeout(resolve, 1000))
	const taken = ["admin", "user", "test", "john", "jane"]
	return taken.includes(username.toLowerCase())
		? { error: "Username already taken" }
		: {}
}

// SYNC ONLY: Traditional synchronous validation (always supported)
const syncOnlyForm = defineForm({
	username: {
		label: "Username",
		description: "3-20 characters, alphanumeric only",
		validate: z.string()
			.min(3, "Too short (min 3)")
			.max(20, "Too long (max 20)")
			.regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore"),
	},
	email: {
		label: "Email",
		description: "Valid email format required",
		validate: z.string().email("Invalid email format"),
	},
})

// SYNC + ASYNC: Enhanced with optional async validation (new feature)
const enhancedForm = defineForm({
	username: {
		label: "Username",
		description: "3-20 characters + availability check",
		validate: z.string()
			.min(3, "Too short (min 3)")
			.max(20, "Too long (max 20)")
			.regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore"),
		// Optional async validation - only runs if sync passes
		validateAsync: checkUsernameAPI,
	},
	email: {
		label: "Email",
		description: "Valid format + domain verification",
		validate: z.string().email("Invalid email format"),
		// Optional async validation for enhanced checks
		validateAsync: async (email) => {
			await new Promise(resolve => setTimeout(resolve, 500))
			const domain = email.split("@")[1]?.toLowerCase()
			const blocked = ["tempmail.com", "10minutemail.com"]
			return blocked.includes(domain)
				? { error: "Please use a permanent email address" }
				: {}
		}
	},
})

function FormSection({ title, subtitle, children, highlight }: {
	title: string
	subtitle: string
	children: React.ReactNode
	highlight?: boolean
}) {
	return (
		<div style={{
			flex: 1,
			padding: "20px",
			border: highlight ? "2px solid #007bff" : "1px solid #ddd",
			borderRadius: "8px",
			backgroundColor: highlight ? "#f0f8ff" : "#fff",
			minWidth: "350px"
		}}>
			<h3 style={{ margin: "0 0 5px 0", color: highlight ? "#007bff" : "#333" }}>
				{title}
			</h3>
			<p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#666" }}>
				{subtitle}
			</p>
			{children}
		</div>
	)
}

function SyncOnlyForm() {
	const { getForm, getField } = useStandardSchema(syncOnlyForm)
	const [submitted, setSubmitted] = React.useState<any>(null)

	const handleSubmit = (data: any) => {
		setSubmitted(data)
		alert("✅ Format validation passed! (But no server-side checks performed)")
	}

	const formHandlers = getForm(handleSubmit)
	const usernameField = getField("username")
	const emailField = getField("email")

	return (
		<form {...formHandlers} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
			<div>
				<label htmlFor={`sync-${usernameField.name}`} style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
					{usernameField.label}
				</label>
				<input
					id={`sync-${usernameField.name}`}
					name={usernameField.name}
					defaultValue={usernameField.defaultValue}
					placeholder="Try: admin, john"
					style={{
						width: "100%",
						padding: "8px 12px",
						border: usernameField.error ? "2px solid #dc3545" : "1px solid #ced4da",
						borderRadius: "4px",
						fontSize: "14px",
						transition: "border-color 0.15s"
					}}
				/>
				{usernameField.error && (
					<div style={{ color: "#dc3545", fontSize: "13px", marginTop: "5px" }}>
						❌ {usernameField.error}
					</div>
				)}
				{!usernameField.error && usernameField.touched === "true" && (
					<div style={{ color: "#28a745", fontSize: "13px", marginTop: "5px" }}>
						✅ Format valid
					</div>
				)}
				<div style={{ fontSize: "12px", color: "#6c757d", marginTop: "3px" }}>
					{usernameField.description}
				</div>
			</div>

			<div>
				<label htmlFor={`sync-${emailField.name}`} style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
					{emailField.label}
				</label>
				<input
					id={`sync-${emailField.name}`}
					name={emailField.name}
					type="email"
					defaultValue={emailField.defaultValue}
					placeholder="your@email.com"
					style={{
						width: "100%",
						padding: "8px 12px",
						border: emailField.error ? "2px solid #dc3545" : "1px solid #ced4da",
						borderRadius: "4px",
						fontSize: "14px"
					}}
				/>
				{emailField.error && (
					<div style={{ color: "#dc3545", fontSize: "13px", marginTop: "5px" }}>
						❌ {emailField.error}
					</div>
				)}
			</div>

			<button type="submit" style={{
				padding: "10px 20px",
				backgroundColor: "#6c757d",
				color: "white",
				border: "none",
				borderRadius: "4px",
				fontSize: "16px",
				cursor: "pointer",
				marginTop: "10px"
			}}>
				Submit (Sync Validation Only)
			</button>

			{submitted && (
				<div style={{
					padding: "10px",
					backgroundColor: "#fff3cd",
					border: "1px solid #ffc107",
					borderRadius: "4px",
					fontSize: "14px"
				}}>
					✅ Form data is valid per sync rules. Server-side checks would happen on backend.
				</div>
			)}
		</form>
	)
}

function EnhancedForm() {
	const { getForm, getField } = useStandardSchema(enhancedForm)
	const [submitted, setSubmitted] = React.useState<any>(null)

	const handleSubmit = (data: any) => {
		setSubmitted(data)
		alert("🚀 ENHANCED: Both format AND availability verified! Ready for backend.")
	}

	const formHandlers = getForm(handleSubmit)
	const usernameField = getField("username")
	const emailField = getField("email")

	return (
		<form {...formHandlers} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
			<div>
				<label htmlFor={`enhanced-${usernameField.name}`} style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
					{usernameField.label}
					{usernameField.validating === "true" && (
						<span style={{
							marginLeft: "10px",
							color: "#007bff",
							fontSize: "13px",
							animation: "pulse 1.5s infinite"
						}}>
							⏳ Checking availability...
						</span>
					)}
				</label>
				<input
					id={`enhanced-${usernameField.name}`}
					name={usernameField.name}
					defaultValue={usernameField.defaultValue}
					placeholder="Try: admin, john (taken) or mike (available)"
					style={{
						width: "100%",
						padding: "8px 12px",
						border: usernameField.error
							? "2px solid #dc3545"
							: usernameField.validating === "true"
								? "2px solid #007bff"
								: "1px solid #ced4da",
						borderRadius: "4px",
						fontSize: "14px",
						transition: "border-color 0.15s"
					}}
				/>
				{usernameField.error && (
					<div style={{ color: "#dc3545", fontSize: "13px", marginTop: "5px" }}>
						❌ {usernameField.error}
					</div>
				)}
				{!usernameField.error && !usernameField.validating && usernameField.touched === "true" && usernameField.dirty === "true" && (
					<div style={{ color: "#28a745", fontSize: "13px", marginTop: "5px" }}>
						✅ Username available!
					</div>
				)}
				<div style={{ fontSize: "12px", color: "#6c757d", marginTop: "3px" }}>
					{usernameField.description}
				</div>
			</div>

			<div>
				<label htmlFor={`enhanced-${emailField.name}`} style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
					{emailField.label}
					{emailField.validating === "true" && (
						<span style={{
							marginLeft: "10px",
							color: "#007bff",
							fontSize: "13px",
							animation: "pulse 1.5s infinite"
						}}>
							⏳ Verifying domain...
						</span>
					)}
				</label>
				<input
					id={`enhanced-${emailField.name}`}
					name={emailField.name}
					type="email"
					defaultValue={emailField.defaultValue}
					placeholder="Try: test@tempmail.com (blocked)"
					style={{
						width: "100%",
						padding: "8px 12px",
						border: emailField.error
							? "2px solid #dc3545"
							: emailField.validating === "true"
								? "2px solid #007bff"
								: "1px solid #ced4da",
						borderRadius: "4px",
						fontSize: "14px"
					}}
				/>
				{emailField.error && (
					<div style={{ color: "#dc3545", fontSize: "13px", marginTop: "5px" }}>
						❌ {emailField.error}
					</div>
				)}
				{!emailField.error && !emailField.validating && emailField.touched === "true" && emailField.dirty === "true" && (
					<div style={{ color: "#28a745", fontSize: "13px", marginTop: "5px" }}>
						✅ Email domain verified!
					</div>
				)}
			</div>

			<button type="submit" style={{
				padding: "10px 20px",
				backgroundColor: "#007bff",
				color: "white",
				border: "none",
				borderRadius: "4px",
				fontSize: "16px",
				cursor: "pointer",
				marginTop: "10px",
				opacity: (usernameField.validating === "true" || emailField.validating === "true") ? 0.6 : 1,
			}} disabled={usernameField.validating === "true" || emailField.validating === "true"}>
				Submit (Sync + Async Validated)
			</button>

			{submitted && (
				<div style={{
					padding: "10px",
					backgroundColor: "#d4edda",
					border: "1px solid #28a745",
					borderRadius: "4px",
					fontSize: "14px"
				}}>
					🚀 All validations passed! Both format AND server checks complete.
				</div>
			)}
		</form>
	)
}

export function ComparisonDemo() {
	return (
		<div style={{ padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
			<style>{`
				@keyframes pulse {
					0% { opacity: 1; }
					50% { opacity: 0.5; }
					100% { opacity: 1; }
				}
			`}</style>

			<div style={{ textAlign: "center", marginBottom: "40px" }}>
				<h1 style={{ color: "#333", marginBottom: "10px" }}>
					useStandardSchema Validation Modes
				</h1>
				<p style={{ color: "#666", fontSize: "18px", marginBottom: "10px" }}>
					The library supports BOTH sync-only and sync+async validation
				</p>
				<p style={{
					backgroundColor: "#e8f5e9",
					color: "#2e7d32",
					padding: "10px 20px",
					borderRadius: "8px",
					display: "inline-block",
					fontWeight: "500"
				}}>
					✨ Choose the validation strategy that fits your needs - both are fully supported!
				</p>
			</div>

			<div style={{
				display: "flex",
				gap: "30px",
				justifyContent: "center",
				flexWrap: "wrap",
				maxWidth: "1000px",
				margin: "0 auto"
			}}>
				<FormSection
					title="📝 Sync-Only Mode"
					subtitle="Traditional validation (format, length, regex)"
				>
					<SyncOnlyForm />
				</FormSection>

				<FormSection
					title="🚀 Sync + Async Mode"
					subtitle="Enhanced with server-side checks"
					highlight
				>
					<EnhancedForm />
				</FormSection>
			</div>

			<div style={{
				maxWidth: "800px",
				margin: "40px auto 0",
				padding: "20px",
				backgroundColor: "#f8f9fa",
				borderRadius: "8px",
				fontSize: "14px",
				lineHeight: "1.6"
			}}>
				<h3 style={{ marginTop: 0, color: "#333" }}>Feature Comparison:</h3>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ borderBottom: "2px solid #dee2e6" }}>
							<th style={{ padding: "10px", textAlign: "left", color: "#495057" }}>Feature</th>
							<th style={{ padding: "10px", textAlign: "left", color: "#6c757d" }}>Sync-Only Mode</th>
							<th style={{ padding: "10px", textAlign: "left", color: "#007bff" }}>Sync + Async Mode</th>
						</tr>
					</thead>
					<tbody>
						<tr style={{ borderBottom: "1px solid #dee2e6" }}>
							<td style={{ padding: "10px", fontWeight: "500" }}>Format Validation</td>
							<td style={{ padding: "10px" }}>✅ Instant</td>
							<td style={{ padding: "10px" }}>✅ Instant</td>
						</tr>
						<tr style={{ borderBottom: "1px solid #dee2e6" }}>
							<td style={{ padding: "10px", fontWeight: "500" }}>Server Checks</td>
							<td style={{ padding: "10px" }}>❌ Not available</td>
							<td style={{ padding: "10px" }}>✅ Real-time</td>
						</tr>
						<tr style={{ borderBottom: "1px solid #dee2e6" }}>
							<td style={{ padding: "10px", fontWeight: "500" }}>Loading States</td>
							<td style={{ padding: "10px" }}>Not needed</td>
							<td style={{ padding: "10px" }}>Built-in via `validating`</td>
						</tr>
						<tr style={{ borderBottom: "1px solid #dee2e6" }}>
							<td style={{ padding: "10px", fontWeight: "500" }}>Use Case</td>
							<td style={{ padding: "10px" }}>Simple forms, offline apps</td>
							<td style={{ padding: "10px" }}>User registration, data verification</td>
						</tr>
						<tr style={{ borderBottom: "1px solid #dee2e6" }}>
							<td style={{ padding: "10px", fontWeight: "500" }}>Performance</td>
							<td style={{ padding: "10px" }}>No network calls</td>
							<td style={{ padding: "10px" }}>Smart cancellation & debouncing</td>
						</tr>
						<tr>
							<td style={{ padding: "10px", fontWeight: "500" }}>Implementation</td>
							<td style={{ padding: "10px" }}>Just `validate` field</td>
							<td style={{ padding: "10px" }}>Add optional `validateAsync`</td>
						</tr>
					</tbody>
				</table>
				<div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
					<strong style={{ color: "#0066cc" }}>💡 Both modes are first-class citizens!</strong>
					<ul style={{ marginTop: "10px", marginBottom: 0, paddingLeft: "20px" }}>
						<li>Use <strong>sync-only</strong> when you don't need server validation</li>
						<li>Add <strong>async validation</strong> only where it provides value</li>
						<li>Mix and match - some fields sync, others async</li>
						<li>Zero breaking changes - existing forms work unchanged</li>
					</ul>
				</div>
			</div>
		</div>
	)
}