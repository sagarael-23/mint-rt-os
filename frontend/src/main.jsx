import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/inter"
import "@fontsource-variable/jetbrains-mono"
import "./index.css"
import App from "./App.jsx"
import { initTheme } from "@/hooks/useSettings"

// Terapkan tema tersimpan sebelum render pertama agar tidak berkedip.
initTheme()
document.title = "MINT RT OS"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
)