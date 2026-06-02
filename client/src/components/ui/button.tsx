import React from "react";
import { Loader2 } from "lucide-react";


export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}


export default function Button({
  children,
  onClick,
  type = "button",
  isLoading = false,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  // Base classes that apply to EVERY button
  const baseClasses =
    "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  // Variant-specific classes
  const primaryClasses = "bg-indigo-600 text-white hover:bg-indigo-700";
  const secondaryClasses =
    "bg-transparent text-indigo-600 border border-indigo-600 hover:bg-indigo-50";

  // Combine them based on what was passed in (defaults to primary)
  const variantClasses =
    variant === "secondary" ? secondaryClasses : primaryClasses;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses}`}
    >
      {/* If loading, show the spinner and text. Otherwise, just show children */}
      {isLoading ? (
        <>
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
