# vite-file-include

`vite-file-include` is an advanced Vite plugin designed to facilitate the inclusion of external HTML files, looping through data, and conditional rendering within your HTML files. It is particularly useful for managing repetitive HTML structures in static sites or templating environments.

## Features

- File inclusion with support for nested includes
- Looping through data arrays or JSON files
- Conditional rendering 
- Custom function support for advanced templating
- Evaluate JavaScript expressions directly in your templates.
- Asynchronous file processing
- Enhanced error handling and debugging


## Installation

Install the plugin via npm:

```bash
npm install vite-file-include
```

## Configuration

To use the plugin, import and configure it in your `vite.config.js`:

```javascript
import fileIncludePlugin from 'vite-file-include';

export default {
  plugins: [
    fileIncludePlugin({
      includePattern: "@@include",
      loopPattern: "@@loop",
      ifPattern: "@@if",
      baseDir: process.cwd(),
      context: {}, 
      customFunctions: {},
    }),
  ],
};
```

### Plugin Options

- `includePattern` (default: `@@include`): The pattern used to include external HTML files.
- `loopPattern` (default: `@@loop`): The pattern used to loop through data arrays.
- `ifPattern` (default: `@@if`): The pattern used to conditionally render content.
- `baseDir` (default: `process.cwd()`): The base directory for resolving paths.
- `context` (default: `{}`): An object containing global variables that can be used in includes, loops, and conditionals.
- `customFunctions` (default: {}): An object containing custom functions that can be used in your templates.

## Directives

### `@@include`

The `@@include` directive allows you to include the content of another HTML file within your main file.

**Syntax:**

```html
@@include('path/to/file.html');
```

**With Data:**

```html
@@include('path/to/file.html', { "key": "value" });
```

**Example** (`file.html`):

```html
<div>{{ key }}</div>
```

### `@@loop`

The `@@loop` directive enables you to repeat a block of HTML for each item in a data array or JSON file.

**Syntax:**

```html
@@loop('path/to/template.html', 'data.json');
```

**With Inline Data:**

```html
@@loop('path/to/template.html', [{ "key": "value" }, { "key": "another value" }]);
```

**Example Template** (`template.html`):

```html
<article>
  <h2>{{ key }}</h2>
</article>
```

### `@@if`

The `@@if` directive allows conditional rendering based on an expression.

**Syntax:**

```html
@@if(condition) {
  <!-- HTML content -->
};
```

**Example:**

```html
@@if(name === 'John') {
  <p>Welcome, John!</p>
};
```

## Custom Functions

You can define custom functions to use in your templates. These functions are passed to the plugin through the `customFunctions` option:

```javascript
fileIncludePlugin({
  customFunctions: {
    uppercase: (str) => str.toUpperCase(),
    currentYear: () => new Date().getFullYear()
  }
})
```

You can then use these functions in your templates:

```html
<p>{{ uppercase(name) }}</p>
<footer>&copy; {{ currentYear() }}</footer>
```


## JavaScript Expressions

You can use JavaScript expressions directly in your templates. For example:

```html 
<p>Current Year: {{ new Date().getFullYear() }}</p>
<p>Uppercase Text: {{ 'John'.toUpperCase() }}</p>
```

## Example Usage

Below is an example of how you might structure your HTML files using the plugin's directives:

```html
<!-- main.html -->
<html>
<body>
  @@include('header.html', { "title": "My Website" });

  @@loop('partials/article.html', 'data/articles.json');

  @@if(showFooter) {
    @@include('footer.html');
  };
</body>
</html>
```

### Example Files

- `header.html`:

```html
<header>
  <h1>{{ uppercase(title) }}</h1>
</header>
```

- `partials/article.html`:

```html
<article>
  <h2>{{ title }}</h2>
  <p>{{ content }}</p>
</article>
```

- `data/articles.json`:

```json
[
  {
    "title": "Article 1",
    "content": "Content of the first article."
  },
  {
    "title": "Article 2",
    "content": "Content of the second article."
  }
]
```

## Error Handling

If there is an error parsing JSON data or including a file, the plugin will log a detailed error message to the console. This helps in debugging while ensuring that your build process continues without interruption.
