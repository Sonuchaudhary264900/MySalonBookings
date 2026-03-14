import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import SalonDetails from "./pages/SalonDetails";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/favorites"      element={<Favorites />} />
        <Route path="/salon/:id"      element={<SalonDetails />} />
        <Route path="/booking/:id"    element={<Booking />} />
        <Route path="/profile"        element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
