import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container max-w-md mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-3">
          404
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-1">
          Page not found
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full h-10 px-5 font-semibold shadow-lg shadow-blue-500/25">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
