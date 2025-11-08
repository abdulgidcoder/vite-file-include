import fs from "fs";
import path from "path";

function fileIncludePlugin(options = {}) {
  const {
    includePattern = "@@include",
    loopPattern = "@@loop",
    ifPattern = "@@if",
    baseDir = process.cwd(),
    context = {},
    customFunctions = {},
  } = options;

  // Cache for file reads
  const fileCache = new Map();

  const readFileCached = (filePath) => {
    if (!fileCache.has(filePath)) {
      fileCache.set(filePath, fs.readFileSync(filePath, "utf-8"));
    }
    return fileCache.get(filePath);
  };

  return {
    name: "vite-plugin-file-include",

    transformIndexHtml(html) {
      return processIncludes(
        html,
        baseDir,
        includePattern,
        loopPattern,
        ifPattern,
        context,
        customFunctions,
        new Set(),
        readFileCached
      );
    },

    transform(code, id) {
      if (id.endsWith(".html")) {
        return {
          code: processIncludes(
            code,
            baseDir,
            includePattern,
            loopPattern,
            ifPattern,
            context,
            customFunctions,
            new Set(),
            readFileCached
          ),
        };
      }
      return { code };
    },

    handleHotUpdate({ file, server, modules }) {
      if (file.endsWith(".html")) {
        const mod = modules.find((m) => m.file && m.file.endsWith(".html"));

        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({
            type: "update",
            updates: [
              {
                type: "js-update",
                path: mod.url,
                acceptedPath: mod.url,
                timestamp: Date.now(),
              },
            ],
          });
        } else {
          server.ws.send({
            type: "custom",
            event: "vite-file-include:update",
            data: { file },
          });
        }

        return [];
      }
    },
  };
}

/* ---------------- Core Processing ---------------- */

function processIncludes(
  content,
  dir,
  includePattern,
  loopPattern,
  ifPattern,
  context,
  customFunctions,
  visited,
  readFileCached
) {
  let lastContent;
  do {
    lastContent = content;
    content = processIncludesWithPattern(
      content,
      dir,
      includePattern,
      loopPattern,
      ifPattern,
      context,
      customFunctions,
      visited,
      readFileCached
    );
    content = processLoops(
      content,
      dir,
      loopPattern,
      context,
      customFunctions,
      includePattern,
      ifPattern,
      visited,
      readFileCached
    );
    content = processConditionals(
      content,
      dir,
      ifPattern,
      includePattern,
      loopPattern,
      context,
      customFunctions,
      visited,
      readFileCached
    );
  } while (content !== lastContent);

  return content;
}

function processIncludesWithPattern(
  content,
  dir,
  includePattern,
  loopPattern,
  ifPattern,
  context,
  customFunctions,
  visited,
  readFileCached
) {
  const regex = new RegExp(
    `${includePattern}\\(\\s*['"]([^'"]+)['"]\\s*(?:,\\s*({[\\s\\S]*?}))?\\s*\\)\\s*;?`,
    "g"
  );

  return content.replace(regex, (match, filePath, jsonData) => {
    const includePath = path.resolve(dir, filePath);
    if (visited.has(includePath)) {
      console.warn(`⚠️ Circular include detected: ${includePath}`);
      return "";
    }
    visited.add(includePath);

    let data = {};
    if (jsonData) {
      try {
        data = JSON.parse(jsonData);
      } catch {
        console.error(`Failed to parse JSON data: ${jsonData}`);
      }
    }

    try {
      let includedContent = readFileCached(includePath);
      includedContent = injectData(
        includedContent,
        { ...context, ...data },
        customFunctions
      );
      return processIncludes(
        includedContent,
        path.dirname(includePath),
        includePattern,
        loopPattern,
        ifPattern,
        { ...context, ...data },
        customFunctions,
        visited,
        readFileCached
      );
    } catch (err) {
      console.error(`Failed to include file: ${includePath}`);
      return "";
    }
  });
}

function processLoops(
  content,
  dir,
  loopPattern,
  context,
  customFunctions,
  includePattern,
  ifPattern,
  visited,
  readFileCached
) {
  const regex = new RegExp(
    `${loopPattern}\\(\\s*['"]([^'"]+)['"]\\s*,\\s*(\\[[\\s\\S]*?\\]|['"][^'"]+['"])\\s*\\)\\s*;?`,
    "g"
  );

  return content.replace(regex, (match, filePath, jsonArrayOrFilePath) => {
    const loopPath = path.resolve(dir, filePath);
    let dataArray = [];

    try {
      if (jsonArrayOrFilePath.trim().startsWith("[")) {
        dataArray = JSON.parse(jsonArrayOrFilePath);
      } else {
        const jsonFilePath = path.resolve(
          dir,
          jsonArrayOrFilePath.replace(/['"]/g, "")
        );
        const jsonData = readFileCached(jsonFilePath);
        dataArray = JSON.parse(jsonData);
      }
    } catch (error) {
      console.error(`Failed to parse loop JSON: ${jsonArrayOrFilePath}`);
      return "";
    }

    try {
      let loopTemplate = readFileCached(loopPath);
      return dataArray
        .map((data) => {
          const mergedContext = { ...context, ...data };
          const loopContent = injectData(
            loopTemplate,
            mergedContext,
            customFunctions
          );
          return processIncludes(
            loopContent,
            dir,
            includePattern,
            loopPattern,
            ifPattern,
            mergedContext,
            customFunctions,
            visited,
            readFileCached
          );
        })
        .join("");
    } catch (error) {
      console.error(`Failed to include loop file: ${loopPath}`);
      return "";
    }
  });
}

function processConditionals(
  content,
  dir,
  ifPattern,
  includePattern,
  loopPattern,
  context,
  customFunctions,
  visited,
  readFileCached
) {
  const regex = new RegExp(
    `${ifPattern}\\s*\\(([^)]+)\\)\\s*{([\\s\\S]*?)};?`,
    "g"
  );

  return content.replace(regex, (match, condition, body) => {
    try {
      const result = evaluateCondition(condition, context, customFunctions);

      if (result) {
        let processed = processIncludesWithPattern(
          body.trim(),
          dir,
          includePattern,
          loopPattern,
          ifPattern,
          context,
          customFunctions,
          visited,
          readFileCached
        );
        processed = processLoops(
          processed,
          dir,
          loopPattern,
          context,
          customFunctions,
          includePattern,
          ifPattern,
          visited,
          readFileCached
        );
        processed = processConditionals(
          processed,
          dir,
          ifPattern,
          includePattern,
          loopPattern,
          context,
          customFunctions,
          visited,
          readFileCached
        );
        return processed;
      }

      return "";
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`);
      return "";
    }
  });
}

function injectData(content, data, customFunctions = {}) {
  return content.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, expression) => {
    try {
      const result = evaluateExpression(expression, data, customFunctions);
      return result !== undefined ? result : match;
    } catch {
      return match;
    }
  });
}

function evaluateExpression(expression, data, customFunctions) {
  const context = { ...data, ...customFunctions };
  return new Function("context", `with (context) { return ${expression}; }`)(
    context
  );
}

function evaluateCondition(condition, context, customFunctions) {
  const ctx = { ...context, ...customFunctions };
  return new Function("context", `with (context) { return ${condition}; }`)(ctx);
}

export default fileIncludePlugin;
