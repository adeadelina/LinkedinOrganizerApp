import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Load FontAwesome
const fontAwesomeScript = document.createElement("script");
fontAwesomeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js";
fontAwesomeScript.defer = true;
document.head.appendChild(fontAwesomeScript);

// Load Inter font
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Add title
const titleElement = document.createElement("title");
titleElement.textContent = "LinkedIn Post Analyzer";
document.head.appendChild(titleElement);

createRoot(document.getElementById("root")!).render(<App />);
