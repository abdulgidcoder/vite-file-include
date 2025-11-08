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
        customFunctions
      );
    },

    transform(code, id) {
      if (id.endsWith(".html")) {
        return processIncludes(
          code,
          baseDir,
          includePattern,
          loopPattern,
          ifPattern,
          context,
          customFunctions
        );
      }
      return code;
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith(".html")) {
        server.ws.send({
          type: "full-reload",
        });
      }
    },
  };
}

function processIncludes(
  content,
  dir,
  includePattern,
  loopPattern,
  ifPattern,
  context,
  customFunctions
) {
  content = processIncludesWithPattern(
    content,
    dir,
    includePattern,
    loopPattern,
    ifPattern,
    context,
    customFunctions
  );
  content = processLoops(content, dir, loopPattern, context, customFunctions);
  content = processConditionals(
    content,
    dir,
    ifPattern,
    includePattern,
    loopPattern,
    context,
    customFunctions
  );

  return content;
}

function processIncludesWithPattern(
  content,
  dir,
  includePattern,
  loopPattern,
  ifPattern,
  context,
  customFunctions
) {
  const regex = new RegExp(
    `${includePattern}\\(\\s*['"](.+?)['"]\\s*,?\\s*({[\\s\\S]*?})?\\s*\\);`,
    "g"
  );

  return content.replace(regex, (match, filePath, jsonData) => {
    const includePath = path.resolve(dir, filePath);
    let data = {};

    if (jsonData) {
      try {
        data = JSON.parse(jsonData);
      } catch (error) {
        console.error(`Failed to parse JSON data: ${jsonData}`);
      }
    }

    try {
      let includedContent = fs.readFileSync(includePath, "utf-8");
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
        customFunctions
      );
    } catch (error) {
      console.error(`Failed to include file: ${includePath}`);
      return "";
    }
  });
}

function processLoops(content, dir, loopPattern, context, customFunctions) {
  const regex = new RegExp(
    `${loopPattern}\\(\\s*['"](.+?)['"]\\s*,\\s*(\\[[\\s\\S]*?\\]|['"](.+?)['"])\\s*\\);`,
    "g"
  );

  return content.replace(regex, (match, filePath, jsonArrayOrFilePath) => {
    const loopPath = path.resolve(dir, filePath);
    let dataArray = [];

    try {
      if (
        jsonArrayOrFilePath.startsWith("[") ||
        jsonArrayOrFilePath.startsWith("{")
      ) {
        dataArray = JSON.parse(jsonArrayOrFilePath);
      } else {
        const jsonFilePath = path.resolve(
          dir,
          jsonArrayOrFilePath.replace(/['"]/g, "")
        );
        const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
        dataArray = JSON.parse(jsonData);
      }
    } catch (error) {
      console.error(`Failed to parse JSON: ${jsonArrayOrFilePath}`);
      console.error(error);
    }

    try {
      let loopTemplate = fs.readFileSync(loopPath, "utf-8");
      return dataArray
        .map((data) => injectData(loopTemplate, { ...context, ...data }, customFunctions))
        .join("");
    } catch (error) {
      console.error(`Failed to include file: ${loopPath}`);
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
  customFunctions
) {
  const regex = new RegExp(
    `${ifPattern}\\s*\\(([^)]+)\\)\\s*{([\\s\\S]*?)};\\s*`,
    "g"
  );

  return content.replace(regex, (match, condition, body) => {
    try {
      const result = evaluateCondition(condition, context, customFunctions);

      if (result) {
        return processIncludesWithPattern(
          body.trim(),
          dir,
          includePattern,
          loopPattern,
          ifPattern,
          context,
          customFunctions
        );
      }

      return "";
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`);
      console.error(error);
      return "";
    }
  });
}

function injectData(content, data, customFunctions = {}) {
  return content.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, expression) => {
    try {
      const result = evaluateExpression(expression, data, customFunctions);
      return result !== undefined ? result : match;
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`);
      console.error(error);
      return match;
    }
  });
}

function evaluateExpression(expression, data, customFunctions) {
  // Bind custom functions to the evaluation context
  const context = { ...data, ...customFunctions };
  return new Function(
    "context",
    "with (context) { return " + expression + "; }"
  )(context);
}

function evaluateCondition(condition, context, customFunctions) {
  // Bind custom functions to the evaluation context
  const contextWithFunctions = { ...context, ...customFunctions };
  return new Function(
    "context",
    "with (context) { return " + condition + "; }"
  )(contextWithFunctions);
}

export default fileIncludePlugin;

