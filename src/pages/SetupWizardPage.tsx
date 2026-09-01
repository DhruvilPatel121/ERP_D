import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/ERPAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { loadDemoData } from "@/lib/db";

const step1Schema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  mobile: z.string().min(10, "Valid mobile number required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gst: z.string().optional(),
});

const step2Schema = z
  .object({
    userId: z.string().min(3, "User ID must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

const STEPS = ["Business Info", "Admin Account", "Ready"];

export default function SetupWizardPage() {
  const { finishSetup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadDemo, setLoadDemo] = useState(true);

  const form1 = useForm<Step1Values>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Values>({ resolver: zodResolver(step2Schema) });

  const handleStep1 = (values: Step1Values) => {
    setStep1Data(values);
    setStep(1);
  };

  const handleStep2 = (values: Step2Values) => {
    if (!step1Data) return;
    finishSetup(values.userId, values.password, {
      businessName: step1Data.businessName,
      logo: "",
      address: step1Data.address || "",
      city: step1Data.city || "",
      state: step1Data.state || "",
      country: "India",
      mobile: step1Data.mobile,
      whatsapp: step1Data.mobile,
      email: step1Data.email || "",
      gst: step1Data.gst || "",
      otherInfo: "",
    });
    if (loadDemo) {
      try {
        loadDemoData();
      } catch {
        /* ignore */
      }
    }
    toast.success("Setup complete! Welcome to Silver ERP.");
    setStep(2);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Silver Jewellery ERP
            </h1>
            <p className="text-xs text-muted-foreground">
              Initial Setup Wizard
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-0 flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 text-center ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-1 mt-[-14px] ${i < step ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          {/* Step 0: Business Info */}
          {step === 0 && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-4">
                Business Information
              </h2>
              <Form {...form1}>
                <form
                  onSubmit={form1.handleSubmit(handleStep1)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={form1.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. ABC Silver Jewellers"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form1.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="9876543210" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form1.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="info@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form1.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Shop address..."
                            rows={2}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form1.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mumbai" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form1.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Maharashtra" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form1.control}
                    name="gst"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="22ABCDE1234F1Z5" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="mt-2">
                    Next <ChevronRight size={16} className="ml-1" />
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* Step 1: Admin Account */}
          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-4">
                Create Admin Account
              </h2>
              <Form {...form2}>
                <form
                  onSubmit={form2.handleSubmit(handleStep2)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={form2.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="admin"
                            autoComplete="username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 6 characters"
                              autoComplete="new-password"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((p) => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Repeat password"
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={loadDemo}
                      onChange={(e) => setLoadDemo(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="text-sm text-foreground">
                        Load demo data
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Pre-populate with sample customers, patterns, and
                        karigars for exploration
                      </p>
                    </div>
                  </label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(0)}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Complete Setup
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Setup Complete!
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Your Silver ERP is ready. Redirecting to dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
