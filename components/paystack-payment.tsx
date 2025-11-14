"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

interface PaystackPaymentProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function PaystackPayment({ onSuccess, onBack }: PaystackPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { cart, attendee, completePayment, sessionId } = useSession();

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // const tax = Math.round(subtotal * 0.075);
  const tax = 0;
  const total = subtotal + tax;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get("reference");
    if (reference) {
      const verifyPayment = async () => {
        try {
          setIsProcessing(true);
          const verifyResponse = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference,
              method: "paystack",
            }),
          });

          const verifyResult = await verifyResponse.json();

          if (verifyResult.success && verifyResult.data.status === "success") {
            // Save payment to session
            completePayment("paystack", {
              transactionId: reference,
              amount: total,
              method: "paystack",
            });

            toast.success("Payment successful!");
            onSuccess();
            // Clear URL params
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          } else {
            toast.error("Payment verification failed");
            onBack();
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          toast.error("Failed to verify payment");
          onBack();
        } finally {
          setIsProcessing(false);
        }
      };

      verifyPayment();
    }
  }, [total, completePayment, onSuccess, onBack]);

  const handlePayment = async () => {
    if (!attendee) {
      toast.error("Attendee information is missing");
      return;
    }

    setIsProcessing(true);
    try {
      // Initialize payment with backend
      const response = await fetch("/api/payment/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          method: "paystack",
          amount: total,
          attendeeEmail: attendee.email,
          attendeeName: `${attendee.firstName} ${attendee.lastName}`,
          attendeePhone: attendee.phone || "",
          tickets: cart.map((item) => ({
            ticketType: item.ticketType,
            quantity: item.quantity,
          })),
          callbackUrl: `${window.location.origin}/verify`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      const reference = result.reference as string;
      console.log("Payment reference generated:", reference);

      if (!result.authorization_url) {
        throw new Error("Missing authorization URL");
      }

      console.log("Redirecting to Paystack...");
      window.location.href = result.authorization_url;
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Payment</CardTitle>
        <CardDescription>
          Pay securely with your card using Paystack
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-accent/10 p-4 rounded-lg space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-semibold">Paystack - Card, USSD & More</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subtotal</p>
            <p className="font-semibold">₦{subtotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tax (7.5%)</p>
            <p className="font-semibold">₦{tax.toLocaleString("en-NG")}</p>
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">
              ₦{total.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            🔒 Secure payment powered by Paystack. Your card details are safe
            and encrypted.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isProcessing}>
            Back
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
          >
            {isProcessing ? "Processing..." : "Pay Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
