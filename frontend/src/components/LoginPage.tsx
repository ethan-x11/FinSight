import { useState, type KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sparkles } from "lucide-react";
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

  const handleLogin = async () => {
    if (!userId || !password) {
      toast.error("Please enter both User ID and Password");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting("login");
    try {
      const resp = await login({ userId, password });
      toast.success(`Welcome back, ${resp.user.name}!`);
      // Persist userId so other parts of the app can reference it
      try {
        window.localStorage.setItem("userId", resp.user.id);
      } catch (e) {
        console.warn("Failed to persist userId to localStorage", e);
      }
      onLogin(resp.user);
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
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
      toast.error(err?.message || "Failed to create account");
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Header */}
      <div className="absolute top-6 left-6">
        <button 
          onClick={onBackToHome}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-primary">{APP_BRAND_NAME}</h2>
        </button>
      </div>

      {/* Login/Signup Card */}
      {!showForgotPassword && (
        <Card className="w-full max-w-md shadow-2xl border-2 relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle>{showSignup ? "Create Account" : "Welcome Back"}</CardTitle>
            <CardDescription>
              {showSignup 
                ? "Sign up to start accelerating your research" 
                : "Login to access your AI research assistant"}
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
                  className="bg-input-background border-2 border-border focus:border-primary"
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
                className="bg-input-background border-2 border-border focus:border-primary"
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
                  className="bg-input-background border-2 border-border focus:border-primary"
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
                className="bg-input-background border-2 border-border focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {showSignup ? (
              <>
                <Button 
                  onClick={handleSignup}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting === "signup"}
                >
                  {isSubmitting === "signup" ? "Signing up..." : "Sign Up"}
                </Button>
                <Button 
                  onClick={() => setShowSignup(false)}
                  variant="outline"
                  className="w-full border-2"
                  disabled={isSubmitting !== null}
                >
                  Back to Login
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleLogin}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting === "login"}
                >
                  {isSubmitting === "login" ? "Logging in..." : "Login"}
                </Button>
                <div className="flex gap-2 w-full">
                  <Button 
                    onClick={() => setShowSignup(true)}
                    variant="outline"
                    className="flex-1 border-2 border-secondary text-secondary hover:bg-secondary/5"
                    disabled={isSubmitting !== null}
                  >
                    Sign Up
                  </Button>
                  <Button 
                    onClick={() => setShowForgotPassword(true)}
                    variant="outline"
                    className="flex-1 border-2"
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

      {/* Forgot Password Card */}
      {showForgotPassword && (
        <Card className="w-full max-w-md shadow-2xl border-2 relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
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
                className="bg-input-background border-2 border-border focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={handleForgotPassword}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Send Reset Link
            </Button>
            <Button 
              onClick={() => setShowForgotPassword(false)}
              variant="outline"
              className="w-full border-2"
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
