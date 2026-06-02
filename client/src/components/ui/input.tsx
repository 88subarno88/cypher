import React from "react";

export interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "email";
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
}

export default function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  disabled = false,
}: InputProps) {
  // Combine base classes with conditional error classes
  const inputClasses = `
    w-full px-3 py-2 border rounded-md text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-indigo-500 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
    ${error ? "border-red-500" : "border-gray-300"}
  `.trim(); // .trim() removes extra whitespace around the string

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Conditionally render the label if provided */}
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* The actual input field */}
      <input
        type={type}
        value={value}
        // Extract the string value from the event and pass it up
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
      />

      {/* Conditionally render the error message if one exists */}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
