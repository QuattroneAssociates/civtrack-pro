import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ProjectsList from "@/pages/projects-list";
import ProjectDetails from "@/pages/project-details";
import ProjectForm from "@/pages/project-form";
import TasksList from "@/pages/tasks-list";
import Alerts from "@/pages/alerts";
import CalendarPage from "@/pages/calendar-page";
import Reports from "@/pages/reports";
import UserDirectory from "@/pages/user-directory";
import AppLayout from "@/components/app-layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={ProjectsList} />
      <Route path="/projects/new" component={ProjectForm} />
      <Route path="/projects/:id/edit" component={ProjectForm} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/tasks" component={TasksList} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={UserDirectory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
