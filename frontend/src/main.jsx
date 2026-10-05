import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/inter"
import "@fontsource-variable/jetbrains-mono"
import "./index.css"
import App from "./App.jsx"

// Desain hanya punya mode gelap.
document.documentElement.classList.add("dark")
document.title = "MINT RT OS"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
)