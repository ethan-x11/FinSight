import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { changePassword } from "../utils/dataHandlerAPI";
import { toast } from "sonner";
import { withRetry } from "../utils/retry";

interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordChangeDialog({ open, onClose }: PasswordChangeDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const passwordRequirements = [
    { text: "At least 8 characters", met: newPassword.length >= 8 },
    { text: "Contains a number", met: /\d/.test(newPassword) },
    { text: "Contains an uppercase letter", met: /[A-Z]/.test(newPassword) },
    { text: "Passwords match", met: newPassword === confirmPassword && newPassword.length > 0 },
  ];

  const handleChangePassword = () => {
    const userId = null; // API uses current authenticated user; keep for compatibility checks

    // Validation
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (!/\d/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsChanging(true);
    (async () => {
      try {
        await withRetry(() => changePassword(currentPassword, newPassword), 3, 400);
        setIsChanging(false);
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } catch (err: any) {
        setIsChanging(false);
        console.error("Password change failed:", err);
        toast.error(err?.message || "Failed to change password. Please try again later.");
      }
    })();
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new secure password
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="border-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="border-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="border-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <Alert className="border-2">
              <AlertDescription>
                <p className="text-sm mb-2">Password requirements:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      {req.met ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                        {req.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 border-2"
            disabled={isChanging}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={isChanging || !passwordRequirements.every(req => req.met)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isChanging ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
