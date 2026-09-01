import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Building2, MessageSquare, Settings2 } from "lucide-react";
import { getAppSettings, saveAppSettings } from "@/lib/db";
import { useAuth } from "@/contexts/ERPAuthContext";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppSettings } from "@/types/erp";

const businessSchema = z.object({
  businessName: z.string().min(1, "Business name required"),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  mobile: z.string().min(10, "Mobile required"),
  whatsapp: z.string().default(""),
  email: z.string().default(""),
  gst: z.string().default(""),
});

const appSchema = z.object({
  roundingMode: z.enum(["ceiling", "floor", "round"]),
  waxMessageTemplate: z.string().min(1),
  stoneMessageTemplate: z.string().min(1),
  orderNumberPrefix: z.string().min(1, "Order prefix required"),
  orderNumberCounter: z.coerce.number().min(0),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type BusinessValues = z.infer<typeof businessSchema>;
type AppValues = z.infer<typeof appSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ── FieldRow helper ──────────────────────────────────────────────────────────
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-2 text-right">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    businessSettings,
    changePassword,
    updateBusinessSettings,
    updateAppSettings,
  } = useAuth();
  const [appSettings] = useState<AppSettings>(() => getAppSettings());

  const businessForm = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema) as Resolver<BusinessValues>,
    defaultValues: {
      businessName: businessSettings.businessName,
      address: businessSettings.address ?? "",
      city: businessSettings.city ?? "",
      state: businessSettings.state ?? "",
      mobile: businessSettings.mobile,
      whatsapp: businessSettings.whatsapp ?? "",
      email: businessSettings.email ?? "",
      gst: businessSettings.gst ?? "",
    },
  });

  const appForm = useForm<AppValues>({
    resolver: zodResolver(appSchema) as Resolver<AppValues>,
    defaultValues: {
      roundingMode: appSettings.roundingMode,
      waxMessageTemplate: appSettings.waxMessageTemplate,
      stoneMessageTemplate: appSettings.stoneMessageTemplate,
      orderNumberPrefix: appSettings.orderNumberPrefix,
      orderNumberCounter: appSettings.orderNumberCounter,
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema) as Resolver<PasswordValues>,
  });

  const onSaveBusiness = (values: BusinessValues) => {
    try {
      updateBusinessSettings({ ...businessSettings, ...values });
      toast.success("Business settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const onSaveApp = (values: AppValues) => {
    const updated: AppSettings = { ...getAppSettings(), ...values };
    saveAppSettings(updated);
    updateAppSettings(updated);
    toast.success("App settings saved");
  };

  const onChangePassword = (values: PasswordValues) => {
    const ok = changePassword(values.currentPassword, values.newPassword);
    if (ok) {
      toast.success("Password changed");
      passwordForm.reset();
    } else {
      toast.error("Current password is incorrect");
      passwordForm.setError("currentPassword", {
        message: "Incorrect password",
      });
    }
  };

  const DEFAULT_WAX_MSG = `Wax Work Order\nOrder No: {{orderNumber}}\nCustomer: {{party}}\nPattern: {{pattern}}\nOrder Qty: {{orderQuantity}}\nFinished Pieces: {{finishedPieces}}\nTree Size: {{treeSize}}\nNo. of Trees: {{waxTrees}}\n\nPlease complete and inform when done.`;
  const DEFAULT_STONE_MSG = `Stone Setting Work Order\nOrder No: {{orderNumber}}\nCustomer: {{party}}\nPattern: {{pattern}}\nPieces for Setting: {{finishedPieces}}\n\nStone Requirements:\n{{stoneRequirements}}\n\nPlease complete and inform when done.`;

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Settings" }]}
        title="Settings"
        subtitle="Configure your ERP preferences"
      />
      <div className="erp-content">
        <div className="max-w-2xl mx-auto p-4">
          <Tabs defaultValue="business" className="flex flex-col gap-4">
            <div className="border-b border-border">
              <TabsList className="h-8 bg-transparent p-0 gap-0">
                <TabsTrigger
                  value="business"
                  className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Building2 size={12} className="mr-1.5" /> Business
                </TabsTrigger>
                <TabsTrigger
                  value="app"
                  className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Settings2 size={12} className="mr-1.5" /> Application
                </TabsTrigger>
                <TabsTrigger
                  value="messages"
                  className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <MessageSquare size={12} className="mr-1.5" /> WhatsApp
                  Messages
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Business */}
            <TabsContent value="business" className="mt-0 flex flex-col gap-4">
              <div className="card-l1">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Business Information
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={businessForm.handleSubmit(onSaveBusiness)}
                  >
                    Save Business Info
                  </Button>
                </div>
                <Form {...businessForm}>
                  <form className="px-4 py-1">
                    <FieldRow label="Business Name *">
                      <FormField
                        control={businessForm.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Address">
                      <Textarea
                        placeholder="Full address"
                        {...businessForm.register("address")}
                        rows={2}
                        className="text-sm"
                      />
                    </FieldRow>
                    <FieldRow label="City">
                      <FormField
                        control={businessForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="State">
                      <FormField
                        control={businessForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Mobile *">
                      <FormField
                        control={businessForm.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="WhatsApp">
                      <FormField
                        control={businessForm.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Email">
                      <FormField
                        control={businessForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="GST Number">
                      <FormField
                        control={businessForm.control}
                        name="gst"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                  </form>
                </Form>
              </div>

              <div className="card-l1">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Change Password
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={passwordForm.handleSubmit(onChangePassword)}
                  >
                    Change Password
                  </Button>
                </div>
                <Form {...passwordForm}>
                  <form className="px-4 py-1">
                    <FieldRow label="Current Password">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="New Password">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Confirm Password">
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                  </form>
                </Form>
              </div>
            </TabsContent>

            {/* Application */}
            <TabsContent value="app" className="mt-0">
              <div className="card-l1">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Application Settings
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={appForm.handleSubmit(onSaveApp)}
                  >
                    Save App Settings
                  </Button>
                </div>
                <Form {...appForm}>
                  <form className="px-4 py-1">
                    <FieldRow label="Piece Rounding Mode">
                      <FormField
                        control={appForm.control}
                        name="roundingMode"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ceiling">
                                  Ceiling (round up — e.g. 10.1 → 11)
                                </SelectItem>
                                <SelectItem value="floor">
                                  Floor (round down — e.g. 10.9 → 10)
                                </SelectItem>
                                <SelectItem value="round">
                                  Round (standard — 10.5 → 11)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Order Number Prefix">
                      <FormField
                        control={appForm.control}
                        name="orderNumberPrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-8 text-sm w-28"
                                placeholder="ORD"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                    <FieldRow label="Current Counter">
                      <FormField
                        control={appForm.control}
                        name="orderNumberCounter"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                className="h-8 text-sm w-28"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldRow>
                  </form>
                </Form>
              </div>
            </TabsContent>

            {/* WhatsApp Messages */}
            <TabsContent value="messages" className="mt-0">
              <div className="card-l1">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    WhatsApp Message Templates
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={appForm.handleSubmit(onSaveApp)}
                  >
                    Save Templates
                  </Button>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Variables:{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{orderNumber}}"}
                    </code>{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{party}}"}
                    </code>{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{pattern}}"}
                    </code>{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{finishedPieces}}"}
                    </code>{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{waxTrees}}"}
                    </code>{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">
                      {"{{stoneRequirements}}"}
                    </code>
                  </p>
                  <Form {...appForm}>
                    <form className="flex flex-col gap-4">
                      <FormField
                        control={appForm.control}
                        name="waxMessageTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Wax Work Order Message
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={8}
                                className="font-mono text-xs"
                                placeholder={DEFAULT_WAX_MSG}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={appForm.control}
                        name="stoneMessageTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Stone Setting Work Order Message
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={8}
                                className="font-mono text-xs"
                                placeholder={DEFAULT_STONE_MSG}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
