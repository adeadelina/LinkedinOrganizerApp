import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/contexts/user-context";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Unread from "@/pages/unread";
import Login from "@/pages/login";
import Register from "@/pages/register";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/unread" component={Unread} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}