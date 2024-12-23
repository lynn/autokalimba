import { render } from "preact";
import "./index.css";
import { App } from "./App.tsx";

const app = document.getElementById("app");
if (app) {
	render(<App />, app);
}
