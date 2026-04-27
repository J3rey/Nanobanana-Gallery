/* 
 * NanoBanana Gallery — API Key Dialog
 * Design: Aero Glass — frosted glass dialog
 * - View current key (masked)
 * - Change key with validation
 * - Remove key entirely
 * - Validates Gemini API key with a test call before saving
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGallery } from "@/contexts/GalleryContext";
import { trpc } from "@/lib/trpc";
import {
  Key,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const { apiKey, setApiKey } = useGallery();

  // tRPC mutation for validating the key via the backend proxy
  const validateKeyMutation = trpc.gemini.validateKey.useMutation();
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: "idle" | "checking" | "valid" | "invalid" | "warning";
    message?: string;
  }>({ status: "idle" });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setValue("");
      setShowKey(false);
      setShowRemoveConfirm(false);
      setValidationResult({ status: "idle" });
      setMode("view");
    }
  }, [open, apiKey]);

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 6)}${"•".repeat(Math.min(apiKey.length - 10, 20))}${apiKey.slice(-4)}`
    : "";

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }

    setValidationResult({ status: "checking" });

    try {
      const result = await validateKeyMutation.mutateAsync({ apiKey: value.trim() });

      if (result.valid) {
        setApiKey(value.trim());
        if (result.error) {
          setValidationResult({ status: "warning", message: result.error });
          toast.success("API key saved", { description: result.error });
        } else {
          setValidationResult({ status: "valid", message: "API key verified successfully!" });
          toast.success("API key verified and saved!");
        }
        setTimeout(() => {
          onOpenChange(false);
          setValidationResult({ status: "idle" });
        }, 1200);
      } else {
        setValidationResult({ status: "invalid", message: result.error || "Invalid API key" });
        toast.error("API key validation failed", { description: result.error });
      }
    } catch (err: any) {
      setValidationResult({
        status: "invalid",
        message: err.message || "Could not validate. You can save anyway.",
      });
      toast.error("Validation request failed", { description: "You can save the key without validation." });
    }
  };

  const handleSkipValidation = () => {
    if (!value.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    setApiKey(value.trim());
    toast.success("API key saved (not validated)");
    onOpenChange(false);
  };

  const handleRemove = () => {
    setApiKey("");
    toast.success("API key removed");
    setShowRemoveConfirm(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setValidationResult({ status: "idle" });
          setShowRemoveConfirm(false);
        }
      }}
    >
      <DialogContent className="glass-strong rounded-2xl border-white/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            Override API Key (optional)
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {apiKey && mode === "view"
              ? "Manage your override key below. Leave empty to use the server default."
              : "Optionally provide your own Google AI Studio key. Leave empty to use the server default."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* VIEW MODE — show current key with actions */}
          {mode === "view" && !showRemoveConfirm && (
            <>
              {/* Current key display */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Override Key
                  </span>
                  <div className="flex items-center gap-1">
                    {apiKey ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                        <span className="text-[11px] font-medium text-emerald-600">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-medium text-slate-400">Using server default</span>
                      </>
                    )}
                  </div>
                </div>
                {apiKey ? (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-slate-600 flex-1 truncate">
                      {showKey ? apiKey : maskedKey}
                    </code>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No override key set</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    setMode("edit");
                    setValue("");
                    setValidationResult({ status: "idle" });
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl h-10 font-semibold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {apiKey ? "Change Key" : "Set Override Key"}
                </Button>
                {apiKey && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRemoveConfirm(true)}
                    className="glass rounded-xl h-10 text-red-500 hover:text-red-600 hover:bg-red-50/50 border-red-200/50"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Remove
                  </Button>
                )}
              </div>
            </>
          )}

          {/* REMOVE CONFIRMATION */}
          {showRemoveConfirm && (
            <div className="bg-red-50/80 rounded-xl p-4 border border-red-200/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Remove API Key?</span>
              </div>
              <p className="text-xs text-red-600/80 mb-3">
                This will remove your override API key. The app will fall back to the server default key.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRemove}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-9 text-sm font-semibold"
                >
                  Yes, Remove
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 glass rounded-xl h-9 text-sm text-slate-600 hover:bg-white/60"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* EDIT MODE — enter new key */}
          {mode === "edit" && !showRemoveConfirm && (
            <>
              <button
                onClick={() => {
                  setMode("view");
                  setValue("");
                  setValidationResult({ status: "idle" });
                }}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                ← Back
              </button>

              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your Gemini API key..."
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setValidationResult({ status: "idle" });
                  }}
                  className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-blue-400 focus:ring-blue-400/20 pr-16"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  disabled={validationResult.status === "checking"}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {validationResult.status === "checking" && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {validationResult.status === "valid" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {validationResult.status === "invalid" && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  {validationResult.status === "warning" && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>

              {/* Validation message */}
              {validationResult.message && validationResult.status !== "idle" && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg ${
                    validationResult.status === "valid"
                      ? "bg-emerald-50/80 text-emerald-700"
                      : validationResult.status === "warning"
                        ? "bg-amber-50/80 text-amber-700"
                        : validationResult.status === "invalid"
                          ? "bg-red-50/80 text-red-700"
                          : "bg-blue-50/80 text-blue-700"
                  }`}
                >
                  {validationResult.message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={validationResult.status === "checking" || !value.trim()}
                  className="flex-1 min-w-[140px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl h-10 font-semibold disabled:opacity-50"
                >
                  {validationResult.status === "checking" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Save"
                  )}
                </Button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="glass rounded-xl h-10 text-slate-600 hover:bg-white/60"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Get Key
                  </Button>
                </a>
              </div>

              {/* Skip validation option */}
              {validationResult.status === "invalid" && (
                <button
                  onClick={handleSkipValidation}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors w-full text-center"
                >
                  Save anyway without validation →
                </button>
              )}
            </>
          )}

          <p className="text-xs text-slate-400 leading-relaxed">
            An override key is stored locally in your browser only for this session and is never
            sent to the server except to proxy Gemini requests. Leave empty to use the server
            default. Get a free key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
