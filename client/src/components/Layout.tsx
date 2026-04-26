/* 
 * NanoBanana Gallery — Layout Component
 * Design: Aero Glass — iOS-inspired glassmorphism
 * - Gradient background from sky blue to periwinkle to lavender
 * - Frosted glass top navigation bar
 * - Floating card panels
 */

import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Upload, Images, Sparkles, Settings } from "lucide-react";
import { useGallery } from "@/contexts/GalleryContext";

const navItems = [
  { path: "/", label: "Home", icon: Sparkles },
  { path: "/convert", label: "Convert", icon: Upload },
  { path: "/gallery", label: "Gallery", icon: Images },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { apiKey } = useGallery();

  return (
    <div className="gradient-bg relative overflow-x-hidden">
      {/* Floating ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/15 blur-3xl" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-indigo-200/10 blur-3xl" />
      </div>

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-3 sm:mx-6 sm:mt-4">
          <div className="glass-strong rounded-2xl card-shadow px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base font-bold text-slate-800 leading-tight tracking-tight">
                      NanoBanana
                    </h1>
                    <p className="text-[10px] font-medium text-blue-500/80 uppercase tracking-widest leading-none">
                      Gallery
                    </p>
                  </div>
                </div>
              </Link>

              {/* Nav Links */}
              <div className="flex items-center gap-1 sm:gap-2">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location === path;
                  return (
                    <Link key={path} href={path}>
                      <motion.div
                        className={`relative flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="relative z-10 hidden sm:inline">{label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              {/* API Key indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    apiKey ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : "bg-amber-400 shadow-lg shadow-amber-400/50"
                  }`}
                />
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                  {apiKey ? "API Connected" : "No API Key"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-24 sm:pt-28 pb-8 min-h-screen">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
