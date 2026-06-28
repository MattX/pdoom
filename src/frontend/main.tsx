import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DistPrototype from "./prototypes/DistPrototype";
import "./index.css";

const isProto = new URLSearchParams(window.location.search).has("proto");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isProto ? <DistPrototype /> : <App />}</React.StrictMode>
);
