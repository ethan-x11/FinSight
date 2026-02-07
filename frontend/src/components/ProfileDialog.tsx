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
          <DialogContent className="max-w-md w-1/2 bg-white rounded-xl p-6 pt-8 shadow-xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-indigo-600" />
                Profile Settings
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Update your personal information and account settings
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <Card className="border border-slate-200 shadow-sm bg-white rounded-lg">
                <CardHeader className="">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    {user.isAdmin && <Shield className="w-4 h-4 text-indigo-600" />}
                    Account Information
                    {user.isAdmin && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        Admin
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4" />
                      User ID
                    </Label>
                    <Input
                      id="userId"
                      value={user.id}
                      disabled
                      className="bg-slate-100 text-slate-500 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500">User ID cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="border border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="border border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-300"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm bg-white rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowPasswordChange(true)}
                    variant="outline"
                    className="w-full border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Member Since</p>
                  <p className="text-sm text-slate-800">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Sessions</p>
                  <p className="text-sm text-slate-800">{user.sessionCount}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
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
