"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { CreatePanelForm } from "@/components/user-form";
import { PaymentCheckout } from "@/components/payment-checkout";
import { SuccessModal } from "@/components/success-modal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
import Image from "next/image";

// Separate component that uses useSearchParams
function PaymentCallbackHandler({
  setShowSuccess,
  setStep,
}: {
  setShowSuccess: (show: boolean) => void;
  setStep: (step: "register" | "payment" | "success") => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const reference = searchParams.get("reference");

    if (paymentStatus === "success" && reference) {
      toast.success("Payment successful!");
      setShowSuccess(true);
      setTimeout(() => {
        setStep("register");
        setShowSuccess(false);
        // Clear URL parameters
        window.history.replaceState({}, "", "/");
      }, 3000);
    } else if (paymentStatus === "failed") {
      toast.error("Payment failed. Please try again.");
      setStep("payment");
      // Clear URL parameters
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, setShowSuccess, setStep]);

  return null;
}

export default function Home() {
  const [step, setStep] = useState<"register" | "payment" | "success">(
    "register"
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [panelData, setPanelData] = useState<any>(null);

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem("flow_step");
      const savedPanel = localStorage.getItem("panel_data");
      if (
        savedStep === "payment" ||
        savedStep === "register" ||
        savedStep === "success"
      ) {
        setStep(savedStep as any);
      }
      if (savedPanel) {
        setPanelData(JSON.parse(savedPanel));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("flow_step", step);
    } catch (e) {}
  }, [step]);

  const handlePanelSubmit = (data: any) => {
    setPanelData(data);
    setStep("payment");
    try {
      localStorage.setItem("panel_data", JSON.stringify(data));
      localStorage.setItem("flow_step", "payment");
    } catch (e) {}
  };

  const handlePaymentSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setStep("register");
      setShowSuccess(false);
      setPanelData(null);
      try {
        localStorage.removeItem("panel_data");
        localStorage.setItem("flow_step", "register");
      } catch (e) {}
    }, 3000);
  };

  const handleReset = () => {
    setPanelData(null);
    setStep("register");
    toast.success("Session reset successfully");
    try {
      localStorage.removeItem("panel_data");
      localStorage.setItem("flow_step", "register");
    } catch (e) {}
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Wrap PaymentCallbackHandler in Suspense */}
      <Suspense fallback={null}>
        <PaymentCallbackHandler
          setShowSuccess={setShowSuccess}
          setStep={setStep}
        />
      </Suspense>

      <Header />

      <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-background p-4 md:p-8 lg:p-12 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
              <div className="space-y-4 z-10 relative text-center md:text-left">
                <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-primary bg-clip-text text-transparent leading-tight">
                  INSTANT OTP CHILD PANEL REGISTRATION
                </h1>
                <p className="text-base md:text-lg lg:text-xl text-foreground leading-relaxed">
                  Register for the InstantOTP child panel and start making money
                  from your own platform.
                </p>
                <p className="text-sm md:text-base text-foreground/80">
                  Join us today and be part of the future of instant SMS
                  verifications.
                </p>
                <div className="flex justify-center md:justify-start gap-4 pt-4">
                  <Button
                    size="lg"
                    className="font-semibold text-lg md:text-xl"
                    onClick={() => {
                      setStep("register");
                      // Scroll to registration section
                      setTimeout(() => {
                        const element =
                          document.getElementById("panel-registration");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
              <div className="relative h-64 pt-0 md:h-64 lg:h-96 flex justify-center md:justify-end">
                <Image
                  src="/images/hero.svg"
                  alt="Hero Image"
                  fill
                  // style={{ objectFit: "cover" }}
                  className=" animate-spin spin-outslow pt-2"
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-primary-foreground/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Mobile Reset Button - Removed, now in OrderSummary */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Main Content */}
          <div
            className="lg:col-span-2 order-1 text-center md:text-left"
            id="panel-registration"
          >
            {step === "register" && (
              <CreatePanelForm onSubmit={handlePanelSubmit} />
            )}
            {step === "payment" && panelData && (
              <PaymentCheckout
                panels={[panelData]}
                userEmail={panelData.ownerEmail}
                userName={panelData.ownerName}
                defaultPhone={panelData.ownerPhone}
                etegramProjectId={
                  process.env.NEXT_PUBLIC_ETEGRAM_PROJECT_ID || ""
                }
                etegramPublicKey={
                  process.env.NEXT_PUBLIC_ETEGRAM_PUBLIC_KEY || ""
                }
                initialPanelId={panelData.id}
              />
            )}
          </div>

          {/* Status Sidebar */}
          <div className="lg:col-span-1 order-2">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">
                Registration Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      step === "register" ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <span
                    className={
                      step === "register"
                        ? "font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Panel Registration
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      step === "payment" ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <span
                    className={
                      step === "payment"
                        ? "font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Payment Processing
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      step === "success" ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <span
                    className={
                      step === "success"
                        ? "font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Registration Complete
                  </span>
                </div>
              </div>
              {step !== "register" && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full mt-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuccess && <SuccessModal />}
    </main>
  );
}
