"use client";

import { useState } from "react";
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
import { payWithEtegram } from "etegram-pay";

interface EtegramPaymentProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function EtegramPayment({ onSuccess, onBack }: EtegramPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { cart, attendee, completePayment, sessionId } = useSession();

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // const tax = Math.round(subtotal * 0.075);
  const tax = 0;
  const total = subtotal + tax;

  const handlePayment = async () => {
    if (!attendee) {
      toast.error("Attendee information is missing");
      return;
    }

    setIsProcessing(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_ETEGRAM_PUBLIC_KEY || "";
      const projectId = process.env.NEXT_PUBLIC_ETEGRAM_PROJECT_ID || "";

      if (!publicKey || !projectId) {
        throw new Error(
          "Etegram configuration missing. Set NEXT_PUBLIC_ETEGRAM_PUBLIC_KEY and NEXT_PUBLIC_ETEGRAM_PROJECT_ID."
        );
      }

      // Initialize payment with backend
      const response = await fetch("/api/payment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          method: "etegram",
          amount: total,
          attendeeEmail: attendee.email,
          attendeeName: `${attendee.firstName} ${attendee.lastName}`,
          attendeePhone: attendee.phone,
          tickets: cart.map((item) => ({
            ticketType: item.ticketType,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();
      if (!result?.success) {
        throw new Error(result?.error || "Failed to initialize payment");
      }

      const reference: string = result.reference as string;

      // Open Etegram checkout modal via SDK
      try {
        await payWithEtegram({
          projectID: projectId,
          publicKey: publicKey,
          email: attendee.email,
          amount: total.toString(),
          reference: reference,
          firstname: attendee.firstName,
          lastname: attendee.lastName,
          phone: attendee.phone || "",
        });

        // After successful payment, verify on server
        try {
          const verifyResponse = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: reference,
              method: "etegram",
            }),
          });
          const verifyResult = await verifyResponse.json();

          if (verifyResult.success && verifyResult.data.status === "success") {
            completePayment("etegram", {
              transactionId: reference,
              amount: total,
              method: "etegram",
            });
            toast.success("Payment successful!");
            onSuccess();
          } else {
            console.error("Payment verification failed");
          }
        } catch (err) {
          console.error("Payment verification error:", err);
          toast.error("Failed to verify payment");
        }
      } catch (sdkErr) {
        console.error("[Etegram] SDK error", sdkErr);
        // User closed the modal or payment failed
        toast.info("Payment was cancelled or failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Transfer Payment</CardTitle>
        <CardDescription>
          Complete your payment via bank transfer using Etegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-accent/10 p-4 rounded-lg space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-semibold">Etegram Bank Transfer</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="font-semibold text-lg text-primary">
              ₦{total.toLocaleString()}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            You will be redirected to complete the payment
          </div>
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
