import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "./layouts/MainLayout";
import Contact from "./pages/Contact";
import Contribute from "./pages/Contribute";
import Docs from "./pages/Docs";
import FAQ from "./pages/FAQ";
import GetStarted from "./pages/GetStarted";
import Home from "./pages/Home";
import MCP from "./pages/MCP";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/mcp" element={<MCP />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
