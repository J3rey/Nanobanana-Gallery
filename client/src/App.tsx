import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GalleryProvider } from "./contexts/GalleryContext";
import Home from "./pages/Home";
import BatchConvert from "./pages/BatchConvert";
import Gallery from "./pages/Gallery";
import Layout from "./components/Layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/convert" component={BatchConvert} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <GalleryProvider>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <Layout>
              <Router />
            </Layout>
          </TooltipProvider>
        </GalleryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
