import React, { useState } from "react"
import ReactDOM from "react-dom/client"
import { defineForm, useStandardSchema, type TypeFromDefinition, type FieldDefinitionProps } from "../src/index"
import * as z from "zod"

// Validation schemas
const requiredString = z.string().min(1, "This field is required").max(100, "Too long (max 100 characters)")
const optionalString = z.string().max(500, "Too long (max 500 characters)").optional()
const emailSchema = z.string().email("Please enter a valid email address")
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
const ageSchema = z.string().regex(/^\d+$/, "Must be a number").refine(
  (val) => {
    const age = parseInt(val, 10)
    return age >= 18 && age <= 120
  },
  { message: "Age must be between 18 and 120" }
)
const urlSchema = z.string().url("Please enter a valid URL").optional()
const zipSchema = z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code (e.g., 12345 or 12345-6789)")

// Create the form definition with nested structure
const registrationForm = defineForm({
  personal: {
    firstName: {
      label: "First Name",
      description: "Your given name",
      validate: requiredString,
      defaultValue: "John",
    },
    lastName: {
      label: "Last Name",
      description: "Your family name",
      validate: requiredString,
      defaultValue: "Doe",
    },
    age: {
      label: "Age",
      description: "Must be 18 or older",
      validate: ageSchema,
      defaultValue: "25",
    },
    bio: {
      label: "Bio",
      description: "Tell us about yourself (optional)",
      validate: optionalString,
      defaultValue: "",
    },
  },
  contact: {
    email: {
      label: "Email Address",
      description: "We'll never share your email",
      validate: emailSchema,
      defaultValue: "john.doe@example.com",
    },
    phone: {
      label: "Phone Number",
      description: "Include country code (e.g., +1234567890)",
      validate: phoneSchema,
      defaultValue: "",
    },
    website: {
      label: "Website",
      description: "Your personal or company website (optional)",
      validate: urlSchema,
      defaultValue: "",
    },
  },
  address: {
    street1: {
      label: "Street Address",
      description: "Line 1",
      validate: requiredString,
      defaultValue: "",
    },
    street2: {
      label: "Apartment, Suite, etc.",
      description: "Line 2 (optional)",
      validate: optionalString,
      defaultValue: "",
    },
    city: {
      label: "City",
      validate: requiredString,
      defaultValue: "",
    },
    state: {
      label: "State/Province",
      validate: requiredString,
      defaultValue: "",
    },
    zipCode: {
      label: "ZIP/Postal Code",
      description: "Format: 12345 or 12345-6789",
      validate: zipSchema,
      defaultValue: "",
    },
    country: {
      label: "Country",
      validate: requiredString,
      defaultValue: "United States",
    },
  },
  preferences: {
    newsletter: {
      label: "Subscribe to Newsletter",
      description: "Get updates about new features",
      validate: z.string().optional(),
      defaultValue: "yes",
    },
    notifications: {
      label: "Email Notifications",
      description: "Receive email notifications",
      validate: z.string().optional(),
      defaultValue: "immediate",
    },
  },
})

type FormData = TypeFromDefinition<typeof registrationForm>

function DemoApp() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState<FormData | null>(null)

  const {
    getForm,
    getField,
    resetForm,
    getErrors,
    validate,
    touched,
    dirty,
    __dangerouslySetField,
  } = useStandardSchema(registrationForm)

  const handleSubmit = (data: FormData) => {
    console.log("Form submitted with data:", data)
    setSubmittedData(data)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
    }, 3000)
  }

  const form = getForm(handleSubmit)
  const allErrors = getErrors()

  // Get all field states for status display
  const fields = [
    "personal.firstName",
    "personal.lastName",
    "personal.age",
    "contact.email",
    "contact.phone",
    "address.street1",
    "address.city",
    "address.state",
    "address.zipCode",
  ]

  const touchedCount = fields.filter((f) => touched[f]).length
  const dirtyCount = fields.filter((f) => dirty[f]).length

  const handleValidateAll = async () => {
    const isValid = await validate()
    console.log("Form validation result:", isValid)
  }

  const handleValidateEmail = async () => {
    const isValid = await validate("contact.email")
    console.log("Email validation result:", isValid)
  }

  const handleSetDangerously = () => {
    __dangerouslySetField("personal.firstName", "Jane")
    __dangerouslySetField("personal.lastName", "Smith")
  }

  return (
    <div className="container">
      <div className="header">
        <h1>use-standard-schema Demo</h1>
        <p>Interactive demo showing all features of the form management hook</p>
      </div>

      <div className="form-card">
        <form {...form}>
          {submitted && (
            <div className="success-message">
              <span>✓</span>
              <span>Form submitted successfully! Check the console for data.</span>
            </div>
          )}

          <div className="status-bar">
            <h3>Form Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Touched Fields:</span>
                <span className={`status-value ${touchedCount > 0 ? 'true' : 'false'}`}>
                  {touchedCount} / {fields.length}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Dirty Fields:</span>
                <span className={`status-value ${dirtyCount > 0 ? 'true' : 'false'}`}>
                  {dirtyCount} / {fields.length}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Errors:</span>
                <span className={`status-value ${allErrors.length > 0 ? 'true' : 'false'}`}>
                  {allErrors.length}
                </span>
              </div>
            </div>
          </div>

          {allErrors.length > 0 && (
            <div className="all-errors" role="alert">
              <h3>Please fix the following errors:</h3>
              {allErrors.map(({ name, error, label }) => (
                <p key={name}>• {label}: {error}</p>
              ))}
            </div>
          )}

          {/* Personal Information Section */}
          <div className="form-section">
            <h2 className="section-title">
              <span>👤</span>
              Personal Information
            </h2>

            <div className="row">
              <Field field={getField("personal.firstName")} required />
              <Field field={getField("personal.lastName")} required />
            </div>

            <div className="row">
              <Field field={getField("personal.age")} required />
              <div></div>
            </div>

            <Field field={getField("personal.bio")} type="textarea" />
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <h2 className="section-title">
              <span>📧</span>
              Contact Information
            </h2>

            <Field field={getField("contact.email")} type="email" required />

            <div className="row">
              <Field field={getField("contact.phone")} type="tel" required />
              <Field field={getField("contact.website")} type="url" />
            </div>
          </div>

          {/* Address Section */}
          <div className="form-section">
            <h2 className="section-title">
              <span>🏠</span>
              Address
            </h2>

            <Field field={getField("address.street1")} required />
            <Field field={getField("address.street2")} />

            <div className="row">
              <Field field={getField("address.city")} required />
              <Field field={getField("address.state")} required />
            </div>

            <div className="row">
              <Field field={getField("address.zipCode")} required />
              <Field field={getField("address.country")} required />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="form-section">
            <h2 className="section-title">
              <span>⚙️</span>
              Preferences
            </h2>

            <SelectField
              field={getField("preferences.newsletter")}
              options={[
                { value: "yes", label: "Yes, subscribe me" },
                { value: "no", label: "No thanks" },
              ]}
            />

            <SelectField
              field={getField("preferences.notifications")}
              options={[
                { value: "immediate", label: "Immediate" },
                { value: "daily", label: "Daily digest" },
                { value: "weekly", label: "Weekly summary" },
                { value: "never", label: "Never" },
              ]}
            />
          </div>

          <div className="buttons">
            <button type="submit">Submit Form</button>
            <button type="reset">Reset Form</button>
            <button type="button" onClick={handleValidateAll}>Validate All</button>
            <button type="button" onClick={handleValidateEmail}>Validate Email</button>
            <button type="button" onClick={handleSetDangerously}>Set Dangerously</button>
          </div>
        </form>

        {submittedData && (
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>Submitted Data (in console):</h3>
            <pre style={{ fontSize: "0.75rem", overflow: "auto" }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// Field component
interface FieldProps {
  field: FieldDefinitionProps
  type?: "text" | "email" | "tel" | "url" | "textarea"
  required?: boolean
}

function Field({ field, type = "text", required = false }: FieldProps) {
  const hasError = field.error !== ""

  return (
    <div className={`field ${hasError ? "has-error" : ""}`}>
      <label htmlFor={field.name}>
        {field.label}
        {required && <span className="required">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          name={field.name}
          id={field.name}
          defaultValue={field.defaultValue}
          aria-describedby={field.describedById}
          aria-errormessage={field.errorId}
          aria-invalid={hasError}
        />
      ) : (
        <input
          type={type}
          name={field.name}
          id={field.name}
          defaultValue={field.defaultValue}
          aria-describedby={field.describedById}
          aria-errormessage={field.errorId}
          aria-invalid={hasError}
        />
      )}
      {field.description && (
        <p id={field.describedById} className="description">
          {field.description}
        </p>
      )}
      {hasError && (
        <p id={field.errorId} className="error">
          <span>⚠</span>
          {field.error}
        </p>
      )}
    </div>
  )
}

// Select field component
interface SelectFieldProps {
  field: ReturnType<typeof useStandardSchema>["getField"] extends (name: any) => infer R ? R : never
  options: Array<{ value: string; label: string }>
}

function SelectField({ field, options }: SelectFieldProps) {
  const hasError = field.error !== ""

  return (
    <div className={`field ${hasError ? "has-error" : ""}`}>
      <label htmlFor={field.name}>{field.label}</label>
      <select
        name={field.name}
        id={field.name}
        defaultValue={field.defaultValue}
        aria-describedby={field.describedById}
        aria-errormessage={field.errorId}
        aria-invalid={hasError}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.description && (
        <p id={field.describedById} className="description">
          {field.description}
        </p>
      )}
      {hasError && (
        <p id={field.errorId} className="error">
          <span>⚠</span>
          {field.error}
        </p>
      )}
    </div>
  )
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(<DemoApp />)