import { useLocation } from "wouter";
import { RegisterForm } from "@/components/auth/register-form";
import { Toaster } from "@/components/ui/toaster";

export default function Register() {
  const [_, setLocation] = useLocation();

  const handleRegisterSuccess = () => {
    // Redirect to home page after successful registration
    setLocation("/");
  };

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Register to start accessing the platform
          </p>
        </div>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </div>
      <Toaster />
    </div>
  );
}