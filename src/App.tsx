import { Routes, Route } from "react-router";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import SeasonPage from "./pages/SeasonPage";
import SeasonHistoryPage from "./pages/SeasonHistoryPage";
import AuthPage from "./pages/AuthPage";
import CreateSeasonPage from "./pages/CreateSeasonPage";
import PlayerPage from "./pages/PlayerPage";
import RulesPage from "./pages/RulesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/seasons/:seasonId" element={<SeasonPage />} />
        <Route path="/history" element={<SeasonHistoryPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/seasons/new" element={<CreateSeasonPage />} />
        <Route path="/players/:userId" element={<PlayerPage />} />
      </Route>
    </Routes>
  );
}
