"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { TicketSelection } from "@/components/ticket-selection";
import { CreatePanelForm } from "@/components/user-form";
import { PaymentOptions } from "@/components/payment-options";
import { OrderSummary } from "@/components/order-summary";
import { SuccessModal } from "@/components/success-modal";
import { useSession } from "@/hooks/use-session";
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
  setStep: (step: "tickets" | "attendee" | "payment" | "success") => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const reference = searchParams.get("reference");

    if (paymentStatus === "success" && reference) {
      toast.success("Payment successful!");
      setShowSuccess(true);
      setTimeout(() => {
        setStep("tickets");
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
  const [step, setStep] = useState<
    "tickets" | "attendee" | "payment" | "success"
  >("tickets");
  const {
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    updateAttendee,
    resetSession,
    getSession,
  } = useSession();
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);

  const handleTicketSelect = (
    ticketType: string,
    quantity: number,
    price: number
  ) => {
    addToCart(ticketType, quantity, price);
    setStep("attendee");
  };

  const handleAttendeeSubmit = (data: any) => {
    updateAttendee(data);
    setStep("payment");
  };

  const handlePaymentSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setStep("tickets");
      setShowSuccess(false);
    }, 3000);
  };

  const handleReset = () => {
    resetSession();
    setStep("tickets");
    toast.success("Session reset successfully");
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      toast.error("Please select tickets first");
      return;
    }
    setStep("attendee");
    const element = document.getElementById("ticket-selection");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  // Sync high-level step and cart to DB for status tracking
  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();
    fetch("/api/session/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSession().sessionId,
        cart,
        lastStep: step,
        status: step === "success" ? "completed" : "in_progress",
      }),
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => {});
    return () => controller.abort();
  }, [step, cart, getSession]);

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
        <div className="hidden lg:block mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-background p-8 md:p-12 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 z-10 relative">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-primary bg-clip-text text-transparent leading-tight">
                  INSTANT OTP CHILD PANEL REGISTRATION
                </h1>
                <p className="text-lg md:text-xl text-foreground leading-relaxed">
                  Register for the InstantOTP child panel and start making money
                  from your own platform.
                </p>
                <p className="text-base text-foreground/80">
                  Join us today and be part of the future of instant SMS
                  verifications.
                </p>
                <div className="flex gap-4 pt-4">
                  <Button
                    size="lg"
                    className="font-semibold text-xl"
                    onClick={() => {
                      setTicketSheetOpen(true);
                      // Also scroll to ticket section
                      setTimeout(() => {
                        const element =
                          document.getElementById("ticket-selection");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
              <div className="relative h-64 md:h-96">
                <Image
                  src="/images/hero.svg"
                  alt="Hero Image"
                  layout="fill"
                  // objectFit="cover"
                  className="rounded-xl animate-spin spin-outslow"
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Mobile Reset Button - Removed, now in OrderSummary */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 order-1" id="ticket-selection">
            {step === "tickets" && (
              // <TicketSelection
              //   onSelect={handleTicketSelect}
              //   openSheet={ticketSheetOpen}
              //   onSheetChange={setTicketSheetOpen}
              // />
              <TicketSelection
                onSelect={handleTicketSelect}
                openSheet={ticketSheetOpen}
                onSheetChange={setTicketSheetOpen}
                cart={cart}
                onProceedToCheckout={handleProceedToCheckout}
              />
            )}
            {step === "attendee" && <CreatePanelForm />}
            {step === "payment" && (
              <PaymentOptions
                onSuccess={handlePaymentSuccess}
                onBack={() => setStep("attendee")}
              />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 order-2">
            <OrderSummary
              cart={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeFromCart}
              onReset={handleReset}
              onProceedToCheckout={handleProceedToCheckout}
            />
          </div>
        </div>
      </div>

      {showSuccess && <SuccessModal />}
    </main>
  );
}
