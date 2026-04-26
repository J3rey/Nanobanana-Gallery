/* 
 * NanoBanana Gallery — Home Page
 * Design: Aero Glass — iOS-inspired glassmorphism
 * - Hero section with AI conversion illustration
 * - Feature cards with glass effect
 * - Quick-start CTA buttons
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Upload, Images, Sparkles, ArrowRight, Zap, Grid3X3, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGallery } from "@/contexts/GalleryContext";
import ApiKeyDialog from "@/components/ApiKeyDialog";
import { useState } from "react";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663298019635/3prKGU3n6QAPMMPEGR89Zp/ai-convert-illustration-6SwNn7DBvbHwBpXRmGKujG.webp";
const UPLOAD_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663298019635/3prKGU3n6QAPMMPEGR89Zp/upload-illustration-8U5wsjiFVgtvKdhC4n7Nwy.webp";
const GALLERY_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663298019635/3prKGU3n6QAPMMPEGR89Zp/gallery-illustration-MrJU5nFYSLSb2HkZauUAB7.webp";

const features = [
  {
    icon: Upload,
    title: "Batch Upload",
    description: "Upload multiple photos at once and convert them all with a single prompt using the NanoBanana API.",
    color: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-500/20",
  },
  {
    icon: Zap,
    title: "AI Conversion",
    description: "Transform your photos with AI-powered style transfer, editing, and generation up to 4K resolution.",
    color: "from-indigo-500 to-purple-500",
    shadow: "shadow-indigo-500/20",
  },
  {
    icon: Grid3X3,
    title: "Scalable Gallery",
    description: "View your converted images in customizable grid layouts from 2x2 to 5x5 with smooth transitions.",
    color: "from-violet-500 to-pink-500",
    shadow: "shadow-violet-500/20",
  },
  {
    icon: Move,
    title: "Drag & Drop",
    description: "Reorder, add, and remove images in your gallery with intuitive drag-and-drop interactions.",
    color: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Home() {
  const { apiKey } = useGallery();
  const [showApiDialog, setShowApiDialog] = useState(false);

  return (
    <div className="container">
      {/* Hero Section */}
      <motion.section
        className="text-center pt-4 pb-12 sm:pt-8 sm:pb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-semibold text-blue-600 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by NanoBanana AI
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-800 leading-tight tracking-tight mb-4"
        >
          Transform Your Photos
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            with AI Magic
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Batch convert photos using the NanoBanana API, then organize them in a
          beautiful, editable gallery with customizable grid layouts.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/convert">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-6 h-12 text-base font-semibold"
            >
              <Upload className="w-5 h-5 mr-2" />
              Start Converting
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/gallery">
            <Button
              size="lg"
              variant="outline"
              className="glass rounded-xl px-6 h-12 text-base font-semibold text-slate-700 hover:bg-white/60"
            >
              <Images className="w-5 h-5 mr-2" />
              View Gallery
            </Button>
          </Link>
          {!apiKey && (
            <Button
              size="lg"
              variant="outline"
              className="glass rounded-xl px-6 h-12 text-base font-semibold text-amber-600 border-amber-300/50 hover:bg-amber-50/50"
              onClick={() => setShowApiDialog(true)}
            >
              Set API Key
            </Button>
          )}
        </motion.div>
      </motion.section>

      {/* Hero Illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="max-w-4xl mx-auto mb-16 sm:mb-20"
      >
        <div className="glass rounded-3xl p-3 card-shadow">
          <img
            src={HERO_IMAGE}
            alt="AI Photo Conversion"
            className="w-full rounded-2xl object-cover"
            loading="eager"
          />
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.section
        className="pb-16 sm:pb-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
            Everything You Need
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            A complete workflow from batch upload to gallery presentation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-5 sm:p-6 card-shadow hover:card-shadow-hover transition-shadow"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg ${feature.shadow}`}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="pb-16 sm:pb-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
            How It Works
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Three simple steps to transform and organize your photos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              step: "01",
              title: "Upload Photos",
              description: "Drag and drop or select multiple photos for batch processing.",
              image: UPLOAD_IMAGE,
            },
            {
              step: "02",
              title: "AI Convert",
              description: "Enter a prompt and let NanoBanana AI transform all your photos.",
              image: HERO_IMAGE,
            },
            {
              step: "03",
              title: "Gallery View",
              description: "Browse, organize, and manage your converted images in a beautiful gallery.",
              image: GALLERY_IMAGE,
            },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-shadow"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 sm:p-6">
                <span className="text-xs font-bold text-blue-500 tracking-wider uppercase">
                  Step {item.step}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-1 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="pb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-strong rounded-3xl p-8 sm:p-12 text-center card-shadow">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
            Ready to Transform Your Photos?
          </h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Get started with your Magic Hour API key and begin converting photos in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/convert">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-8 h-12 text-base font-semibold"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="https://magichour.ai/api/nano-banana" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="glass rounded-xl px-6 h-12 text-base font-semibold text-slate-700 hover:bg-white/60"
              >
                Get API Key
              </Button>
            </a>
          </div>
        </div>
      </motion.section>

      <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} />
    </div>
  );
}
