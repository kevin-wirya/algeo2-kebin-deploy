import { useTheme } from "../theme";

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button className="pill ghost" onClick={toggle} aria-label="Toggle theme">
      <span
        style={{
          width: 16,
          height: 16,
          display: "inline-block",
          borderRadius: "50%",
          border: "2px solid currentColor",
          background: theme === "light" ? "transparent" : "currentColor",
          boxShadow: theme === "light" ? "inset 0 0 0 4px currentColor" : "none",
        }}
      />
      <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}

export default ThemeToggle;
