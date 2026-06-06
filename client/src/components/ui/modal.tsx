import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number; // px — default 440
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 440,
}: ModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Don't render anything when closed
  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay — clicking it closes the modal */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        {/* Modal box — stop clicks from closing when clicking inside */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            background: "white",
            borderRadius: "12px",
            width: "100%",
            maxWidth,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)",
            overflow: "hidden",
            fontFamily: "sans-serif",
          }}
        >
          {/* Modal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <h2
              id="modal-title"
              style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}
            >
              {title}
            </h2>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#9CA3AF",
                padding: "4px",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#374151")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF")
              }
            >
              ✕
            </button>
          </div>

          {/* Modal content */}
          <div style={{ padding: "20px" }}>{children}</div>
        </div>
      </div>
    </>
  );
}
