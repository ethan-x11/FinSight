import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Mail, Lock, Shield } from "lucide-react";
import { fetchCurrentUser, updateProfile, type ApiUser as UserData } from "../utils/dataHandlerAPI";
import { toast } from "sonner";
import { withRetry } from "../utils/retry";
import { PasswordChangeDialog } from "./PasswordChangeDialog";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open]);

  const loadUserData = () => {
    (async () => {
      try {
        const userData = await fetchCurrentUser();
        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);
      } catch (err) {
        // ignore
      }
    })();
  };

  const handleSave = () => {
    if (!user) return;

    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    (async () => {
      try {
        const updated = await withRetry(() => updateProfile({ name, email }), 3, 400);
        setIsSaving(false);
        toast.success("Profile updated successfully!");
        setUser(updated);
      } catch (err: any) {
        setIsSaving(false);
        console.error("Profile update failed:", err);
        toast.error(err?.message || "Failed to update profile. Please try again later.");
      }
    })();
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    onClose();
  };

  if (!user) return null;

  if (!open) return null;

  return (
    <>
      {!showPasswordChange && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Settings
            </DialogTitle>
            <DialogDescription>
              Update your personal information and account settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* User Info Card */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {user.isAdmin && <Shield className="w-4 h-4 text-primary" />}
                  Account Information
                  {user.isAdmin && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Admin
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    User ID
                  </Label>
                  <Input
                    id="userId"
                    value={user.id}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    User ID cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="border-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="border-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowPasswordChange(true)}
                  variant="outline"
                  className="w-full border-2 border-primary text-primary hover:bg-primary/5"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm">
                  {new Date(user.joinDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="text-sm">{user.sessionCount}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          </DialogContent>
        </Dialog>
      )}

      {showPasswordChange && (
        <PasswordChangeDialog
          open={true}
          onClose={() => setShowPasswordChange(false)}
        />
      )}
    </>
  );
}
