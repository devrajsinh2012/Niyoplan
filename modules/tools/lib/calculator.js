const OPERATOR_PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
};

const OPERATOR_SET = new Set(Object.keys(OPERATOR_PRECEDENCE));

const isOperator = (token) => OPERATOR_SET.has(token);

const readNumber = (expression, startIndex, allowLeadingMinus = false) => {
  let index = startIndex;
  let numberText = '';

  if (allowLeadingMinus && expression[index] === '-') {
    numberText += '-';
    index += 1;
  }

  while (index < expression.length && /[0-9.]/.test(expression[index])) {
    numberText += expression[index];
    index += 1;
  }

  if (numberText === '' || numberText === '-' || numberText === '.') {
    throw new Error('Invalid number');
  }

  const value = Number(numberText);
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number');
  }

  let percentCount = 0;
  while (expression[index] === '%') {
    percentCount += 1;
    index += 1;
  }

  return {
    value: percentCount > 0 ? value / (100 ** percentCount) : value,
    nextIndex: index,
  };
};

export function normalizeCalculatorExpression(expression = '') {
  return String(expression)
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/\s+/g, '');
}

function tokenizeCalculatorExpression(expression) {
  const tokens = [];
  let index = 0;
  let expectingOperand = true;

  while (index < expression.length) {
    const char = expression[index];

    if (char === '(') {
      tokens.push(char);
      index += 1;
      expectingOperand = true;
      continue;
    }

    if (char === ')') {
      tokens.push(char);
      index += 1;
      expectingOperand = false;
      continue;
    }

    if (char === '%') {
      if (tokens.length === 0 || typeof tokens[tokens.length - 1] !== 'number') {
        throw new Error('Percentage must follow a number');
      }

      tokens[tokens.length - 1] /= 100;
      index += 1;
      expectingOperand = false;
      continue;
    }

    if (isOperator(char)) {
      if (char === '-' && expectingOperand) {
        const nextChar = expression[index + 1];

        if (nextChar === '(') {
          tokens.push(0);
          tokens.push('-');
          index += 1;
          expectingOperand = true;
          continue;
        }

        if (/[0-9.]/.test(nextChar || '')) {
          const { value, nextIndex } = readNumber(expression, index, true);
          tokens.push(value);
          index = nextIndex;
          expectingOperand = false;
          continue;
        }

        throw new Error('Unexpected operator');
      }

      if (expectingOperand) {
        throw new Error('Unexpected operator');
      }

      tokens.push(char);
      index += 1;
      expectingOperand = true;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const { value, nextIndex } = readNumber(expression, index);
      tokens.push(value);
      index = nextIndex;
      expectingOperand = false;
      continue;
    }

    throw new Error(`Unsupported character: ${char}`);
  }

  return tokens;
}

function toReversePolishNotation(tokens) {
  const output = [];
  const operatorStack = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token);
      continue;
    }

    if (token === '(') {
      operatorStack.push(token);
      continue;
    }

    if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        output.push(operatorStack.pop());
      }

      if (operatorStack.length === 0) {
        throw new Error('Mismatched parentheses');
      }

      operatorStack.pop();
      continue;
    }

    while (
      operatorStack.length > 0
      && isOperator(operatorStack[operatorStack.length - 1])
      && OPERATOR_PRECEDENCE[operatorStack[operatorStack.length - 1]] >= OPERATOR_PRECEDENCE[token]
    ) {
      output.push(operatorStack.pop());
    }

    operatorStack.push(token);
  }

  while (operatorStack.length > 0) {
    const token = operatorStack.pop();
    if (token === '(' || token === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(token);
  }

  return output;
}

function evaluateReversePolishNotation(tokens) {
  const stack = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();

    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error('Invalid expression');
    }

    let result = 0;
    switch (token) {
      case '+':
        result = left + right;
        break;
      case '-':
        result = left - right;
        break;
      case '*':
        result = left * right;
        break;
      case '/':
        if (right === 0) {
          throw new Error('Cannot divide by zero');
        }
        result = left / right;
        break;
      default:
        throw new Error(`Unsupported operator: ${token}`);
    }

    stack.push(result);
  }

  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }

  return stack[0];
}

export function evaluateCalculatorExpression(expression) {
  const normalizedExpression = normalizeCalculatorExpression(expression);

  if (!normalizedExpression) {
    throw new Error('Enter an expression');
  }

  const tokens = tokenizeCalculatorExpression(normalizedExpression);
  const rpn = toReversePolishNotation(tokens);
  const result = evaluateReversePolishNotation(rpn);

  if (!Number.isFinite(result)) {
    throw new Error('Calculation produced an invalid result');
  }

  return result;
}

export function formatCalculatorResult(value) {
  if (!Number.isFinite(value)) {
    return 'Error';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(10)));
}