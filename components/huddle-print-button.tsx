"use client";

export function HuddlePrintButton() {
  return (
    <button
      type="button"
      className="btn btn-outline no-print"
      onClick={() => {
        document.body.classList.add("print-huddle");
        const done = () => {
          document.body.classList.remove("print-huddle");
          window.removeEventListener("afterprint", done);
        };
        window.addEventListener("afterprint", done);
        window.print();
      }}
    >
      Print huddle card
    </button>
  );
}
