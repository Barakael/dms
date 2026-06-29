import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { User } from "@/types";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("head.eng@company.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, (res.data.user.data ?? res.data.user) as User);
      navigate("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 sidebar-gradient sidebar-texture items-center justify-center p-12 relative">
        <div className="relative z-10 max-w-md text-white">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blue-lt flex items-center justify-center mb-6">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Company DMS</h1>
          <p className="text-white/75 leading-relaxed">
            Secure document management organized by department and project. Upload easily, share deliberately.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-navy-deep">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Access your department or project portal</p>
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-danger-dark text-sm px-3 py-2">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>

          <p className="text-xs text-slate-400 text-center">Demo: head.eng@company.com / password</p>
        </form>
      </div>
    </div>
  );
}
