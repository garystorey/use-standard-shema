import { defineForm, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

export const serverActionForm = defineForm({
        email: {
                label: "Email",
                validate: z.string().email("Enter a valid email address"),
        },
        password: {
                label: "Password",
                validate: z.string().min(8, "Password must be at least 8 characters"),
        },
})

export type ServerActionValues = TypeFromDefinition<typeof serverActionForm>
