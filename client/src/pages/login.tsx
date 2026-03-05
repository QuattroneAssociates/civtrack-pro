import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast({ title: "Welcome", description: "You're now signed in." });
    } catch (err: any) {
      toast({
        title: "Sign In Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#263042] px-4"
      data-testid="login-page"
    >
      <Card className="w-full max-w-md bg-white border-0 shadow-2xl">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-[#263042] flex items-center justify-center mb-4">
              <HardHat size={28} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-[#263042] tracking-tight" data-testid="text-app-title">
              CivTrack Pro
            </h1>
            <p className="text-[10px] font-bold text-[#263042]/40 uppercase tracking-[0.25em] mt-1">
              Quattrone & Associates, Inc.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Company Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@qainc.net"
                  className="pl-10 h-11 text-sm"
                  autoFocus
                  required
                  data-testid="input-email"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-11 text-sm"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-[#263042] hover:bg-[#344a60] text-white font-bold text-sm"
              disabled={isSubmitting || !email.trim() || !password}
              data-testid="button-login"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : null}
              Sign In
            </Button>
            <p className="text-center text-[11px] text-gray-400 mt-4">
              Only authorized Quattrone & Associates employees can sign in.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
