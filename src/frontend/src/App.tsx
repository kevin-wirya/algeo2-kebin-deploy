import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Homepage from "./pages/Homepage";
import BookPage from "./pages/BookPage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import { ThemeProvider } from "./theme";

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/read/:id" element={<ReaderPage />} />
        <Route path="/book/:id" element={<BookPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
