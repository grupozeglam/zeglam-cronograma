import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PublicView from "./pages/PublicView";
import AdminView from "./pages/AdminView";
import ShipmentSubmit from "./pages/ShipmentSubmit";
import { SupplierLogin } from "./pages/SupplierLogin";
import { SupplierDashboard } from "./pages/SupplierDashboard";
import { ShipmentsAdmin } from "./pages/ShipmentsAdmin";
import { AdminUsers } from "./pages/AdminUsers";
import ImportLinksAI from "./pages/ImportLinksAI";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={PublicView} />
      <Route path={"/admin"} component={AdminView} />
      <Route path={"/envioscomprovantes"} component={ShipmentSubmit} />
      <Route path={"/loginfornecedores"} component={SupplierLogin} />
      <Route path={"/painelfornecedor"} component={SupplierDashboard} />
      <Route path={"/gerenciamentofreteadmin"} component={ShipmentsAdmin} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/importar-links"} component={ImportLinksAI} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
