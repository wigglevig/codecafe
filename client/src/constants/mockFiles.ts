import { EditorLanguageKey } from "../types/editor";

export interface MockFile {
  name: string;
  language: EditorLanguageKey;
  content: string;
}

export const MOCK_FILES: { [key: string]: MockFile } = {
  "index.html": {
    name: "index.html",
    language: "html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeCafe Live Preview</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to CodeCafe!</h1>
    <p>Edit index.html, style.css, and script.js to see changes live.</p>
    <button id="myButton">Click Me!</button>

    <script src="script.js"></script>
</body>
</html>`,
  },
  "style.css": {
    name: "style.css",
    language: "css",
    content: `body {
    font-family: sans-serif;
    background-color: #f0f0f0;
    color: #333;
    padding: 20px;
    transition: background-color 0.3s ease;
}

h1 {
    color: #5a67d8; /* Indigo */
    text-align: center;
}

p {
    line-height: 1.6;
}

button {
    padding: 10px 15px;
    font-size: 1rem;
    background-color: #5a67d8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

button:hover {
    background-color: #434190;
}

/* Add a class for dark mode */
body.dark-mode {
    background-color: #2d3748; /* Gray 800 */
    color: #e2e8f0; /* Gray 200 */
}

body.dark-mode h1 {
    color: #9f7aea; /* Purple 400 */
}

body.dark-mode button {
    background-color: #9f7aea;
}

body.dark-mode button:hover {
    background-color: #805ad5; /* Purple 500 */
}`,
  },
  "script.js": {
    name: "script.js",
    language: "javascript",
    content: `console.log("CodeCafe script loaded!");

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('myButton');
    const body = document.body;

    if (button) {
        button.addEventListener('click', () => {
            alert('Button clicked!');
            // Toggle dark mode
            body.classList.toggle('dark-mode');
            console.log('Dark mode toggled');
        });
    } else {
        console.error('Button element not found!');
    }

    // Example: Log the current time every 5 seconds
    // setInterval(() => {
    //     console.log(\`Current time: \${new Date().toLocaleTimeString()}\`);
    // }, 5000);
});
`,
  },
};
