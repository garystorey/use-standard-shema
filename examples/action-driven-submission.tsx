import {
  defineForm,
  type TypeFromDefinition,
  useStandardSchema,
} from "use-standard-schema"

const subscriptionForm = defineForm({
  email: {
    label: "Email",
    validate: (value: string) =>
      value.includes("@") ? value : "Enter a valid email address",
    defaultValue: "",
    description: "We'll send occasional updates.",
  },
})

async function submitSubscription(
  values: TypeFromDefinition<typeof subscriptionForm>,
  formData: FormData,
) {
  "use server"
  await sendSubscription(values, formData)
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending}>
      Subscribe
    </button>
  )
}

export function ActionDrivenSubscriptionForm() {
  const { getForm, getField, getStatus } = useStandardSchema(subscriptionForm)
  const form = getForm(undefined, submitSubscription)
  const email = getField("email")
  const status = getStatus()
  const describedBy = email.description ? email.describedById : undefined

  return (
    <form {...form} action={form.action}>
      <label htmlFor={email.name}>{email.label}</label>
      <input
        id={email.name}
        name={email.name}
        defaultValue={email.defaultValue}
        aria-describedby={describedBy}
        aria-errormessage={email.errorId}
      />
      {email.description ? (
        <p id={email.describedById}>{email.description}</p>
      ) : null}
      <p id={email.errorId} role="alert" aria-live="polite">
        {email.error}
      </p>
      <SubmitButton pending={status.pending} />
      {status.lastError ? <p role="alert">{status.lastError}</p> : null}
    </form>
  )
}

// Replace with your action wiring (Server Action, fetch call, etc.).
async function sendSubscription(
  values: TypeFromDefinition<typeof subscriptionForm>,
  formData: FormData,
) {
  console.log("Submitted values", values)
  console.log("Raw FormData entries", Array.from(formData.entries()))
}
