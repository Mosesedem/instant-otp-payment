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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EtegramPayment } from "@/components/etegram-payment";
import { PaystackPayment } from "@/components/paystack-payment";
import { CreditCard, Building2, Check } from "lucide-react";

interface PaymentOptionsProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function PaymentOptions({ onSuccess, onBack }: PaymentOptionsProps) {
  // Get cart from session to compute total
  const { cart } = require("@/hooks/use-session").useSession();
  const subtotal = cart.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );
  // const tax = Math.round(subtotal * 0.075);
  const tax = 0;
  const total = subtotal + tax;

  const [selectedPayment, setSelectedPayment] = useState<
    "etegram" | "paystack" | null
  >(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Disable paystack if total > 499999
  const paystackDisabled = total > 499999;

  const handlePaymentSelect = (method: "etegram" | "paystack") => {
    if (method === "paystack" && paystackDisabled) return;
    setSelectedPayment(method);
    setIsSheetOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsSheetOpen(false);
    onSuccess();
  };

  const handleBack = () => {
    if (selectedPayment && isSheetOpen) {
      setIsSheetOpen(false);
      setSelectedPayment(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-orange-600">
            Choose Payment Method
          </CardTitle>
          <CardDescription className="text-sm">
            Select how you'd like to pay for your ticket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                selectedPayment === "paystack"
                  ? "ring-2 ring-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950/20"
                  : "hover:border-orange-300"
              } ${paystackDisabled ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => handlePaymentSelect("paystack")}
              aria-disabled={paystackDisabled}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg">
                      Paystack
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Card, USSD & More
                    </CardDescription>
                  </div>
                  {selectedPayment === "paystack" && (
                    <Check className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Pay with card, USSD, bank transfer, or other methods
                  {paystackDisabled && (
                    <span className="block text-xs text-destructive font-semibold mt-1">
                      Disabled for payments above ₦500,000. Use Etegram.
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded">
                    Instant
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded">
                    Secure
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                selectedPayment === "etegram"
                  ? "ring-2 ring-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950/20"
                  : "hover:border-orange-300"
              }`}
              onClick={() => handlePaymentSelect("etegram")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg">
                      Etegram
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Bank Transfer
                    </CardDescription>
                  </div>
                  {selectedPayment === "etegram" && (
                    <Check className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Direct bank transfer payment option
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded">
                    Reliable
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded">
                    Verified
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[95vh] sm:h-auto sm:max-w-2xl sm:mx-auto overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="text-base md:text-lg text-orange-600">
              {selectedPayment === "paystack"
                ? "Card Payment"
                : "Bank Transfer Payment"}
            </SheetTitle>
          </SheetHeader>

          <div className="py-4">
            {selectedPayment === "paystack" && (
              <PaystackPayment
                onSuccess={handlePaymentSuccess}
                onBack={handleBack}
              />
            )}
            {selectedPayment === "etegram" && (
              <EtegramPayment
                onSuccess={handlePaymentSuccess}
                onBack={handleBack}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
