import { useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { LoginPage } from "./components/LoginPage";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { getAuthToken, fetchCurrentUser, clearAuthToken, type ApiUser } from "./utils/dataHandlerAPI";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type Page = "home" | "login" | "user" | "admin";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const tryAutoLogin = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const fetchedUser = await fetchCurrentUser();
        setUser(fetchedUser);
        setCurrentPage(fetchedUser.isAdmin ? "admin" : "user");
        try {
          window.localStorage.setItem("userId", fetchedUser.id);
        } catch (e) {
          console.warn("Failed to persist userId during auto-login", e);
        }
      } catch (err: any) {
        clearAuthToken();
        toast.error(err?.message || "Session expired. Please log in again.");
      } finally {
        setIsBootstrapping(false);
      }
    };

    tryAutoLogin();
  }, []);

  const handleNavigateToLogin = () => setCurrentPage("login");

  const handleLogin = (authUser: ApiUser) => {
    setUser(authUser);
    setCurrentPage(authUser.isAdmin ? "admin" : "user");
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    try {
      window.localStorage.removeItem("userId");
    } catch (e) {
      console.warn("Failed to remove userId from localStorage on logout", e);
    }
    setCurrentPage("home");
  };

  const handleBackToHome = () => {
    setUser(null);
    setCurrentPage("home");
  };

  if (isBootstrapping) return null;

  return (
    <>
      {currentPage === "home" && (
        <HomePage onNavigateToLogin={handleNavigateToLogin} />
      )}
      {currentPage === "login" && (
        <LoginPage onLogin={handleLogin} onBackToHome={handleBackToHome} />
      )}
      {currentPage === "user" && user && (
        <UserDashboard user={user} onLogout={handleLogout} onGoHome={handleBackToHome} />
      )}
      {currentPage === "admin" && user && (
        <AdminDashboard user={user} onLogout={handleLogout} onGoHome={handleBackToHome} />
      )}
      <Toaster />
    </>
  );
}
