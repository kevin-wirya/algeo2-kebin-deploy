import { useTheme } from "../theme";
import logoLight from "../assets/main-logo-light.png";
import logoDark from "../assets/main-logo-dark.png";

export const LogoMark = () => {
  const { theme } = useTheme();
  const src = theme === "dark" ? logoDark : logoLight;
  return <img src={src} alt="Kebin" className="brand-logo" />;
};

export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 11.5v7h4v-4h3v4h4v-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="6" />
    <path d="m15.5 15.5 3.5 3.5" strokeLinecap="round" />
  </svg>
);

export const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M5 5h9.5a3.5 3.5 0 0 1 3.5 3.5V20H8.5A3.5 3.5 0 0 0 5 16.5V5Z" />
    <path d="M5 5.5h9a3.5 3.5 0 0 1 3.5 3.5V20" />
    <path d="M9 9.5h5.5M9 12.5h3.5" strokeLinecap="round" />
  </svg>
);
