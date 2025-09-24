import React from "react"
import ReactDOM from "react-dom/client"
import { ComparisonDemo } from "./comparison-demo"
import { AsyncValidationDemo } from "./async-validation-demo"

function App() {
	const [demo, setDemo] = React.useState<"comparison" | "async">("comparison")

	return (
		<div>
			<div style={{
				backgroundColor: "#f8f9fa",
				padding: "15px",
				borderBottom: "1px solid #dee2e6",
				position: "sticky",
				top: 0,
				zIndex: 100
			}}>
				<div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "center" }}>
					<button
						onClick={() => setDemo("comparison")}
						style={{
							padding: "8px 16px",
							backgroundColor: demo === "comparison" ? "#007bff" : "#fff",
							color: demo === "comparison" ? "#fff" : "#007bff",
							border: "1px solid #007bff",
							borderRadius: "4px",
							cursor: "pointer",
							fontWeight: demo === "comparison" ? "bold" : "normal"
						}}
					>
						📊 Side-by-Side Comparison
					</button>
					<button
						onClick={() => setDemo("async")}
						style={{
							padding: "8px 16px",
							backgroundColor: demo === "async" ? "#007bff" : "#fff",
							color: demo === "async" ? "#fff" : "#007bff",
							border: "1px solid #007bff",
							borderRadius: "4px",
							cursor: "pointer",
							fontWeight: demo === "async" ? "bold" : "normal"
						}}
					>
						🚀 Full Async Demo
					</button>
				</div>
			</div>

			{demo === "comparison" ? <ComparisonDemo /> : <AsyncValidationDemo />}
		</div>
	)
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
)