import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      startIcon,
      endIcon,
      id,
      className = "",
      wrapperClassName = "",
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId && error ? `${inputId}-error` : undefined;
    const helperId = inputId && helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-ink-soft"
          >
            {label}
            {required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-ink-soft">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition duration-150 focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:opacity-50 ${
              startIcon ? "pl-10" : ""
            } ${endIcon ? "pr-10" : ""} ${
              error
                ? "border-danger focus:border-danger focus:outline-danger"
                : "border-line-loud focus:border-primary"
            } ${className}`.trim()}
            {...props}
          />
          {endIcon && (
            <span className="pointer-events-none absolute right-3 flex items-center text-ink-soft">
              {endIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1 text-xs text-ink-soft">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
