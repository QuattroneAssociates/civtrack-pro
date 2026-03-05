import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, KeyRound, ArrowLeft, Loader2 } from "lucide-react";

type Step = "email" | "code";

export default function LoginPage() {
  const { requestCode, login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await requestCode(email.trim());
      setStep("code");
    } catch (err: any) {
      const msg = err.message?.includes("403")
        ? "This email is not authorized to access CivTrack Pro."
        : "Failed to send code. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    try {
      await login(email.trim(), code.trim());
      toast({ title: "Welcome", description: "You're now signed in." });
    } catch (err: any) {
      const msg = err.message?.includes("401")
        ? "Invalid or expired code. Please try again."
        : "Verification failed. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown) return;
    setCooldown(true);
    try {
      await requestCode(email.trim());
      toast({ title: "Code Resent", description: "A new code has been sent to your email." });
    } catch {
      toast({ title: "Error", description: "Failed to resend code.", variant: "destructive" });
    }
    setTimeout(() => setCooldown(false), 30000);
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

          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
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
              <Button
                type="submit"
                className="w-full h-11 bg-[#263042] hover:bg-[#344a60] text-white font-bold text-sm"
                disabled={isSubmitting || !email.trim()}
                data-testid="button-send-code"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <KeyRound size={16} className="mr-2" />
                )}
                Send Access Code
              </Button>
              <p className="text-center text-[11px] text-gray-400 mt-4">
                Only authorized Quattrone & Associates employees can sign in.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  Enter the code to sign in as
                </p>
                <p className="text-sm font-bold text-[#263042]" data-testid="text-sent-email">
                  {email}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Access Code
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="pl-10 h-11 text-sm text-center tracking-[0.3em] font-mono font-bold"
                    maxLength={6}
                    autoFocus
                    required
                    data-testid="input-code"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#263042] hover:bg-[#344a60] text-white font-bold text-sm"
                disabled={isSubmitting || code.length < 6}
                data-testid="button-verify-code"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : null}
                Verify & Sign In
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  className="flex items-center gap-1 text-gray-500 hover:text-[#263042] transition-colors"
                  data-testid="button-back"
                >
                  <ArrowLeft size={12} /> Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown}
                  className={`font-medium transition-colors ${
                    cooldown
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-[#263042] hover:text-[#344a60]"
                  }`}
                  data-testid="button-resend-code"
                >
                  {cooldown ? "Code sent" : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
