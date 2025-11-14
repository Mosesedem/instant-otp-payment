"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { payWithEtegram } from "etegram-pay";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SETUP_FEE = 15000;
const MONTHLY_SERVICE_FEE = 5000;
const ANNUAL_SERVICE_FEE = 60000;

const plans = [
  {
    id: "monthly" as const,
    title: "Monthly Plan",
    description: "Best for trying out the platform",
    serviceFee: MONTHLY_SERVICE_FEE,
    badge: "Popular",
  },
  {
    id: "annual" as const,
    title: "Annual Plan",
    description: "Pay once and focus on growth",
    serviceFee: ANNUAL_SERVICE_FEE,
    badge: "Most value",
  },
];

type PlanId = (typeof plans)[number]["id"];
type PaymentProvider = "paystack" | "etegram";

type PanelSummary = {
  id: string;
  name: string | null;
  subdomain: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";
};

interface PaymentCheckoutProps {
  panels: PanelSummary[];
  userEmail: string;
  userName?: string | null;
  defaultPhone?: string | null;
  etegramProjectId: string;
  etegramPublicKey: string;
  initialPanelId?: string;
}

export function PaymentCheckout({
  panels,
  userEmail,
  userName,
  defaultPhone,
  etegramProjectId,
  etegramPublicKey,
  initialPanelId,
}: PaymentCheckoutProps) {
  const router = useRouter();
  const firstSelectablePanelId = useMemo(() => {
    if (initialPanelId) {
      const preferred = panels.find((panel) => panel.id === initialPanelId);
      if (preferred && preferred.paymentStatus !== "COMPLETED") {
        return preferred.id;
      }
    }

    const firstPending = panels.find(
      (panel) => panel.paymentStatus !== "COMPLETED"
    );
    if (firstPending) {
      return firstPending.id;
    }

    if (initialPanelId) {
      const existing = panels.find((panel) => panel.id === initialPanelId);
      if (existing) {
        return existing.id;
      }
    }

    return panels[0]?.id ?? "";
  }, [initialPanelId, panels]);
  const [selectedPanel, setSelectedPanel] = useState(firstSelectablePanelId);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [paymentProvider, setPaymentProvider] =
    useState<PaymentProvider>("paystack");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [firstName, setFirstName] = useState(userName?.split(" ")?.[0] ?? "");
  const [lastName, setLastName] = useState(
    userName?.split(" ")?.slice(1).join(" ") ?? ""
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load saved form data from localStorage
  useEffect(() => {
    const loadFormData = () => {
      try {
        const savedPhone = localStorage.getItem('payment_phone');
        const savedFirstName = localStorage.getItem('payment_firstName');
        const savedLastName = localStorage.getItem('payment_lastName');
        const savedPanel = localStorage.getItem('payment_selectedPanel');
        const savedPlan = localStorage.getItem('payment_plan');
        const savedProvider = localStorage.getItem('payment_provider');

        if (savedPhone) setPhone(savedPhone);
        if (savedFirstName) setFirstName(savedFirstName);
        if (savedLastName) setLastName(savedLastName);
        if (savedPanel && panels.some(p => p.id === savedPanel)) setSelectedPanel(savedPanel);
        if (savedPlan && (savedPlan === 'monthly' || savedPlan === 'annual')) setPlan(savedPlan as PlanId);
        if (savedProvider && (savedProvider === 'paystack' || savedProvider === 'etegram')) setPaymentProvider(savedProvider as PaymentProvider);
      } catch (err) {
        console.error('Failed to load form data from localStorage', err);
      }
    };
    loadFormData();
  }, [panels]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const saveFormData = () => {
      try {
        localStorage.setItem('payment_phone', phone);
        localStorage.setItem('payment_firstName', firstName);
        localStorage.setItem('payment_lastName', lastName);
        localStorage.setItem('payment_selectedPanel', selectedPanel);
        localStorage.setItem('payment_plan', plan);
        localStorage.setItem('payment_provider', paymentProvider);
      } catch (err) {
        console.error('Failed to save form data to localStorage', err);
      }
    };
    saveFormData();
  }, [phone, firstName, lastName, selectedPanel, plan, paymentProvider]);

  useEffect(() => {
    setSelectedPanel(firstSelectablePanelId);
  }, [firstSelectablePanelId]);

  const totals = useMemo(() => {
    const planConfig = plans.find((p) => p.id === plan) ?? plans[0];
    const serviceFee = planConfig.serviceFee;
    return {
      setupFee: SETUP_FEE,
      serviceFee,
      total: SETUP_FEE + serviceFee,
    };
  }, [plan]);

  const selectedPanelInfo = panels.find((panel) => panel.id === selectedPanel);
  const pendingPanels = panels.filter(
    (panel) => panel.paymentStatus !== "COMPLETED"
  );
  const isSelectedPanelPaid = selectedPanelInfo?.paymentStatus === "COMPLETED";

  const disabled =
    !selectedPanel ||
    (paymentProvider === "etegram" && (!phone || !firstName || !lastName)) ||
    isProcessing;

  const getButtonText = () => {
    if (isProcessing) return "Processing...";
    if (!selectedPanel) return "Select a Panel";
    if (paymentProvider === "etegram" && !phone) return "Enter Phone Number";
    if (paymentProvider === "etegram" && !firstName) return "Enter First Name";
    if (paymentProvider === "etegram" && !lastName) return "Enter Last Name";
    return isSelectedPanelPaid ? "Payment Completed" : "Proceed to Payment";
  };

  async function handleSubmit() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const endpoint =
        paymentProvider === "paystack"
          ? "/api/payments/initiate/paystack"
          : "/api/payments/initiate";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: selectedPanel, plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to start payment");
      }

      if (paymentProvider === "paystack") {
        // Redirect to Paystack checkout
        window.location.href = data.checkoutUrl;
        return;
      }

      // Handle Etegram payment
      await payWithEtegram({
        projectID: etegramProjectId,
        publicKey: etegramPublicKey,
        phone,
        firstname: firstName,
        lastname: lastName,
        email: userEmail,
        amount: String(data?.pricing?.total ?? totals.total),
        reference: data?.reference,
      });

      setSuccessMessage(
        "Payment started successfully. Once completed, return to the status page to verify."
      );
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start payment";
      setError(message);
      console.error(`${paymentProvider} payment error`, err);
    } finally {
      setIsProcessing(false);
    }
  }

  if (panels.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <CardTitle>No panels pending payment</CardTitle>
          <CardDescription>
            Create a panel first, then return here to complete payment.
          </CardDescription>
          <Button onClick={() => router.push("/create")}>Create Panel</Button>
        </CardContent>
      </Card>
    );
  }

  if (pendingPanels.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <CardTitle>All set!</CardTitle>
          <CardDescription>
            All your panels have active payments. You can review their status on
            the dashboard.
          </CardDescription>
          <div className="flex justify-center gap-3">
            <Button onClick={() => router.push("/status")}>View status</Button>
            <Button variant="outline" onClick={() => router.push("/create")}>
              Create another panel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500/40 bg-green-500/10">
          <AlertDescription className="text-green-600">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Choose Panel</CardTitle>
          <CardDescription>
            Payments are linked to each panel. Select the panel you want to
            activate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            {panels.map((panelOption) => {
              const isSelected = selectedPanel === panelOption.id;
              const isPaid = panelOption.paymentStatus === "COMPLETED";
              return (
                <button
                  key={panelOption.id}
                  type="button"
                  onClick={() => !isPaid && setSelectedPanel(panelOption.id)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                    isPaid && "cursor-not-allowed opacity-60"
                  )}
                  disabled={isPaid}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {panelOption.name || "Untitled Panel"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {panelOption.subdomain}.instantotp.com
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        panelOption.paymentStatus === "COMPLETED"
                          ? "text-green-600"
                          : "text-amber-600"
                      )}
                    >
                      {panelOption.paymentStatus === "COMPLETED"
                        ? "Paid"
                        : "Payment pending"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Plan</CardTitle>
          <CardDescription>
            Pay a one-time setup fee of ₦15,000 plus your preferred hosting
            plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((planOption) => {
              const isSelected = plan === planOption.id;
              return (
                <button
                  key={planOption.id}
                  type="button"
                  onClick={() => setPlan(planOption.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{planOption.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {planOption.description}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {planOption.badge}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">
                    ₦{planOption.serviceFee.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Billed {planOption.id === "annual" ? "yearly" : "monthly"}
                  </p>
                </button>
              );
            })}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold">Payment Method</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentProvider("paystack")}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  paymentProvider === "paystack"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                    P
                  </div>
                  <div>
                    <p className="font-semibold">Paystack</p>
                    <p className="text-sm text-muted-foreground">
                      Pay with card, bank transfer, or USSD
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentProvider("etegram")}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  paymentProvider === "etegram"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold text-sm">
                    E
                  </div>
                  <div>
                    <p className="font-semibold">Etegram</p>
                    <p className="text-sm text-muted-foreground">
                      Pay with mobile money or card
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold">Billing Contact</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 08012345678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Setup Fee</span>
            <span>₦{totals.setupFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>
              Hosting ({plan === "annual" ? "Annual" : "Monthly"} Plan)
            </span>
            <span>₦{totals.serviceFee.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total Due Today</span>
            <span>₦{totals.total.toLocaleString()}</span>
          </div>
          <Button
            type="submit"
            className="w-full mt-6"
            size="lg"
            disabled={disabled || isSelectedPanelPaid}
            onClick={handleSubmit}
          >
            {getButtonText()}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by{" "}
            {paymentProvider === "paystack" ? "Paystack" : "Etegram"}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
