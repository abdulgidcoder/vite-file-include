import fs from "fs";
import path from "path";

class FileIncludeProcessor {
  constructor(options = {}) {
    this.includePattern = options.includePattern || "@@include";
    this.loopPattern = options.loopPattern || "@@loop";
    this.ifPattern = options.ifPattern || "@@if";
    this.baseDir = options.baseDir || process.cwd();
    this.context = options.context || {};
    this.customFunctions = options.customFunctions || {};

    // Unified regex patterns
    this.patterns = {
      include: null,
      loop: null,
      conditional: null,
      variable: /\{\{\s*(.*?)\s*\}\}/g
    };

    this.initializePatterns();
  }

  /**
   * Initialize unified regex patterns
   */
  initializePatterns() {
    // Unified pattern for directives: @@directive('arg1', arg2)
    this.patterns.include = new RegExp(
      `${this.escapeRegex(this.includePattern)}\\(\\s*['"]([^'"]+)['"]\\s*(?:,\\s*({[\\s\\S]*?}))?\\s*\\)\\s*;?`,
      "g"
    );

    this.patterns.loop = new RegExp(
      `${this.escapeRegex(this.loopPattern)}\\(\\s*['"]([^'"]+)['"]\\s*,\\s*(\\[[\\s\\S]*?\\]|['"][^'"]+['"])\\s*\\)\\s*;?`,
      "g"
    );

    this.patterns.conditional = new RegExp(
      `${this.escapeRegex(this.ifPattern)}\\s*\\(([^)]+)\\)\\s*{([\\s\\S]*?)};?`,
      "g"
    );
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Main processing entry point
   */
  process(content, dir, visited = new Set(), localContext = this.context) {
    let newContent = content;
    let lastContent;
    let iterations = 0;
    const maxIterations = 100;

    do {
      lastContent = newContent;
      newContent = this.processDirective('include', newContent, dir, visited, localContext);
      newContent = this.processDirective('loop', newContent, dir, visited, localContext);
      newContent = this.processDirective('conditional', newContent, dir, visited, localContext);

      iterations++;
      if (iterations >= maxIterations) {
        console.warn(`⚠️ Maximum iterations (${maxIterations}) reached. Possible infinite loop.`);
        break;
      }
    } while (newContent !== lastContent);

    // Final pass to replace any remaining variables
    newContent = this.injectData(newContent, localContext);

    return newContent;
  }

  /**
   * Unified directive processor
   */
  processDirective(type, content, dir, visited, localContext) {
    const pattern = this.patterns[type];
    if (!pattern) {
      console.error(`Unknown directive type: ${type}`);
      return content;
    }

    return content.replace(pattern, (...args) => {
      try {
        switch (type) {
          case 'include':
            return this.handleInclude(args, dir, visited, localContext);
          case 'loop':
            return this.handleLoop(args, dir, visited, localContext);
          case 'conditional':
            return this.handleConditional(args, dir, visited, localContext);
          default:
            return args[0];
        }
      } catch (error) {
        console.error(`Error processing ${type}:`, error.message);
        return ""; // Return empty string on error to avoid outputting broken directives
      }
    });
  }

  /**
   * Handle @@include directive
   */
  handleInclude(args, dir, visited, localContext) {
    const [match, filePath, jsonData] = args;


    const includePath = path.resolve(dir, filePath);

    if (visited.has(includePath)) {
      console.warn(`⚠️ Circular include detected: ${includePath}`);
      return "";
    }

    visited.add(includePath);

    const data = jsonData ? this.parseJSON(jsonData, 'include data') : {};
    const fileContent = this.readFile(includePath);

    if (fileContent === null) return "";

    const newContext = { ...localContext, ...data };


    const processedContent = this.injectData(fileContent, newContext);
    return this.process(
      processedContent,
      path.dirname(includePath),
      visited,
      newContext
    );
  }

  /**
   * Handle @@loop directive
   */
  handleLoop(args, dir, visited, localContext) {
    const [match, filePath, jsonArrayOrFilePath] = args;
    const loopPath = path.resolve(dir, filePath);

    const dataArray = this.parseLoopData(jsonArrayOrFilePath, dir);
    if (!dataArray) return "";

    const loopTemplate = this.readFile(loopPath);
    if (loopTemplate === null) return "";

    return dataArray
      .map((data, index) => {
        const loopContext = {
          ...localContext,
          ...data,
          _index: index,
          _total: dataArray.length
        };

        const loopContent = this.injectData(loopTemplate, loopContext);
        return this.process(loopContent, dir, visited, loopContext);
      })
      .join("");
  }

  /**
   * Handle @@if directive
   */
  handleConditional(args, dir, visited, localContext) {
    const [match, condition, body] = args;


    const result = this.evaluateCondition(condition, localContext);

    if (!result) return "";

    return this.process(body.trim(), dir, visited, localContext);
  }

  /**
   * Parse loop data from inline JSON or file path
   */
  parseLoopData(jsonArrayOrFilePath, dir) {
    try {
      const trimmed = jsonArrayOrFilePath.trim();

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
      }

      const jsonFilePath = path.resolve(dir, trimmed.replace(/['"]/g, ""));
      const jsonContent = this.readFile(jsonFilePath);

      if (jsonContent === null) return null;

      return JSON.parse(jsonContent);
    } catch (error) {
      console.error(`Failed to parse loop data: ${jsonArrayOrFilePath}`, error.message);
      return null;
    }
  }

  /**
   * Read file with error handling
   */
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`Failed to read file: ${filePath}`, error.message);
      return null;
    }
  }

  /**
   * Parse JSON with error handling
   */
  parseJSON(jsonString, context = 'data') {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`Failed to parse JSON ${context}: ${jsonString}`, error.message);
      return {};
    }
  }

  /**
   * Inject data into {{ }} expressions
   */
  injectData(content, data) {
    return content.replace(this.patterns.variable, (match, expression) => {
      try {
        const result = this.evaluateExpression(expression, data);
        return result !== undefined && result !== null ? result : match;
      } catch (error) {
        console.error(`Failed to evaluate expression: ${expression}`, error.message);
        return match;
      }
    });
  }

  /**
   * Evaluate JavaScript expression with context
   */
  evaluateExpression(expression, data) {
    const context = { ...data, ...this.customFunctions };
    return new Function("context", `with (context) { return ${expression}; }`)(context);
  }

  /**
   * Evaluate conditional expression
   */
  evaluateCondition(condition, localContext) {


    try {
      const context = { ...this.context, ...localContext, ...this.customFunctions };
      return new Function("context", `with (context) { return ${condition}; }`)(context);
    } catch (error) {
      console.error(`Error evaluating condition: "${condition}"`, error.message);
      return false;
    }
  }

  /**
   * Add custom function at runtime
   */
  addFunction(name, fn) {
    this.customFunctions[name] = fn;
  }

  /**
   * Update context at runtime
   */
  updateContext(newContext) {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Reset processor state
   */
  reset() {
    this.context = {};
    this.customFunctions = {};
  }
}

/**
 * Vite Plugin Factory
 */
function fileIncludePlugin(options = {}) {
  const processor = new FileIncludeProcessor(options);
  const dependencyGraph = new Map(); // Track file dependencies
  let server;

  return {
    name: "vite-plugin-file-include",

    configureServer(viteServer) {
      server = viteServer;

      // Add HMR client code injection
      viteServer.middlewares.use((req, res, next) => {
        next();
      });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const processed = processor.process(html, processor.baseDir, new Set(), processor.context);

        // Inject HMR client script
        const hmrScript = `
          <script type="module">
            if (import.meta.hot) {
              import.meta.hot.on('vite-file-include:update', async (data) => {
            
                
                try {
                  // Fetch the updated page
                  const response = await fetch(window.location.pathname);
                  const html = await response.text();
                  
                  // Parse the new HTML
                  const parser = new DOMParser();
                  const newDoc = parser.parseFromString(html, 'text/html');
                  
                  // Update body content without full reload
                  const currentBody = document.body;
                  const newBody = newDoc.body;
                  
                  // Preserve scroll position
                  const scrollPos = window.scrollY;
                  
                  // Replace body content
                  currentBody.innerHTML = newBody.innerHTML;
                  
                  // Copy body attributes
                  Array.from(newBody.attributes).forEach(attr => {
                    currentBody.setAttribute(attr.name, attr.value);
                  });
                  
                  // Restore scroll position
                  window.scrollTo(0, scrollPos);
                  
                  // Re-execute scripts if needed
                  const scripts = currentBody.querySelectorAll('script:not([type="module"])');
                  scripts.forEach(script => {
                    if (script.src) {
                      const newScript = document.createElement('script');
                      Array.from(script.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                      });
                      script.parentNode.replaceChild(newScript, script);
                    }
                  });
                  
              
                } catch (error) {
                  console.error('[HMR] Update failed, reloading page:', error);
                  window.location.reload();
                }
              });
            }
          </script>
        `;

        // Inject before closing body tag
        if (processed.includes('</body>')) {
          return processed.replace('</body>', `${hmrScript}</body>`);
        }

        return processed;
      }
    },

    transform(code, id) {
      if (id.endsWith(".html")) {
        // Track this file
        if (!dependencyGraph.has(id)) {
          dependencyGraph.set(id, new Set());
        }

        return {
          code: processor.process(code, processor.baseDir),
        };
      }
      return null;
    },

    handleHotUpdate({ file, server, modules }) {
      if (file.endsWith(".html")) {


        // Find all modules that might be affected
        const affectedModules = [];

        modules.forEach(mod => {
          if (mod.file && mod.file.endsWith('.html')) {
            affectedModules.push(mod);
          }
        });

        // Invalidate modules
        affectedModules.forEach(mod => {
          server.moduleGraph.invalidateModule(mod);
        });

        // Send custom HMR update event
        server.ws.send({
          type: 'custom',
          event: 'vite-file-include:update',
          data: {
            file: path.basename(file),
            path: file,
            timestamp: Date.now()
          }
        });

        // Return empty array to prevent default full reload
        return [];
      }
    },

    // Expose processor for advanced usage
    api: {
      processor,
      addFunction: (name, fn) => processor.addFunction(name, fn),
      updateContext: (ctx) => processor.updateContext(ctx),
    },
  };
}

export default fileIncludePlugin;
export { FileIncludeProcessor };