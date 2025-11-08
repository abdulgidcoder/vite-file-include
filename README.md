# vite-file-include 🔗

`vite-file-include` is a modern **Vite plugin** for HTML templating that supports **file inclusion**, **looping**, **conditional rendering**, and **live hot-reload** without reloading the full page.  
It’s ideal for managing repetitive HTML structures in static sites or prototyping environments.

---

## 🚀 Features

- 🧩 **Nested file includes** with variable support  
- 🔁 **Loop rendering** for data arrays and JSON files  
- ⚙️ **Conditional blocks** using inline JavaScript  
- 🧠 **Custom helper functions** for advanced templating  
- ⚡ **JavaScript expression evaluation** inside templates  
- 🔄 **Hot reload support** — live updates without full page refresh  
- 🧵 **Async file processing** and better performance  
- 🪶 **Enhanced error reporting** with context hints

---

## 📦 Installation

```bash
npm install vite-file-include --save-dev
```

---

## ⚙️ Configuration

Add the plugin to your `vite.config.js`:

```js
import { defineConfig } from 'vite'
import fileIncludePlugin from 'vite-file-include'

export default defineConfig({
  plugins: [
    fileIncludePlugin({
      includePattern: "@@include",
      loopPattern: "@@loop",
      ifPattern: "@@if",
      baseDir: process.cwd(),
      context: {
        siteName: 'My Static Site'
      },
      customFunctions: {
        uppercase: (str) => str.toUpperCase(),
        currentYear: () => new Date().getFullYear()
      }
    })
  ]
})
```

---

## 🧩 Plugin Options

| Option | Type | Default | Description |
|--------|------|----------|-------------|
| **`includePattern`** | `string` | `@@include` | Directive for including files |
| **`loopPattern`** | `string` | `@@loop` | Directive for looping over arrays/JSON |
| **`ifPattern`** | `string` | `@@if` | Directive for conditional rendering |
| **`baseDir`** | `string` | `process.cwd()` | Base directory for resolving paths |
| **`context`** | `object` | `{}` | Global variables accessible in templates |
| **`customFunctions`** | `object` | `{}` | Custom functions available in templates |

---

## 🧱 Directives

### 🔹 `@@include`

Include another HTML file into your main file.

```html
@@include('partials/header.html')
```

With data:

```html
@@include('partials/header.html', { "title": "Home Page" })
```

**Example** (`partials/header.html`):

```html
<header>
  <h1>{{ title }}</h1>
</header>
```

---

### 🔹 `@@loop`

Repeat an HTML block for each item in a data array or JSON file.

```html
@@loop('partials/article.html', 'data/articles.json')
```

Or inline data:

```html
@@loop('partials/article.html', [
  { "title": "Article 1" },
  { "title": "Article 2" }
])
```

**Example** (`partials/article.html`):

```html
<article>
  <h2>{{ title }}</h2>
</article>
```

---

### 🔹 `@@if`

Conditionally render content based on an expression.

```html
@@if(showFooter) {
  @@include('partials/footer.html')
};
```

**Example:**

```html
@@if(user.isLoggedIn) {
  <p>Welcome, {{ user.name }}</p>
};
```

---

## 🧮 JavaScript Expressions

Use JS directly inside templates:

```html
<p>Year: {{ new Date().getFullYear() }}</p>
<p>Uppercase: {{ 'vite'.toUpperCase() }}</p>
```

---

## 🧰 Custom Functions

Define reusable helpers in your config:

```js
customFunctions: {
  uppercase: (str) => str.toUpperCase(),
  currentYear: () => new Date().getFullYear(),
}
```

Usage:

```html
<h1>{{ uppercase(title) }}</h1>
<footer>&copy; {{ currentYear() }}</footer>
```

---

## 🔄 Hot Reload

Unlike static include tools, `vite-file-include` supports **Vite’s HMR (Hot Module Replacement)**.

- Changes to included files update **instantly** in the browser  
- No full page reload  
- Works seamlessly with Vite’s dev server  

💡 Tip: Useful for quickly editing partials like headers, footers, and repeating components.

---

## 🧰 Example Project Structure

```
project/
├─ index.html
├─ partials/
│  ├─ header.html
│  ├─ footer.html
│  └─ article.html
├─ data/
│  └─ articles.json
└─ vite.config.js
```

**index.html**

```html
<html>
  <body>
    @@include('partials/header.html', { "title": "My Site" })
    @@loop('partials/article.html', 'data/articles.json')
    @@if(showFooter) { @@include('partials/footer.html') };
  </body>
</html>
```

---

## ⚠️ Error Handling

The plugin provides detailed error messages for:
- Missing include files  
- Invalid JSON syntax  
- Undefined variables  

Each error logs file path and directive line for easier debugging.

---

## 📄 License

MIT © 2025
