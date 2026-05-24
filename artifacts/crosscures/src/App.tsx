import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/store";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import PatientHome from "@/pages/patient/home";
import CheckinPage from "@/pages/patient/checkin";
import ClinicPage from "@/pages/patient/clinic";
import RecordsPage from "@/pages/patient/records";
import MedicationsPage from "@/pages/patient/medications";
import SettingsPage from "@/pages/patient/settings";
import PrevisitPage from "@/pages/patient/previsit";
import ReportPage from "@/pages/patient/report";
import PhysicianDashboard from "@/pages/physician/dashboard";
import PatientsPage from "@/pages/physician/patients";
import PatientDetailPage from "@/pages/physician/patient-detail";
import BriefsPage from "@/pages/physician/briefs";
import BriefDetailPage from "@/pages/physician/brief-detail";
import AlertsPage from "@/pages/physician/alerts";
import AlertDetailPage from "@/pages/physician/alert-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function RedirectRoot() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === "physician") {
      navigate("/physician/dashboard", { replace: true });
    } else if (user?.role === "patient") {
      navigate("/patient/home", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RedirectRoot} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Patient routes */}
      <Route path="/patient/home" component={PatientHome} />
      <Route path="/patient/checkin" component={CheckinPage} />
      <Route path="/patient/clinic" component={ClinicPage} />
      <Route path="/patient/records" component={RecordsPage} />
      <Route path="/patient/medications" component={MedicationsPage} />
      <Route path="/patient/settings" component={SettingsPage} />
      <Route path="/patient/previsit" component={PrevisitPage} />
      <Route path="/patient/report" component={ReportPage} />

      {/* Physician routes */}
      <Route path="/physician/dashboard" component={PhysicianDashboard} />
      <Route path="/physician/patients" component={PatientsPage} />
      <Route path="/physician/patients/:patientId" component={PatientDetailPage} />
      <Route path="/physician/briefs" component={BriefsPage} />
      <Route path="/physician/briefs/:briefId" component={BriefDetailPage} />
      <Route path="/physician/alerts" component={AlertsPage} />
      <Route path="/physician/alerts/:alertId" component={AlertDetailPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
