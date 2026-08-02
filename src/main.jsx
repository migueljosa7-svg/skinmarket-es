import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { sound } from "./utils/audio";

// PRODUCCIÓN: Silenciar TODA la consola y logs en producción
if (import.meta.env.PROD || process.env.NODE_ENV === 'production') {
  console.log = console.debug = console.info = console.warn = console.error = () => { };
}

// Activate audio context on first user gesture (click/touch anywhere)
// to avoid "AudioContext was not allowed to start" browser warning
const activateAudio = () => {
  sound.activateFromUserGesture();
  document.removeEventListener("click", activateAudio);
  document.removeEventListener("touchstart", activateAudio);
};
document.addEventListener("click", activateAudio, { once: true });
document.addEventListener("touchstart", activateAudio, { once: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
