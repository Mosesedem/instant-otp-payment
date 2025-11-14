"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventMap } from "@/components/event-map";
import {
  MapPin,
  Calendar,
  Ticket,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";

interface OrderSummaryProps {
  cart: Array<{
    ticketType: string;
    quantity: number;
    price: number;
  }>;
  onUpdateQuantity?: (ticketType: string, quantity: number) => void;
  onRemoveItem?: (ticketType: string) => void;
  onReset?: () => void;
  onProceedToCheckout?: () => void;
}

const TICKET_NAMES: Record<string, string> = {
  regular: "Regular",
  vip: "VIP",
  vvip: "VVIP",
  corporate: "Corporate",
  premium: "Premium",
};

export function OrderSummary({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onReset,
  onProceedToCheckout,
}: OrderSummaryProps) {
  const [editMode, setEditMode] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // const tax = Math.round(subtotal * 0.075);
  const tax = 0;
  const total = subtotal + tax;

  const handleReset = () => {
    setShowResetDialog(true);
  };

  const handleQuantityChange = (ticketType: string, newQuantity: number) => {
    if (newQuantity >= 0 && onUpdateQuantity) {
      onUpdateQuantity(ticketType, newQuantity);
    }
  };

  const handleRemoveItem = (ticketType: string) => {
    if (onRemoveItem) {
      onRemoveItem(ticketType);
    }
  };

  return (
    <div className="space-y-4">
      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowResetDialog(false)}
          />
          <div className="relative z-10 w-[90%] max-w-md rounded-lg bg-white p-5 shadow-lg border">
            <h3 className="text-base md:text-lg font-semibold mb-1">
              Reset session?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will clear your current cart and form progress saved for this
              session on this device. Successful purchases, if any, are
              preserved.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  setShowResetDialog(false);
                  onReset?.();
                }}
              >
                Reset Now
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile: Compact Summary */}
      <Card className="lg:sticky lg:top-8 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Order Summary
            </CardTitle>
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="text-xs"
                >
                  {editMode ? "Done" : "Edit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-2 w-2 mr-0" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No tickets selected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select a ticket package to continue
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-semibold text-primary">
                            {TICKET_NAMES[item.ticketType]}
                          </span>
                          {!editMode && (
                            <span className="text-muted-foreground">
                              {" "}
                              × {item.quantity}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>

                      {editMode && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1 border rounded-md">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                handleQuantityChange(
                                  item.ticketType,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item.ticketType,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-7 w-12 text-center border-0 p-0 text-xs"
                              min="1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                handleQuantityChange(
                                  item.ticketType,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveItem(item.ticketType)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ₦{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (7.5%)</span>
                  <span className="font-medium">
                    ₦{tax.toLocaleString("en-NG")}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 bg-accent -mx-6 px-6 pb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base">Total</span>
                  <span className="text-xl md:text-2xl font-bold text-primary">
                    ₦{total.toLocaleString()}
                  </span>
                </div>

                {/* Action Buttons */}
                {/* <div className="space-y-2">
                  <Button
                    onClick={onProceedToCheckout}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Complete Payment
                  </Button> */}

                {/* <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-primary/30 text-primary hover:bg-accent"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Reset Session
                  </Button> */}
                {/* </div> */}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Details Card */}
      <Card className="border-primary/20 hidden lg:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Date</p>
            <p className="font-semibold">03 - 08 November 2025</p>
            <p className="text-xs text-muted-foreground">10:00 AM Daily</p>
          </div>
          <div className="border-t pt-3">
            <p className="text-muted-foreground text-xs mb-1">Location</p>
            <p className="font-semibold">CEEDAPEG Hotels</p>
            <p className="text-xs text-muted-foreground">
              Chief Odiong Street, Uyo, Nigeria
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-3 border-primary text-primary hover:bg-accent"
            onClick={() =>
              window.open(
                "https://maps.google.com/?q=CEEDAPEG+Hotels+Uyo",
                "_blank"
              )
            }
          >
            <MapPin className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
        </CardContent>
      </Card>

      {/* Map */}
      <div className="hidden lg:block">
        <EventMap
          eventName="Akwa Ibom Tech Week 2025"
          eventAddress="CEEDAPEG Hotels, Chief Odiong Street, Uyo, Nigeria"
        />
      </div>
    </div>
  );
}
