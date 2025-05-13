
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import Home from "@/pages/home";
import { Unread } from "@/pages/unread";
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import { NotFound } from "@/pages/not-found";
import { UserProvider } from "@/contexts/user-context";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

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
