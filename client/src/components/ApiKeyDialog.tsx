/* 
 * NanoBanana Gallery — API Key Dialog
 * Design: Aero Glass — frosted glass dialog
 */

import { useState } from "react";
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
import { Key, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const { apiKey, setApiKey } = useGallery();
  const [value, setValue] = useState(apiKey);

  const handleSave = () => {
    if (!value.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    setApiKey(value.trim());
    toast.success("API key saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-2xl border-white/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            Magic Hour API Key
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Enter your Magic Hour API key to use the NanoBanana image conversion features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Input
              type="password"
              placeholder="Enter your API key..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-blue-400 focus:ring-blue-400/20"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl h-10 font-semibold"
            >
              Save Key
            </Button>
            <a
              href="https://magichour.ai/api/nano-banana"
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

          <p className="text-xs text-slate-400 leading-relaxed">
            Your API key is stored locally in your browser and never sent to our servers.
            Get a free API key from{" "}
            <a
              href="https://magichour.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Magic Hour
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
