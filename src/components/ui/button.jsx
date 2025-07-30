// src/components/ui/button.jsx
export const Button = ({ children, ...props }) => (
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" {...props}>
    {children}
  </button>
);