import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Uygulamayı index.html içindeki #root öğesine bağlar.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
