# vite-file-include

`vite-file-include` is a modern **Vite plugin** for HTML templating that supports **file inclusion**, **looping**, **conditional rendering**, and **true hot module replacement (HMR)** for rapid static site development.  
Perfect for managing repetitive HTML structures in static sites or prototyping environments.

---

## Features

- Nested file includes with variable support and data passing
- Loop rendering for data arrays and JSON files
- Conditional blocks using inline JavaScript expressions
- Custom helper functions for advanced templating
- JavaScript expression evaluation inside templates
- **True Hot Module Replacement (HMR)** - updates without full page reload
- Loop indices (\_index, \_total) for enhanced iteration control
- Circular include detection - prevents infinite loops
- Infinite loop protection with configurable iteration limits
- Enhanced error reporting with detailed file path logging
- Runtime API for dynamic function and context updates

---

## Installation

```bash
npm install vite-file-include --save-dev
```

Or manually copy the plugin file to your project.

---

## Configuration

Add the plugin to your `vite.config.js`:

```js
import { defineConfig } from "vite";
import fileIncludePlugin from "./vite-plugin-file-include.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    fileIncludePlugin({
      baseDir: "./src",
      context: {
        siteName: "My Static Site",
        showFooter: true,
      },
      customFunctions: {
        uppercase: (str) => str.toUpperCase(),
        currentYear: () => new Date().getFullYear(),
        loadSvg: function (svgFile, classes = "") {
          try {
            const svgPath = path.join(
              __dirname,
              "src/assets/images/icons",
              svgFile
            );
            if (!fs.existsSync(svgPath)) {
              console.error(`SVG not found: ${svgPath}`);
              return "";
            }
            const svgContent = fs
              .readFileSync(svgPath, "utf-8")
              .replace(/<\?xml.*?\?>/g, "")
              .replace(/<!--[\s\S]*?-->/g, "")
              .trim();
            return `<span class='app-icon ${classes}'>${svgContent}</span>`;
          } catch (error) {
            console.error(`Error loading SVG: ${svgFile}`, error);
            return "";
          }
        },
      },
    }),
  ],
});
```

---

## Plugin Options

| Option                | Type     | Default         | Description                                  |
| --------------------- | -------- | --------------- | -------------------------------------------- |
| **`includePattern`**  | `string` | `@@include`     | Directive for including files                |
| **`loopPattern`**     | `string` | `@@loop`        | Directive for looping over arrays/JSON       |
| **`ifPattern`**       | `string` | `@@if`          | Directive for conditional rendering          |
| **`baseDir`**         | `string` | `process.cwd()` | Base directory for resolving paths           |
| **`context`**         | `object` | `{}`            | Global variables accessible in all templates |
| **`customFunctions`** | `object` | `{}`            | Custom functions callable in templates       |

---

## Directives

### `@@include`

Include another HTML file into your main file.

**Basic usage:**

```html
@@include('partials/header.html')
```

**With data:**

```html
@@include('partials/header.html', { "title": "Home Page", "subtitle": "Welcome"
})
```

**Example** (`partials/header.html`):

```html
<header>
  <h1>{{ title }}</h1>
  <p>{{ subtitle }}</p>
</header>
```

**Nested includes:**

```html
<!-- main.html -->
@@include('partials/layout.html', { "page": "home" })

<!-- partials/layout.html -->
<div class="layout">
  @@include('sections/header.html')
  <main>{{ page }} content</main>
</div>
```

---

### `@@loop`

Repeat an HTML block for each item in a data array or JSON file.

**From JSON file:**

```html
@@loop('partials/article.html', 'data/articles.json')
```

**Inline data:**

```html
@@loop('partials/card.html', [ { "title": "Card 1", "description": "First card"
}, { "title": "Card 2", "description": "Second card" } ])
```

**Example** (`partials/article.html`):

```html
<article class="post">
  <h2>{{ title }}</h2>
  <p>{{ description }}</p>
  <span>{{ author }} - {{ date }}</span>
  <small>Item {{ _index + 1 }} of {{ _total }}</small>
</article>
```

**Loop variables:**

- `{{ _index }}` - Current item index (0-based)
- `{{ _total }}` - Total number of items

**Example** (`data/articles.json`):

```json
[
  {
    "title": "Getting Started with Vite",
    "description": "Learn the basics",
    "author": "John Doe",
    "date": "2025-01-15"
  },
  {
    "title": "Advanced Templating",
    "description": "Pro tips and tricks",
    "author": "Jane Smith",
    "date": "2025-01-20"
  }
]
```

---

### `@@if`

Conditionally render content based on JavaScript expressions.

**Basic condition:**

```html
@@if(showFooter) { @@include('partials/footer.html') }
```

**Complex conditions:**

```html
@@if(user.isLoggedIn && user.role === 'admin') {
<div class="admin-panel">
  <h2>Admin Controls</h2>
</div>
}
```

**With includes and loops:**

```html
@@if(articles.length > 0) { @@loop('partials/article.html',
'data/articles.json') }
```

---

## Variable Interpolation

Use double curly braces `{{ }}` for dynamic content:

**Simple variables:**

```html
<h1>{{ title }}</h1>
<p>{{ description }}</p>
```

**JavaScript expressions:**

```html
<p>Year: {{ new Date().getFullYear() }}</p>
<p>Uppercase: {{ 'vite'.toUpperCase() }}</p>
<p>Math: {{ 5 + 3 * 2 }}</p>
<p>Ternary: {{ isActive ? 'Active' : 'Inactive' }}</p>
```

**Accessing nested properties:**

```html
<p>{{ user.profile.name }}</p>
<p>{{ config.api.endpoint }}</p>
```

---

## Custom Functions

Define reusable helper functions in your config:

```js
customFunctions: {
  uppercase: (str) => str.toUpperCase(),
  currentYear: () => new Date().getFullYear(),
  formatDate: (date) => new Date(date).toLocaleDateString(),
  truncate: (str, len) => str.length > len ? str.slice(0, len) + '...' : str,
  loadSvg: (file, classes = '') => {
    // Load and inline SVG files
  }
}
```

**Usage in templates:**

```html
<h1>{{ uppercase(title) }}</h1>
<footer>&copy; {{ currentYear() }} {{ siteName }}</footer>
<p>{{ formatDate('2025-01-15') }}</p>
<p>{{ truncate(description, 100) }}</p>
<button>{{ loadSvg('icon-search.svg', 'icon-sm') }} Search</button>
```

---

## Hot Module Replacement (HMR)

The plugin features **true HMR** that updates your HTML without full page reload:

**What makes it special:**

- Updates HTML changes instantly without page reload
- Preserves JavaScript state (variables, counters, timers)
- Maintains scroll position during updates
- Keeps form data intact (no lost input)
- Tracks dependencies between HTML files
- Smart DOM content replacement
- Automatic fallback to full reload on errors

**How it works:**

1. Edit any HTML file (main pages or partials)
2. Plugin detects the change and invalidates affected modules
3. Sends custom HMR event to the browser
4. Browser fetches updated HTML via fetch
5. Parses new HTML with DOMParser
6. Replaces body content while preserving state
7. Restores scroll position automatically
8. Re-executes necessary scripts

**Technical implementation:**

```javascript
// Automatically injected HMR client
if (import.meta.hot) {
  import.meta.hot.on("vite-file-include:update", async (data) => {
    // Fetch updated HTML
    const response = await fetch(window.location.pathname);
    const html = await response.text();

    // Parse and update body
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, "text/html");

    // Preserve state and update content
    const scrollPos = window.scrollY;
    document.body.innerHTML = newDoc.body.innerHTML;
    window.scrollTo(0, scrollPos);
  });
}
```

**Console output:**

```
[vite-file-include] HTML changed: header.html
[HMR] HTML file updated: header.html
[HMR] Content updated successfully
```

**Testing HMR:**

Add a counter to test state preservation:

```html
<button onclick="this.textContent = parseInt(this.textContent || 0) + 1">
  0
</button>
```

Click it several times, then edit any HTML file. The counter value will remain unchanged, proving no page reload occurred.

**Custom HMR events:**

Listen for updates in your JavaScript:

```javascript
if (import.meta.hot) {
  import.meta.hot.on("vite-file-include:update", (data) => {
    console.log("HTML updated:", data.file, data.timestamp);
    // Your custom logic here
  });
}
```

**Error handling:**

If HMR update fails for any reason, the plugin automatically falls back to a full page reload to ensure the page is never in a broken state.

---

## Runtime API

Access plugin features at runtime:

```javascript
// In vite.config.js
const plugin = fileIncludePlugin(options);

// Add functions dynamically
plugin.api.addFunction("customHelper", (val) => val * 2);

// Update context at runtime
plugin.api.updateContext({ newVar: "value" });

// Access processor directly
const processor = plugin.api.processor;
```

---

## Example Project Structure

```
project/
├─ src/
│  ├─ assets/
│  │  └─ images/
│  │     └─ icons/
│  │        ├─ calendar.svg
│  │        └─ search.svg
│  ├─ data/
│  │  ├─ articles.json
│  │  └─ team.json
│  ├─ partials/
│  │  ├─ layouts/
│  │  │  ├─ header.html
│  │  │  └─ footer.html
│  │  ├─ sections/
│  │  │  ├─ hero.html
│  │  │  └─ features.html
│  │  └─ components/
│  │     ├─ card.html
│  │     └─ button.html
│  ├─ index.html
│  └─ about.html
├─ vite.config.js
└─ vite-plugin-file-include.js
```

### Example Files

**src/index.html:**

```html
<!DOCTYPE html>
<html lang="en">
  @@include('partials/layouts/header.html', { "title": "Home - My Site",
  "metaDescription": "Welcome to our site" })
  <body>
    @@include('partials/sections/hero.html')

    <section class="articles">
      <h2>Latest Articles</h2>
      @@loop('partials/components/card.html', 'data/articles.json')
    </section>

    @@if(showTeamSection) {
    <section class="team">
      <h2>Our Team</h2>
      @@loop('partials/components/team-member.html', 'data/team.json')
    </section>
    } @@include('partials/layouts/footer.html')
  </body>
</html>
```

**src/partials/components/card.html:**

```html
<article class="card">
  <div class="card-icon">{{ loadSvg(icon, 'icon-large') }}</div>
  <h3>{{ title }}</h3>
  <p>{{ truncate(description, 120) }}</p>
  <time>{{ formatDate(date) }}</time>
</article>
```

**src/data/articles.json:**

```json
[
  {
    "icon": "calendar.svg",
    "title": "Getting Started",
    "description": "Learn how to set up your first project with this comprehensive guide covering all the basics you need to know.",
    "date": "2025-01-15"
  },
  {
    "icon": "search.svg",
    "title": "Advanced Features",
    "description": "Explore powerful features and best practices for building scalable applications.",
    "date": "2025-01-20"
  }
]
```

---

## 🛡️ Error Handling & Security

### Circular Include Detection

The plugin automatically detects and prevents circular includes:

```
⚠️ Circular include detected: /path/to/file.html
```

### Error Messages

Detailed error logging for common issues:

- **Missing files:** `Failed to include file: /path/to/missing.html`
- **Invalid JSON:** `Failed to parse JSON data: {...}`
- **Failed expressions:** `Failed to evaluate expression: invalidVar`
- **Missing SVGs:** `SVG file not found at path: /path/to/icon.svg`

### Security Note

The plugin uses `new Function()` to evaluate expressions. Only use trusted content in your templates and avoid user-generated input in template expressions.

---

## 📚 Usage Examples

### Basic Template Usage

**Simple page with includes:**

```html
<!DOCTYPE html>
<html>
  @@include('partials/head.html', { "pageTitle": "Home" })
  <body>
    @@include('partials/header.html')
    <main>
      <h1>{{ pageTitle }}</h1>
    </main>
    @@include('partials/footer.html')
  </body>
</html>
```

### Loop with JSON File

**Display blog posts:**

```html
<section class="blog">
  <h2>Latest Posts</h2>
  <div class="posts-grid">
    @@loop('partials/post-card.html', 'data/posts.json')
  </div>
</section>
```

**data/posts.json:**

```json
[
  {
    "title": "Getting Started with Vite",
    "excerpt": "Learn the basics of Vite...",
    "author": "John Doe",
    "date": "2025-01-15",
    "image": "vite-intro.jpg"
  }
]
```

**partials/post-card.html:**

```html
<article class="post-card">
  <img src="/images/{{ image }}" alt="{{ title }}" />
  <h3>{{ title }}</h3>
  <p>{{ excerpt }}</p>
  <div class="meta">
    <span>{{ author }}</span>
    <time>{{ formatDate(date) }}</time>
  </div>
</article>
```

### Inline Loop Data

**Quick lists without JSON files:**

```html
<ul class="features">
  @@loop('partials/feature-item.html', [ { "icon": "speed.svg", "title": "Fast",
  "desc": "Lightning quick builds" }, { "icon": "power.svg", "title":
  "Powerful", "desc": "Full ES6+ support" }, { "icon": "simple.svg", "title":
  "Simple", "desc": "Easy configuration" } ])
</ul>
```

### Conditional Rendering

**Show/hide sections based on config:**

```html
@@if(showBanner) {
<div class="banner">
  <p>{{ bannerMessage }}</p>
</div>
} @@if(userLoggedIn) { @@include('partials/dashboard.html') }
@@if(!userLoggedIn) { @@include('partials/login-form.html') }
```

### Custom Functions in Templates

**Using helper functions:**

```html
<header>
  <h1>{{ uppercase(siteName) }}</h1>
  <p>&copy; {{ currentYear() }} All rights reserved</p>
</header>

<article>
  <p>{{ truncate(longDescription, 150) }}</p>
  <time>{{ formatDate(publishDate) }}</time>
</article>

<button>{{ loadSvg('icons/search.svg', 'icon-sm') }} Search</button>
```

### Nested Includes

**Build complex layouts:**

```html
<!-- index.html -->
@@include('layouts/base.html', { "pageClass": "home-page", "contentFile":
"sections/home-content.html" })

<!-- layouts/base.html -->
<!DOCTYPE html>
<html>
  @@include('partials/head.html')
  <body class="{{ pageClass }}">
    @@include('partials/header.html')
    <main>@@include(contentFile)</main>
    @@include('partials/footer.html')
  </body>
</html>
```

### Dynamic SVG Icons

**Load SVG icons inline:**

```html
<!-- Configuration in vite.config.js -->
customFunctions: { loadSvg: (file, classes = '') => { const svgPath =
path.join(__dirname, 'src/assets/icons', file); const svg =
fs.readFileSync(svgPath, 'utf-8') .replace(/<\?xml.*?\?>/g, '') .trim(); return
`<span class="icon ${classes}">${svg}</span>`; } }

<!-- Usage in HTML -->
<nav>
  <a href="/">{{ loadSvg('home.svg', 'nav-icon') }} Home</a>
  <a href="/about">{{ loadSvg('info.svg', 'nav-icon') }} About</a>
  <a href="/contact">{{ loadSvg('mail.svg', 'nav-icon') }} Contact</a>
</nav>
```

### Combining Features

**Complex page structure:**

```html
<!DOCTYPE html>
<html>
  @@include('partials/head.html', { "title": "Products" })
  <body>
    @@include('partials/header.html')

    <main>
      <section class="hero">
        @@include('sections/hero.html', { "heading": "Our Products",
        "subheading": "Discover amazing solutions" })
      </section>

      @@if(showFeatured) {
      <section class="featured">
        <h2>Featured Products</h2>
        @@loop('partials/product-card.html', 'data/featured.json')
      </section>
      }

      <section class="all-products">
        <h2>All Products</h2>
        <div class="product-grid">
          @@loop('partials/product-card.html', 'data/products.json')
        </div>
      </section>

      @@if(showNewsletter) { @@include('sections/newsletter.html') }
    </main>

    @@include('partials/footer.html')
  </body>
</html>
```

## 💡 Tips & Best Practices

1. **Organize partials by purpose:**

   - `layouts/` for page structure (header, footer)
   - `sections/` for page sections (hero, features)
   - `components/` for reusable components (cards, buttons)

2. **Use JSON files for large datasets** instead of inline arrays

3. **Keep context data in vite.config.js** for site-wide variables

4. **Create utility functions** for common operations (date formatting, string manipulation)

5. **Use meaningful variable names** in your JSON data

6. **Test partials independently** before including them in larger pages

7. **Leverage conditionals** to create different layouts for different pages

---

## 🔧 Advanced Usage

### Dynamic SVG Icons

```html
<button class="btn">
  {{ loadSvg('icon-' + buttonType + '.svg', 'btn-icon') }} {{ buttonLabel }}
</button>
```

### Nested Loops

```html
@@loop('partials/category.html', 'data/categories.json')

<!-- partials/category.html -->
<div class="category">
  <h3>{{ name }}</h3>
  @@loop('partials/item.html', items)
</div>
```

### Conditional Loops

```html
@@if(articles && articles.length > 0) {
<div class="articles-grid">
  @@loop('partials/article.html', 'data/articles.json')
</div>
}
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

## 📄 License

MIT © 2025

---

## 🔗 Related

- [Vite](https://vitejs.dev/)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)

---

**Made with ❤️ for the Vite community**
