import { useState, type KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { BarChart3 } from "lucide-react";
import { login, signup, forgotPassword, type ApiUser } from "../utils/dataHandlerAPI";
import { toast } from "sonner";
import { APP_BRAND_NAME } from "../config/appConfig";

interface LoginPageProps {
  onLogin: (user: ApiUser) => void;
  onBackToHome: () => void;
}

export function LoginPage({ onLogin, onBackToHome }: LoginPageProps) {
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"login" | "signup" | null>(null);

  const performLogin = async (loginUserId: string, loginPassword: string) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting("login");
    try {
      const resp = await login({ userId: loginUserId, password: loginPassword });
      toast.success(`Welcome back, ${resp.user.name}!`);
      // Persist userId so other parts of the app can reference it
      try {
        window.localStorage.setItem("userId", resp.user.id);
      } catch (e) {
        console.warn("Failed to persist userId to localStorage", e);
      }
      onLogin(resp.user);
    } catch (err: any) {
      const errstatus = err?.response?.status ?? err?.status;
      if (errstatus === 401 || "401") {
        toast.error("Invalid credentials. Please try again.");
      } else {
        toast.error(err?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleLogin = async () => {
    if (!userId || !password) {
      toast.error("Please enter both User ID and Password");
      return;
    }

    await performLogin(userId, password);
  };

  const handleTestLogin = async () => {
    const testUserId = "testuser";
    const testPassword = "Test@123";
    setUserId(testUserId);
    setPassword(testPassword);
    await performLogin(testUserId, testPassword);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (showSignup) {
        handleSignup();
      } else {
        handleLogin();
      }
    }
  };

  const handleSignup = async () => {
    // Validate all fields
    if (!userId || !password || !email || !name) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting("signup");
    try {
      const resp = await signup({ userId, name, email, password });
      toast.success(`Welcome, ${resp.user.name}! Your account has been created.`);
      // Persist userId so other parts of the app can reference it
      try {
        window.localStorage.setItem("userId", resp.user.id);
      } catch (e) {
        console.warn("Failed to persist userId to localStorage", e);
      }
      onLogin(resp.user);
        } catch (err: any) {
          const errstatus = err?.response?.status ?? err?.status
      if (errstatus === 409 || "409") {
        toast.error("User ID or Email already exists. Please try again.");
      } else {
        toast.error(err?.message || "Failed to create account");
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email to reset password");
      return;
    }
    try {
      const resp = await forgotPassword(email);
      toast.success(resp.message || "Reset email sent");
      setShowForgotPassword(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-indigo-200 blur-3xl opacity-50" />
        <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-cyan-200 blur-3xl opacity-40" />
      </div>

      <div className="absolute top-6 left-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200/70">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">{APP_BRAND_NAME}</h2>
        </button>
      </div>

      {!showForgotPassword && (
        <Card className="w-full max-w-md shadow-2xl border border-slate-200/80 bg-white/90 backdrop-blur relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-slate-900">
              {showSignup ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {showSignup
                ? "Sign up to start accelerating your research"
                : `Login to access ${APP_BRAND_NAME} workspace`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-white/70 border border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white/70 border border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            {showSignup && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-white/70 border border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={showSignup ? "Create a password (min. 6 characters)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white/70 border border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {showSignup ? (
              <>
                <Button
                  onClick={handleSignup}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                  disabled={isSubmitting === "signup"}
                >
                  {isSubmitting === "signup" ? "Signing up..." : "Sign Up"}
                </Button>
                <Button
                  onClick={() => setShowSignup(false)}
                  variant="outline"
                  className="w-full border border-slate-200"
                  disabled={isSubmitting !== null}
                >
                  Back to Login
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                  disabled={isSubmitting === "login"}
                >
                  {isSubmitting === "login" ? "Logging in..." : "Login"}
                </Button>
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={() => setShowSignup(true)}
                    variant="outline"
                    className="flex-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    disabled={isSubmitting !== null}
                  >
                    Sign Up
                  </Button>
                  <Button
                    onClick={() => setShowForgotPassword(true)}
                    variant="outline"
                    className="flex-1 border border-slate-200"
                    disabled={isSubmitting !== null}
                  >
                    Forgot Password
                  </Button>
                </div>
              </>
            )}
          </CardFooter>
        </Card>
      )}

      {showForgotPassword && (
        <Card className="w-full max-w-md shadow-2xl border border-slate-200/80 bg-white/90 backdrop-blur relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-slate-900">Reset Password</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/70 border border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={handleForgotPassword}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            >
              Send Reset Link
            </Button>
            <Button
              onClick={() => setShowForgotPassword(false)}
              variant="outline"
              className="w-full border border-slate-200"
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      )}

      <Button
        onClick={handleTestLogin}
        className="absolute bottom-6 right-6 z-20 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
        disabled={isSubmitting !== null}
      >
        {isSubmitting === "login" ? "Logging in..." : "Test Login"}
      </Button>
    </div>
  );
}
