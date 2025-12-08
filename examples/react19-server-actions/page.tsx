import { login } from "./actions"
import { ServerActionClientForm } from "./client-form"

export default function React19ServerActionExample() {
        return (
                <section className="stack">
                        <h1>React 19 + Server Actions</h1>
                        <p>
                                Client-side validation runs through <code>useStandardSchema</code>, and the server action
                                reuses the same rules before checking credentials.
                        </p>
                        <ServerActionClientForm action={login} />
                </section>
        )
}
