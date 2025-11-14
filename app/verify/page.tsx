"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completePayment } = useSession();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">(
    "verifying"
  );
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verifyPayment = async () => {
      // Get reference from URL
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("failed");
        setMessage("Payment reference not found");
        return;
      }

      try {
        // Verify payment with backend
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference,
            method: "paystack",
          }),
        });

        const result = await response.json();

        if (result.success && result.data.status === "success") {
          // Get pending payment info from localStorage
          const pendingPayment = localStorage.getItem("pendingPayment");
          if (pendingPayment) {
            const paymentInfo = JSON.parse(pendingPayment);

            // Save payment to session
            completePayment("paystack", {
              transactionId: reference,
              amount: paymentInfo.amount,
              method: "paystack",
            });

            // Clear localStorage
            localStorage.removeItem("pendingPayment");
          }

          setStatus("success");
          setMessage("Payment successful! Redirecting...");
          toast.success("Payment successful!");

          // Redirect to success page after 2 seconds
          setTimeout(() => {
            window.location.href =
              "/?trxref=" + reference + "&reference=" + reference;
          }, 2000);
        } else {
          setStatus("failed");
          setMessage(result.message || "Payment verification failed");
          toast.error("Payment verification failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("failed");
        setMessage("Failed to verify payment");
        toast.error("Failed to verify payment");
      }
    };

    verifyPayment();
  }, [searchParams, completePayment, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === "verifying" && (
              <>
                <Loader2 className="h-16 w-16 text-green-600 animate-spin" />
                <p className="text-center text-muted-foreground">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="text-center text-lg font-semibold text-green-700 dark:text-green-400">
                  {message}
                </p>
              </>
            )}

            {status === "failed" && (
              <>
                <XCircle className="h-16 w-16 text-red-500" />
                <p className="text-center text-lg font-semibold text-red-700 dark:text-red-400">
                  {message}
                </p>
                <Button onClick={() => router.push("/")} className="mt-4">
                  Try Again
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-16 w-16 text-green-600 animate-spin" />
                <p className="text-center text-muted-foreground">
                  Verifying your payment...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
