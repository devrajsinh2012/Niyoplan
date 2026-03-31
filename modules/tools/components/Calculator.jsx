'use client';

import React, { useState } from 'react';
import { Backspace, Calculator, Percent, RotateCcw } from 'lucide-react';
import { evaluateCalculatorExpression, formatCalculatorResult } from '../lib/calculator';

const BUTTON_ROWS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

const OPERATOR_SET = new Set(['+', '-', '×', '÷']);

export default function CalculatorTool() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const clearAll = () => {
    setExpression('');
    setResult('');
    setError('');
  };

  const handleBackspace = () => {
    setExpression((current) => current.slice(0, -1));
    setError('');
  };

  const handleEvaluate = () => {
    try {
      const computed = evaluateCalculatorExpression(expression);
      const formatted = formatCalculatorResult(computed);
      setExpression(formatted);
      setResult(formatted);
      setError('');
    } catch (evaluationError) {
      setError(evaluationError.message || 'Invalid expression');
      setResult('');
    }
  };

  const handleOperator = (operator) => {
    setError('');
    setResult('');

    setExpression((current) => {
      if (!current) {
        return operator === '-' ? '-' : current;
      }

      const lastChar = current.slice(-1);
      if (OPERATOR_SET.has(lastChar)) {
        return `${current.slice(0, -1)}${operator}`;
      }

      return `${current}${operator}`;
    });
  };

  const handleSymbol = (symbol) => {
    setError('');
    setResult('');
    setExpression((current) => `${current}${symbol}`);
  };

  const handleButtonClick = (buttonValue) => {
    if (buttonValue === 'C') {
      clearAll();
      return;
    }

    if (buttonValue === '⌫') {
      handleBackspace();
      return;
    }

    if (buttonValue === '=') {
      handleEvaluate();
      return;
    }

    if (buttonValue === '×' || buttonValue === '÷' || buttonValue === '+' || buttonValue === '-') {
      handleOperator(buttonValue);
      return;
    }

    handleSymbol(buttonValue);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEvaluate();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearAll();
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]">
          <Calculator size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">Calculator</h2>
          <p className="text-sm text-[var(--text-secondary)]">Basic arithmetic, percentages, and keyboard entry.</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          aria-label="Calculator expression"
          value={expression}
          onChange={(event) => {
            setExpression(event.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          inputMode="decimal"
          autoComplete="off"
          spellCheck="false"
          placeholder="Type an expression, then press Enter"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-3 font-mono text-base text-[var(--text-heading)] outline-none transition-colors focus:border-[var(--border-focus)]"
        />

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Result</div>
          <div className="mt-1 min-h-6 font-mono text-lg font-semibold text-[var(--text-heading)]">
            {result || 'Ready'}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {BUTTON_ROWS.flat().map((buttonValue) => {
            const isPrimary = buttonValue === '=';
            const isClear = buttonValue === 'C';
            const isBackspace = buttonValue === '⌫';
            const isPercent = buttonValue === '%';
            const isZero = buttonValue === '0';

            return (
              <button
                key={buttonValue}
                type="button"
                onClick={() => handleButtonClick(buttonValue)}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                  isPrimary
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
                    : isClear || isBackspace || isPercent
                      ? 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-heading)] hover:bg-[var(--bg-panel)]'
                } ${isZero ? 'col-span-2' : ''}`}
              >
                {buttonValue === '⌫' ? <Backspace size={16} className="mx-auto" /> : buttonValue === '%' ? <Percent size={16} className="mx-auto" /> : buttonValue}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <span>Press Enter to calculate.</span>
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>
    </section>
  );
}