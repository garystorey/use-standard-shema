import { StandardSchemaV1 } from "@standard-schema/spec";

/** ----------------------------------------------------------------
 * Typed schema helpers compatible with Standard Schema V1
 * ---------------------------------------------------------------- */
interface StringSchema extends StandardSchemaV1<string> {
    type: "string";
    message: string;
}

export function string(message: string = "Required"): StringSchema {
    return {
        type: "string",
        message,
        "~standard": {
            version: 1,
            vendor: "tests",
            validate(value) {
                return typeof value === "string" && value.trim().length > 0
                    ? { value }
                    : { issues: [{ message }] };
            },
        },
    };
}

export function email(message: string = "Invalid email"): StringSchema {
    return {
        type: "string",
        message,
        "~standard": {
            version: 1,
            vendor: "tests",
            validate(value) {
                if (typeof value !== "string") return { issues: [{ message }] };
                return /@/.test(value) ? { value } : { issues: [{ message }] };
            },
        },
    };
}
