export class RobustLatexToMongoConverter {
  constructor() {
    // Updated pattern to allow fields starting with numbers (e.g., "10days", "10magpsf")
    this.fieldPattern = /([a-zA-Z0-9_][a-zA-Z0-9_.]*)/g;
    this.numberPattern = /^-?\d+\.?\d*$/;
  }

  /**
   * Convert LaTeX expression to MongoDB aggregation expression
   * @param {string} latexExpression - The LaTeX expression to convert
   * @param {boolean} isInArrayFilter - Whether this expression is being used in an array filter context
   * @returns {Object} MongoDB aggregation expression
   */
  convertToMongo(latexExpression, isInArrayFilter = false) {
    if (!latexExpression || typeof latexExpression !== "string") {
      return latexExpression;
    }

    try {
      // Clean the expression
      let expression = this._cleanExpression(latexExpression);

      // Handle simple cases
      if (this._isSimpleField(expression)) {
        return `$${expression}`;
      }

      if (this._isSimpleNumber(expression)) {
        return parseFloat(expression);
      }

      // Use expression tree parsing with depth limit
      return this._parseWithExpressionTree(expression, 0, isInArrayFilter);
    } catch (error) {
      console.warn(
        "Failed to convert LaTeX expression:",
        latexExpression,
        error,
      );
      return `$${latexExpression}`; // Fallback
    }
  }

  /**
   * Convert LaTeX fractions to division operations
   * @private
   */
  _convertFractions(expression) {
    // Handle \frac{numerator}{denominator} - convert to (numerator)/(denominator)
    // Process recursively to handle nested fractions
    let result = expression;
    let hasMore = true;

    while (hasMore) {
      const fracPattern =
        /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
      const match = result.match(fracPattern);

      if (match) {
        const [fullMatch, numerator, denominator] = match;
        // Recursively process numerator and denominator in case they contain fractions
        const processedNum = this._convertFractions(numerator.trim());
        const processedDen = this._convertFractions(denominator.trim());

        const replacement = `(${processedNum})/(${processedDen})`;
        result = result.replace(fullMatch, replacement);
      } else {
        hasMore = false;
      }
    }

    return result;
  }
  /**
   * Convert LaTeX underscore subscripts to flat underscore notation
   * @private
   */
  _convertUnderscoreSubscripts(expression) {
    let result = expression;
    let hasMore = true;

    while (hasMore) {
      // Match patterns like name_{subscript} where subscript can contain nested braces
      const underscorePattern =
        /([a-zA-Z_][a-zA-Z0-9_]*?)_\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
      const match = result.match(underscorePattern);

      if (match) {
        const [fullMatch, baseName, subscript] = match;
        // Recursively process the subscript in case it contains more underscore patterns
        const processedSubscript = this._convertUnderscoreSubscripts(
          subscript.trim(),
        );
        // Remove any remaining braces and convert to flat underscore notation
        const flatSubscript = processedSubscript.replace(/[{}]/g, "");
        const replacement = `${baseName}_${flatSubscript}`;
        result = result.replace(fullMatch, replacement);
      } else {
        hasMore = false;
      }
    }

    return result;
  }

  /**
   * Clean LaTeX expression
   * @private
   */
  _cleanExpression(expression) {
    // First, handle fractions before other processing
    let cleaned = this._convertFractions(expression);

    // Convert underscore subscripts early in the cleaning process
    cleaned = this._convertUnderscoreSubscripts(cleaned);

    // Handle LaTeX parentheses - convert \left( and \right) to regular parentheses
    cleaned = cleaned
      .replace(/\\left\(/g, "(") // Convert \left( to (
      .replace(/\\right\)/g, ")") // Convert \right) to )
      .replace(/\\left\[/g, "(") // Convert \left[ to (
      .replace(/\\right\]/g, ")") // Convert \right] to )
      .replace(/\\left\\\{/g, "(") // Convert \left\{ to (
      .replace(/\\right\\\}/g, ")"); // Convert \right\} to )

    // Then handle nested LaTeX absolute values by converting them to standard notation
    // This handles nested cases like \left|\left|x\right|-y\right|
    let prevCleaned;
    do {
      prevCleaned = cleaned;
      // Use a more sophisticated regex to handle nested \left| \right| pairs
      cleaned = this._replaceLatexAbsoluteValues(cleaned);
    } while (cleaned !== prevCleaned);

    return cleaned
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\\cdot/g, "*") // Convert \cdot to *
      .replace(/\\times/g, "*") // Convert \times to *
      .replace(/\\div/g, "/") // Convert \div to /
      .trim();
  }
  /**
   * Replace LaTeX absolute values with balanced matching
   * @private
   */
  _replaceLatexAbsoluteValues(expression) {
    let result = expression;
    let i = 0;

    while (i < result.length) {
      // Look for \left|
      if (i + 5 < result.length && result.substring(i, i + 6) === "\\left|") {
        // Find the matching \right|
        let level = 1;
        let j = i + 6;

        while (j < result.length && level > 0) {
          if (
            j + 5 < result.length &&
            result.substring(j, j + 6) === "\\left|"
          ) {
            level++;
            j += 6;
          } else if (
            j + 6 < result.length &&
            result.substring(j, j + 7) === "\\right|"
          ) {
            level--;
            if (level === 0) {
              // Found the matching \right|, replace the whole thing
              const innerContent = result.substring(i + 6, j);
              const replacement = `|${innerContent}|`;
              result =
                result.substring(0, i) + replacement + result.substring(j + 7);
              i += replacement.length;
              break;
            } else {
              j += 7;
            }
          } else {
            j++;
          }
        }

        if (level > 0) {
          // Unmatched \left|, just move forward
          i++;
        }
      } else {
        i++;
      }
    }

    return result;
  }

  /**
   * Check if expression is a simple field
   * @private
   */
  _isSimpleField(expression) {
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expression);
  }

  /**
   * Check if expression is a simple number
   * @private
   */
  _isSimpleNumber(expression) {
    return this.numberPattern.test(expression);
  }

  /**
   * Parse using expression tree approach
   * @private
   */
  _parseWithExpressionTree(expression, depth = 0, isInArrayFilter = false) {
    // Validate input
    if (!expression || typeof expression !== "string") {
      return expression || "";
    }

    // Prevent infinite recursion
    if (depth > 10) {
      return `$${expression}`;
    }

    // Handle common function patterns with balanced parentheses first
    const functionNames = ["abs", "sqrt", "sin", "cos", "tan", "log", "ln"];
    for (const funcName of functionNames) {
      if (expression.startsWith(`${funcName}(`)) {
        const innerContent = this._extractFunctionArgument(
          expression,
          funcName,
        );
        if (innerContent !== null) {
          return {
            [`$${funcName}`]: this._parseWithExpressionTree(
              innerContent,
              depth + 1,
              isInArrayFilter,
            ),
          };
        }
      }
    }

    // Remove outer parentheses if they wrap the entire expression
    if (
      expression.startsWith("(") &&
      expression.endsWith(")") &&
      this._isBalancedParentheses(expression.slice(1, -1))
    ) {
      return this._parseWithExpressionTree(
        expression.slice(1, -1),
        depth + 1,
        isInArrayFilter,
      );
    }

    // Find the main operator (lowest precedence, rightmost) BEFORE checking absolute values
    const mainOp = this._findMainOperator(expression);
    if (mainOp) {
      const { left, operator, right } = mainOp;
      const leftVal = this._parseWithExpressionTree(
        left,
        depth + 1,
        isInArrayFilter,
      );
      const rightVal = this._parseWithExpressionTree(
        right,
        depth + 1,
        isInArrayFilter,
      );

      switch (operator) {
        case "+":
          return { $add: [leftVal, rightVal] };
        case "-":
          return { $subtract: [leftVal, rightVal] };
        case "*":
          return { $multiply: [leftVal, rightVal] };
        case "/":
          return { $divide: [leftVal, rightVal] };
        case "^":
        case "**":
          return { $pow: [leftVal, rightVal] };
        default:
          break;
      }
    }

    // Only check for absolute values if no main operator was found
    // Handle absolute value in standard notation (LaTeX has been converted)
    // 1. Standard vertical bars: |expression|
    const absMatch = expression.match(/^\|(.+)\|$/);
    if (absMatch && absMatch[1]) {
      const innerExpr = absMatch[1];
      return {
        $abs: this._parseWithExpressionTree(
          innerExpr,
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // 2. Left absolute value notation: left|expression
    const leftAbsMatch = expression.match(/^left\|(.+)$/);
    if (leftAbsMatch && leftAbsMatch[1]) {
      const innerExpr = leftAbsMatch[1];
      return {
        $abs: this._parseWithExpressionTree(
          innerExpr,
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // 3. Right absolute value notation: expression|right
    const rightAbsMatch = expression.match(/^(.+)\|right$/);
    if (rightAbsMatch && rightAbsMatch[1]) {
      const innerExpr = rightAbsMatch[1];
      return {
        $abs: this._parseWithExpressionTree(
          innerExpr,
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // If no operator found, handle as atomic value
    return this._convertAtomicValue(expression, depth, isInArrayFilter);
  }

  /**
   * Check if parentheses are balanced
   * @private
   */
  _isBalancedParentheses(expression) {
    let count = 0;
    for (const char of expression) {
      if (char === "(") count++;
      if (char === ")") count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Extract function argument with balanced parentheses
   * @private
   */
  _extractFunctionArgument(expression, funcName) {
    const prefix = `${funcName}(`;
    if (!expression.startsWith(prefix)) {
      return null;
    }

    let parenCount = 0;
    let startIndex = prefix.length;

    for (let i = startIndex - 1; i < expression.length; i++) {
      if (expression[i] === "(") {
        parenCount++;
      } else if (expression[i] === ")") {
        parenCount--;
        if (parenCount === 0) {
          // Found the matching closing parenthesis
          const content = expression.substring(startIndex, i);
          // Make sure this closes the entire expression
          if (i === expression.length - 1) {
            return content;
          }
          return null;
        }
      }
    }

    return null; // Unbalanced parentheses
  }

  /**
   * Find the main operator with proper precedence
   * @private
   */
  _findMainOperator(expression) {
    /**
     * Array of operator definitions for parsing mathematical expressions.
     * Each object contains an array of operator symbols and their precedence level.
     * Precedence determines the order of operations: higher numbers indicate higher precedence,
     * meaning those operators are evaluated before lower precedence ones (e.g., multiplication before addition).
     * Higher precedence operators come first in the list to ensure multi-character operators
     * like '**' are matched before single-character ones like '*' during parsing,
     * preventing incorrect tokenization (e.g., '**' being split into '*' and '*').
     * @type {Array<{ops: string[], precedence: number}>}
     */
    const operators = [
      { ops: ["**", "^"], precedence: 3 },
      { ops: ["*", "/"], precedence: 2 },
      { ops: ["+", "-"], precedence: 1 },
    ];

    let parenLevel = 0;
    let absLevel = 0;
    let bestOp = null;
    let bestPrec = Infinity;
    let funcLevel = 0;

    // Scan from right to left for right associativity
    for (let i = expression.length - 1; i >= 0; i--) {
      const char = expression[i];

      if (char === ")") {
        parenLevel++;
        // Check if this closes a function call
        const beforeParen = expression.substring(0, i);
        if (/\b(sqrt|sin|cos|tan|log|ln)$/.test(beforeParen)) {
          funcLevel++;
        }
      }
      if (char === "(") {
        parenLevel--;
        if (funcLevel > 0) {
          funcLevel--;
        }
      }

      // Handle absolute value bars (standard notation only after cleaning)
      if (char === "|") {
        // Check if this is part of a left| or |right pattern
        const beforeBar = expression.substring(0, i);
        const afterBar = expression.substring(i + 1);

        if (beforeBar.endsWith("left") || afterBar.startsWith("right")) {
          // This is a left| or |right pattern, don't count for absLevel
          continue;
        }

        absLevel = absLevel > 0 ? absLevel - 1 : absLevel + 1;
      }

      if (parenLevel === 0 && funcLevel === 0 && absLevel === 0) {
        for (const { ops, precedence } of operators) {
          for (const op of ops) {
            // Check if we have a multi-character operator like **
            if (op.length > 1) {
              const startIdx = i - op.length + 1;
              if (
                startIdx >= 0 &&
                expression.substring(startIdx, i + 1) === op &&
                precedence <= bestPrec
              ) {
                const left = expression.substring(0, startIdx).trim();
                const right = expression.substring(i + 1).trim();

                if (left && right) {
                  bestOp = { left, operator: op, right };
                  bestPrec = precedence;
                }
              }
            } else if (op === char && precedence <= bestPrec) {
              // Single character operator
              // Make sure this operator isn't part of a function name
              // (only skip if the operator itself is a letter and preceded by a letter)
              if (
                i > 0 &&
                /[a-zA-Z]/.test(char) &&
                /[a-zA-Z]/.test(expression[i - 1])
              ) {
                continue;
              }

              // Handle negative numbers (don't treat - as subtraction if it's the start or after specific operators)
              if (
                char === "-" &&
                (i === 0 || /[+\-*/^(]/.test(expression[i - 1]))
              ) {
                continue;
              }

              const left = expression.substring(0, i).trim();
              const right = expression.substring(i + 1).trim();

              // Make sure both sides exist
              if (left && right) {
                bestOp = { left, operator: char, right };
                bestPrec = precedence;
              }
            }
          }
        }
      }
    }

    return bestOp;
  }

  /**
   * Convert atomic values (fields and numbers)
   * @private
   */
  _convertAtomicValue(value, depth = 0, isInArrayFilter = false) {
    const trimmed = value.trim();

    // Handle absolute value expressions in all forms (LaTeX converted to standard)
    // 1. Standard vertical bars: |expression|
    const absMatch = trimmed.match(/^\|(.+)\|$/);
    if (absMatch) {
      return {
        $abs: this._parseWithExpressionTree(
          absMatch[1],
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // 3. Left absolute value notation: left|expression
    const leftAbsMatch = trimmed.match(/^left\|(.+)$/);
    if (leftAbsMatch) {
      return {
        $abs: this._parseWithExpressionTree(
          leftAbsMatch[1],
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // 4. Right absolute value notation: expression|right
    const rightAbsMatch = trimmed.match(/^(.+)\|right$/);
    if (rightAbsMatch) {
      return {
        $abs: this._parseWithExpressionTree(
          rightAbsMatch[1],
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // 5a. Multi-argument aggregate functions: min(...), max(...), sum(...), avg(...)
    const aggregateFuncMatch = trimmed.match(/^(min|max|sum|avg)\((.+)\)$/);
    if (aggregateFuncMatch) {
      const [, funcName, argsString] = aggregateFuncMatch;
      // Parse comma-separated arguments
      const args = this._parseCommaSeparatedArgs(
        argsString,
        depth,
        isInArrayFilter,
      );

      // Map function names to MongoDB operators
      const operatorMap = {
        min: "$min",
        max: "$max",
        sum: "$sum",
        avg: "$avg",
      };

      return {
        [operatorMap[funcName]]: args,
      };
    }

    // 5b. Function notation: abs(expression)
    const absFuncMatch = trimmed.match(/^abs\((.+)\)$/);
    if (absFuncMatch) {
      return {
        $abs: this._parseWithExpressionTree(
          absFuncMatch[1],
          depth + 1,
          isInArrayFilter,
        ),
      };
    }

    // Check for simple power operations like field^number
    const powerMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\^(.+)$/);
    if (powerMatch) {
      const [, base, exponent] = powerMatch;
      return {
        $pow: [
          `$${base}`,
          this._parseWithExpressionTree(exponent, depth + 1, isInArrayFilter),
        ],
      };
    }

    // Prevent infinite recursion by not parsing complex expressions at high depth
    if (
      depth < 5 &&
      (trimmed.includes("^") ||
        trimmed.includes("|") ||
        trimmed.startsWith("left|") ||
        trimmed.endsWith("|right") ||
        trimmed.startsWith("abs(") ||
        trimmed.includes("\\left|") ||
        trimmed.includes("\\right|")) &&
      !this._isSimpleField(trimmed) &&
      !this.numberPattern.test(trimmed)
    ) {
      return this._parseWithExpressionTree(trimmed, depth + 1, isInArrayFilter);
    }

    if (this.numberPattern.test(trimmed)) {
      return parseFloat(trimmed);
    }

    if (this._isSimpleField(trimmed)) {
      // Field conversion with array context awareness:
      // In array filter context: absolute document references stay as $field,
      // array-relative fields would be $$this.field (but we're processing absolute refs here)
      return `$${trimmed}`;
    }

    // Check if it already starts with $ (field reference passed through)
    if (trimmed.startsWith("$")) {
      // Already has $ prefix, don't add another
      return trimmed;
    }

    // Fallback for unknown patterns - return as field reference
    return `$${trimmed}`;
  }

  /**
   * Parse comma-separated arguments for aggregate functions
   * Handles nested parentheses and commas within sub-expressions
   * @private
   */
  _parseCommaSeparatedArgs(argsString, depth = 0, isInArrayFilter = false) {
    const args = [];
    let currentArg = "";
    let parenDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (char === "(") {
        parenDepth++;
        currentArg += char;
      } else if (char === ")") {
        parenDepth--;
        currentArg += char;
      } else if (char === "{") {
        braceDepth++;
        currentArg += char;
      } else if (char === "}") {
        braceDepth--;
        currentArg += char;
      } else if (char === "," && parenDepth === 0 && braceDepth === 0) {
        // Found a top-level comma - parse and store the current argument
        const trimmedArg = currentArg.trim();
        if (trimmedArg) {
          args.push(
            this._parseWithExpressionTree(
              trimmedArg,
              depth + 1,
              isInArrayFilter,
            ),
          );
        }
        currentArg = "";
      } else {
        currentArg += char;
      }
    }

    // Don't forget the last argument
    const trimmedArg = currentArg.trim();
    if (trimmedArg) {
      args.push(
        this._parseWithExpressionTree(trimmedArg, depth + 1, isInArrayFilter),
      );
    }

    return args;
  }

  /**
   * Extract field dependencies from expression
   * @param {string} latexExpression
   * @returns {Array} Array of field names
   */
  extractFieldDependencies(latexExpression) {
    if (!latexExpression || typeof latexExpression !== "string") {
      return [];
    }

    // First clean the expression to remove LaTeX syntax that might create false field matches
    const cleanedExpression = this._cleanExpression(latexExpression);

    const fields = new Set();

    // Extract fields from aggregate functions like min(var1, var2, var3)
    const aggregateFuncPattern = /\b(min|max|sum|avg)\s*\(([^)]+)\)/g;
    let aggregateMatch;
    while (
      (aggregateMatch = aggregateFuncPattern.exec(cleanedExpression)) !== null
    ) {
      const argsString = aggregateMatch[2];
      // Split by commas, handling nested expressions
      const args = this._splitCommaSeparatedFields(argsString);
      args.forEach((arg) => {
        const trimmedArg = arg.trim();
        // Check if it's a field reference (not a number, not a nested expression)
        if (
          trimmedArg &&
          !this.numberPattern.test(trimmedArg) &&
          !trimmedArg.includes("(") &&
          !trimmedArg.includes("+") &&
          !trimmedArg.includes("-") &&
          !trimmedArg.includes("*") &&
          !trimmedArg.includes("/") &&
          !trimmedArg.startsWith("this.") &&
          trimmedArg !== "this"
        ) {
          fields.add(trimmedArg);
        }
      });
    }

    // Extract fields from the general expression pattern
    let match;
    this.fieldPattern.lastIndex = 0;

    while ((match = this.fieldPattern.exec(cleanedExpression)) !== null) {
      const field = match[1];
      // Exclude numbers, function names, LaTeX artifacts, and relative array references
      if (
        !this.numberPattern.test(field) &&
        ![
          "sqrt",
          "sin",
          "cos",
          "tan",
          "log",
          "ln",
          "abs",
          "min",
          "max",
          "sum",
          "avg",
          "left",
          "right",
          "frac",
        ].includes(field) &&
        !field.startsWith("this.") &&
        field !== "this"
      ) {
        fields.add(field);
      }
    }

    return [...fields]; // Convert Set to Array
  }

  /**
   * Split comma-separated fields, respecting nested parentheses
   * @private
   */
  _splitCommaSeparatedFields(argsString) {
    const args = [];
    let currentArg = "";
    let parenDepth = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (char === "(") {
        parenDepth++;
        currentArg += char;
      } else if (char === ")") {
        parenDepth--;
        currentArg += char;
      } else if (char === "," && parenDepth === 0) {
        if (currentArg.trim()) {
          args.push(currentArg.trim());
        }
        currentArg = "";
      } else {
        currentArg += char;
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return args;
  }
}

export const latexToMongoConverter = new RobustLatexToMongoConverter();
