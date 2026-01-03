import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AgreementManagementPanel from "./components/admin/AgreementManagementPanel";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import {
    ApiDocsPage,
    CompliancePage,
    DataPolicyPage,
    DocsPage,
    HelpPage,
    PrivacyPage,
    StatusPage,
    TermsPage
} from "./pages/StaticPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/registry" element={<Index />} />
            
            {/* Resources Pages */}
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/status" element={<StatusPage />} />
            
            {/* Legal Pages */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/data-policy" element={<DataPolicyPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/admin/agreements" element={<AgreementManagementPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
