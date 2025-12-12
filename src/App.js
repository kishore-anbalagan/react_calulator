import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const BUTTONS = [
  { label: 'C', type: 'clear' },
  { label: '⌫', type: 'backspace' },
  { label: '%', type: 'percent' },
  { label: '÷', type: 'operator' },
  { label: '7', type: 'digit' },
  { label: '8', type: 'digit' },
  { label: '9', type: 'digit' },
  { label: '×', type: 'operator' },
  { label: '4', type: 'digit' },
  { label: '5', type: 'digit' },
  { label: '6', type: 'digit' },
  { label: '-', type: 'operator' },
  { label: '1', type: 'digit' },
  { label: '2', type: 'digit' },
  { label: '3', type: 'digit' },
  { label: '+', type: 'operator' },
  { label: '±', type: 'toggle-sign' },
  { label: '0', type: 'digit' },
  { label: '.', type: 'dot' },
  { label: '=', type: 'equals' },
];

const OPERATORS = ['+', '-', '×', '÷'];

const isOperator = (value) => OPERATORS.includes(value);

function toTokens(expression) {
  const tokens = [];
  let numberBuffer = '';

  for (let i = 0; i < expression.length; i += 1) {
    const char = expression[i];

    if (/\d|\./.test(char)) {
      numberBuffer += char;
      continue;
    }

    if (isOperator(char) || char === '*' || char === '/') {
      if (numberBuffer) {
        tokens.push(numberBuffer);
        numberBuffer = '';
      }

      const prev = tokens[tokens.length - 1];
      const unaryMinus = char === '-' && (!prev || isOperator(prev));
      const unaryPlus = char === '+' && (!prev || isOperator(prev));

      if (unaryMinus || unaryPlus) {
        numberBuffer = char;
      } else {
        tokens.push(char);
      }
    }
  }

  if (numberBuffer) {
    tokens.push(numberBuffer);
  }

  return tokens;
}

function toPostfix(tokens) {
  const output = [];
  const stack = [];
  const precedence = { '+': 1, '-': 1, '×': 2, '÷': 2, '*': 2, '/': 2 };

  tokens.forEach((token) => {
    if (isOperator(token) || token === '*' || token === '/') {
      while (stack.length && precedence[stack[stack.length - 1]] >= precedence[token]) {
        output.push(stack.pop());
      }
      stack.push(token);
    } else {
      output.push(token);
    }
  });

  while (stack.length) {
    output.push(stack.pop());
  }

  return output;
}

function evaluateTokens(tokens) {
  if (!tokens.length) return 0;

  const postfix = toPostfix(tokens);
  const stack = [];

  postfix.forEach((token) => {
    if (isOperator(token) || token === '*' || token === '/') {
      const b = parseFloat(stack.pop());
      const a = parseFloat(stack.pop());

      if (Number.isNaN(a) || Number.isNaN(b)) {
        throw new Error('Invalid expression');
      }

      switch (token) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '×':
        case '*':
          stack.push(a * b);
          break;
        case '÷':
        case '/':
          if (b === 0) {
            throw new Error('Division by zero');
          }
          stack.push(a / b);
          break;
        default:
          throw new Error('Unknown operator');
      }
    } else {
      const value = parseFloat(token);
      if (Number.isNaN(value)) {
        throw new Error('Invalid number');
      }
      stack.push(value);
    }
  });

  if (stack.length !== 1) {
    throw new Error('Could not resolve expression');
  }

  return stack[0];
}

function normalizeExpression(value) {
  return value.replace(/×/g, '*').replace(/÷/g, '/');
}

function App() {
  const [input, setInput] = useState('0');
  const [history, setHistory] = useState([]);

  const lastChar = useMemo(() => input[input.length - 1], [input]);
  const currentNumber = useMemo(() => input.split(/[+\-×÷]/).pop() || '', [input]);

  const resetIfError = () => {
    if (input === 'Error') {
      setInput('0');
      return true;
    }
    return false;
  };

  const handleDigit = (value) => {
    const reset = resetIfError();
    setInput((prev) => (prev === '0' || reset ? value : prev + value));
  };

  const handleDot = () => {
    const reset = resetIfError();
    if (reset) {
      setInput('0.');
      return;
    }

    if (currentNumber.includes('.')) return;
    setInput((prev) => (isOperator(lastChar) ? `${prev}0.` : `${prev}.`));
  };

  const handleOperator = (value) => {
    const reset = resetIfError();
    const target = reset ? '0' : input;

    if (isOperator(lastChar)) {
      setInput(target.slice(0, -1) + value);
    } else {
      setInput(target + value);
    }
  };

  const handleBackspace = () => {
    if (resetIfError()) return;
    setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const handleClear = () => setInput('0');

  const splitExpression = (expr) => {
    let lastOpIndex = -1;

    for (let i = 0; i < expr.length; i += 1) {
      const char = expr[i];
      if (isOperator(char)) {
        const prev = expr[i - 1];
        const unaryMinus = char === '-' && (i === 0 || isOperator(prev));
        if (!unaryMinus) {
          lastOpIndex = i;
        }
      }
    }

    return {
      prefix: expr.slice(0, lastOpIndex + 1),
      number: expr.slice(lastOpIndex + 1) || '0',
    };
  };

  const replaceCurrentNumber = (transform) => {
    setInput((prev) => {
      const { prefix, number } = splitExpression(prev);
      const numeric = parseFloat(number);
      if (Number.isNaN(numeric)) return prev;

      const nextNumber = transform(numeric);
      return `${prefix}${nextNumber}`;
    });
  };

  const handlePercent = () => {
    resetIfError();
    replaceCurrentNumber((n) => n / 100);
  };

  const handleToggleSign = () => {
    resetIfError();
    setInput((prev) => {
      const { prefix, number } = splitExpression(prev);
      if (number === '0') return prev;
      const toggled = number.startsWith('-') ? number.slice(1) : `-${number}`;
      return `${prefix}${toggled}`;
    });
  };

  const handleEquals = () => {
    try {
      const normalized = normalizeExpression(input);
      const tokens = toTokens(normalized);
      const result = evaluateTokens(tokens);
      const nextValue = Number.isFinite(result) ? result.toString() : 'Error';
      if (nextValue !== 'Error') {
        setHistory((prev) => [{ expression: input, result: nextValue }, ...prev].slice(0, 8));
      }
      setInput(nextValue);
    } catch (err) {
      setInput('Error');
    }
  };

  const handlePress = (button) => {
    switch (button.type) {
      case 'digit':
        handleDigit(button.label);
        break;
      case 'dot':
        handleDot();
        break;
      case 'operator':
        handleOperator(button.label);
        break;
      case 'backspace':
        handleBackspace();
        break;
      case 'clear':
        handleClear();
        break;
      case 'percent':
        handlePercent();
        break;
      case 'toggle-sign':
        handleToggleSign();
        break;
      case 'equals':
        handleEquals();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleKey = (event) => {
      const { key } = event;

      if (/^\d$/.test(key)) {
        handleDigit(key);
        return;
      }

      if (key === '.') {
        handleDot();
        return;
      }

      if (['+', '-', '*', '/'].includes(key)) {
        const mapped = key === '*' ? '×' : key === '/' ? '÷' : key;
        handleOperator(mapped);
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        handleEquals();
        return;
      }

      if (key === 'Backspace') {
        handleBackspace();
        return;
      }

      if (key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const clearHistory = () => setHistory([]);

  return (
    <main className="app" aria-label="Calculator">
      <div className="bg-accents" aria-hidden />
      <div className="shell">
        <div className="calculator">
          <div className="header">
            <div>
              <p className="eyebrow">Reactive • Keyboard-ready</p>
              <h1>React Calculator</h1>
              <p className="subhead">Safe parsing, quick percent and sign toggles.</p>
            </div>
            <button type="button" className="pill" onClick={handleClear}>
              Reset
            </button>
          </div>

          <div className="display" aria-live="polite" aria-label="Calculator display">
            {input}
          </div>

          <div className="buttons" role="grid" aria-label="Calculator buttons">
            {BUTTONS.map((btn) => (
              <button
                key={btn.label}
                type="button"
                className={`btn btn-${btn.type}`}
                onClick={() => handlePress(btn)}
                aria-label={btn.type === 'operator' ? `Operator ${btn.label}` : btn.label}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="history" aria-label="Calculation history">
          <div className="history-header">
            <div>
              <p className="eyebrow">Recent</p>
              <h2>History</h2>
            </div>
            <button type="button" className="pill" onClick={clearHistory}>
              Clear
            </button>
          </div>

          {history.length === 0 ? (
            <p className="history-empty">No calculations yet.</p>
          ) : (
            <ul>
              {history.map((item, idx) => (
                <li key={`${item.expression}-${idx}`}>
                  <span className="history-expression">{item.expression}</span>
                  <span className="history-result">= {item.result}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}

export default App;
