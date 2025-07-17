import { useStandardForm, InferType } from "useStandardSchema";
import { z } from "zod/v3";

const userFields = {
  firstName: {
    label: "First name",
    description: "Enter your given name",
    default: "",
    schema: z.string().min(1, "Too short"),
  },
  lastName: {
    label: "Last name",
    default: "",
    description: "Enter your surname",
    schema: z.string().min(1, "Required"),
  },
  email: {
    label: "Email",
    default: "",
    description: "Enter your email address",
    schema: z.string().email("Invalid address"),
  },
};

type MyFormData = InferType<typeof userFields>;

function handleSubmit(data: MyFormData) {
  console.log("Submitted:", data);
}

export default function App() {
  const { getForm, getField } = useStandardForm(userFields);

  const formProps = getForm(handleSubmit);
  const firstName = getField("firstName");
  const lastName = getField("lastName");
  const email = getField("email");

  return (
    <div className="App">
      <form {...formProps}>
        <div className="field">
          <label htmlFor={firstName.name}>{firstName.label}</label>
          <input id={firstName.name} name={firstName.name} />
          <output className="description" id={`${firstName.name}-message`}>
            {firstName.description}
          </output>
          <output className="error" id={`${firstName.name}-error`}>
            {firstName.error ?? ""}
          </output>
        </div>

        <div className="field">
          <label htmlFor={lastName.name}>{lastName.label}</label>
          <input id={lastName.name} name={lastName.name} />
          <output className="description" id={`${lastName.name}-message`}>
            {lastName.description}
          </output>
          <output className="error" id={`${lastName.name}-error`}>
            {lastName.error ?? ""}
          </output>
        </div>

        <div className="field">
          <label htmlFor={email.name}>{email.label}</label>
          <input id={firstName.name} name={email.name} />
          <output className="description" id={`${email.name}-message`}>
            {email.description}
          </output>
          <output className="error" id={`${email.name}-error`}>
            {email.error ?? ""}
          </output>
        </div>
        <button type="reset">Reset</button>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
