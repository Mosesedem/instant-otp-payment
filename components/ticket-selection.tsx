"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, Calendar, MapPin, Users, ShoppingCart } from "lucide-react";

// interface TicketSelectionProps {
//   onSelect: (ticketType: string, quantity: number, price: number) => void;
//   openSheet?: boolean;
//   onSheetChange?: (open: boolean) => void;
//   cart: Array<{ ticketType: string; quantity: number; price: number }>;
//   onProceedToCheckout: () => void;
// }

interface TicketSelectionProps {
  onSelect: (ticketType: string, quantity: number, price: number) => void;
  openSheet?: boolean;
  onSheetChange?: (open: boolean) => void;
  cart?: Array<{
    ticketType: string;
    quantity: number;
    price: number;
  }>;
  onProceedToCheckout?: () => void;
}
const TICKET_TYPES = [
  {
    id: "regular",
    name: "REGULAR",
    price: 5000,
    originalPrice: 25000,
    discount: 80,
    description: "Access to all conference days",
    isPopular: true,
    features: [
      "Access to all conference days",
      "Souvenir Goodie Bag",
      "T&C Apply",
    ],
    coverage: [
      {
        title: "Conference Access",
        details:
          "Full access to all conference sessions, workshops, and panel discussions from November 3rd to 8th, 2025.",
      },
      {
        title: "Networking",
        details:
          "Access to networking areas and opportunities to connect with fellow attendees, speakers, and sponsors.",
      },
      {
        title: "Event Materials",
        details:
          "Receive a souvenir goodie bag containing event materials, branded items, and sponsor gifts.",
      },
    ],
  },
  // {
  //   id: "vip",
  //   name: "VIP",
  //   price: 60000,
  //   originalPrice: 60000,
  //   discount: 0,
  //   description: "Reserved seat + Premium benefits",
  //   isPopular: false,
  //   features: [
  //     "Access to all conference days",
  //     "Reserved Seat",
  //     "Lunch Buffet at CEEDAPEG Hotel on Conference Day 1 - 6th November, 2025 alone",
  //     "Souvenir Goodie Bag",
  //     "T&C Apply",
  //   ],
  //   coverage: [
  //     {
  //       title: "Premium Seating",
  //       details:
  //         "Reserved seating in the front rows for all sessions, ensuring the best view and acoustics.",
  //     },
  //     {
  //       title: "Exclusive Lunch",
  //       details:
  //         "Complimentary lunch buffet at CEEDAPEG Hotel on November 6th, 2025. Network with speakers and VIP guests.",
  //     },
  //     {
  //       title: "All Regular Benefits",
  //       details:
  //         "Includes all benefits from the Regular ticket plus exclusive VIP perks and priority access.",
  //     },
  //   ],
  // },
  // {
  //   id: "vvip",
  //   name: "VVIP",
  //   price: 85000,
  //   originalPrice: 85000,
  //   discount: 0,
  //   description: "Unrestricted access to all conferences",
  //   isPopular: false,
  //   features: [
  //     "Unrestricted Access to All Conferences",
  //     "Priority Reserved Seat",
  //     "Lunch Buffet at CEEDAPEG Hotel on Conference Days - 6th & 7th November, 2025",
  //     "Access to networking events",
  //     "Souvenir Goodie Bag",
  //     "T&C Apply",
  //   ],
  //   coverage: [
  //     {
  //       title: "VIP Plus Benefits",
  //       details:
  //         "Everything in VIP plus priority reserved seating, extended lunch access, and exclusive networking events.",
  //     },
  //     {
  //       title: "Extended Dining",
  //       details:
  //         "Lunch buffet on both November 6th and 7th at CEEDAPEG Hotel with premium menu options.",
  //     },
  //     {
  //       title: "Priority Access",
  //       details:
  //         "Skip lines and get priority entry to all sessions, workshops, and special events throughout the week.",
  //     },
  //   ],
  // },
  // {
  //   id: "corporate",
  //   name: "CORPORATE",
  //   price: 250000,
  //   originalPrice: 250000,
  //   discount: 0,
  //   description: "Unrestricted access + Branding",
  //   isPopular: false,
  //   features: [
  //     "Unrestricted Access to All Conferences",
  //     "Access to networking events",
  //     "Access to Deal Room",
  //     "Lunch Buffet at CEEDAPEG Hotel on Conference Days - 6th & 7th November, 2025",
  //     "Priority Reserved Seat",
  //     "Company logo on event programme",
  //     "Share company branded items",
  //     "Souvenir Goodie Bag",
  //     "T&C Apply",
  //   ],
  //   coverage: [
  //     {
  //       title: "Brand Visibility",
  //       details:
  //         "Your company logo featured in the event programme and on digital displays. Distribute branded materials at the event.",
  //     },
  //     {
  //       title: "Deal Room Access",
  //       details:
  //         "Exclusive access to the Deal Room for private meetings with investors, partners, and key stakeholders.",
  //     },
  //     {
  //       title: "Complete Package",
  //       details:
  //         "All VVIP benefits plus corporate branding opportunities and networking in exclusive business lounges.",
  //     },
  //   ],
  // },
  // {
  //   id: "premium",
  //   name: "PREMIUM",
  //   price: 850000,
  //   originalPrice: 850000,
  //   discount: 0,
  //   description: "All-inclusive VIP experience",
  //   isPopular: false,
  //   features: [
  //     "Unrestricted Access all AKTW Events",
  //     "Access to networking events",
  //     "Access to Deal Room",
  //     "Lunch Buffet at CEEDAPEG Hotel on Conference Days - 6th & 7th November, 2025",
  //     "Priority Reserved Seat",
  //     "Company logo on event programme",
  //     "Share company branded items",
  //     "Souvenir Goodie Bag",
  //     "Airport Pickup and Drop off",
  //     "3 nights Diplomatic Suite Accommodation at CEEDAPEG Hotel (5th to 8th November, 2025)",
  //     "T&C Apply",
  //   ],
  //   coverage: [
  //     {
  //       title: "Luxury Accommodation",
  //       details:
  //         "3 nights in a Diplomatic Suite at CEEDAPEG Hotel (November 5-8, 2025) with full amenities and room service.",
  //     },
  //     {
  //       title: "VIP Transportation",
  //       details:
  //         "Complimentary airport pickup and drop-off service in luxury vehicles for seamless travel experience.",
  //     },
  //     {
  //       title: "Ultimate Experience",
  //       details:
  //         "The complete AKTW2025 experience with all Corporate benefits plus accommodation and transportation.",
  //     },
  //   ],
  // },
];

export function TicketSelection({
  onSelect,
  openSheet,
  cart,
  onProceedToCheckout,
  onSheetChange,
}: TicketSelectionProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSheetOpen, setIsSheetOpen] = useState(openSheet || false);

  // Sync external control with internal state
  useEffect(() => {
    if (openSheet !== undefined) {
      setIsSheetOpen(openSheet);
    }
  }, [openSheet]);

  // Sync selectedTicket with cart if cart has items but local state doesn't
  useEffect(() => {
    const first = cart?.[0];
    if (first && !selectedTicket) {
      setSelectedTicket(first.ticketType);
    }
  }, [cart, selectedTicket]);

  const handleSheetChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (onSheetChange) {
      onSheetChange(open);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicket(ticketId);
    const ticket = TICKET_TYPES.find((t) => t.id === ticketId);
    if (ticket) {
      onSelect(ticketId, quantity, ticket.price);
      handleSheetChange(false);
    }
  };
  const hasCartItems = (cart?.length ?? 0) > 0;
  // const hasCartItems = cart?.length > 0;

  return (
    <div className="space-y-4">
      {/* Event Info Card */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400">
                Akwa Ibom Tech Week 2025
              </CardTitle>
              <p className="text-sm md:text-base text-muted-foreground">
                Catalyzing Digital Transformation for Innovation, Investment and
                Impact
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="font-medium">03 - 08 November 2025</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              <span className="font-medium">CEEDAPEG Hotels, Uyo</span>
            </div>
          </div>

          <div className="pt-3 border-t">
            {hasCartItems ? (
              <Button
                onClick={onProceedToCheckout}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-base md:text-lg h-12 md:h-14"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Complete Payment
              </Button>
            ) : (
              <Sheet open={isSheetOpen} onOpenChange={handleSheetChange}>
                <SheetTrigger asChild>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-base md:text-lg h-12 md:h-14">
                    Buy Ticket - Get Upto 80% Off
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="h-[90vh] sm:h-[85vh] sm:max-w-2xl sm:mx-auto overflow-y-auto p-6"
                >
                  <SheetHeader className="pb-4 border-b sticky top-0 bg-background z-10">
                    <SheetTitle className="text-lg md:text-xl font-bold text-orange-600">
                      Select Your Ticket Package
                    </SheetTitle>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      All packages include 40% discount. Choose the one that
                      fits your needs.
                    </p>
                  </SheetHeader>

                  <div className="space-y-3 py-4">
                    {TICKET_TYPES.map((ticket) => (
                      <Card
                        key={ticket.id}
                        className={`relative cursor-pointer transition-all hover:shadow-md ${
                          selectedTicket === ticket.id
                            ? "ring-2 ring-orange-600 border-orange-600"
                            : "hover:border-orange-300"
                        }`}
                        onClick={() => handleSelectTicket(ticket.id)}
                      >
                        {ticket.isPopular && (
                          <Badge className="absolute -top-2 right-4 bg-green-600 hover:bg-green-700 text-white">
                            POPULAR
                          </Badge>
                        )}
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base md:text-lg font-bold text-orange-600">
                                {ticket.name}
                              </CardTitle>
                              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                                {ticket.description}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-bold text-orange-600">
                              ₦{ticket.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              ₦{ticket.originalPrice.toLocaleString()}
                            </span>
                            <Badge
                              variant="outline"
                              className="ml-auto text-green-600 border-green-600"
                            >
                              {ticket.discount}% OFF
                            </Badge>
                          </div>

                          {/* Features List */}
                          <div className="space-y-2 pt-2">
                            {ticket.features.slice(0, 3).map((feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-xs md:text-sm"
                              >
                                <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Coverage Accordion */}
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                          >
                            <AccordionItem
                              value="features"
                              className="border-0"
                            >
                              <AccordionTrigger
                                className="text-xs md:text-sm font-semibold text-orange-600 hover:no-underline py-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View All Features ({ticket.features.length})
                              </AccordionTrigger>

                              <AccordionContent className="space-y-2 pt-2">
                                {ticket.features.map((feature, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 text-xs md:text-sm"
                                  >
                                    <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      {feature}
                                    </span>
                                  </div>
                                ))}
                              </AccordionContent>
                            </AccordionItem>

                            {/* <AccordionItem value="coverage" className="border-0">
                            <AccordionTrigger className="text-xs md:text-sm font-semibold text-orange-600 hover:no-underline py-2">
                              Coverage Details
                            </AccordionTrigger>
                            <AccordionContent>
                              <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                              >
                                {ticket.coverage.map((item, idx) => (
                                  <AccordionItem
                                    key={idx}
                                    value={`item-${idx}`}
                                    className="border-b last:border-0"
                                  >
                                    <AccordionTrigger className="text-xs md:text-sm py-3 hover:no-underline">
                                      {item.title}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-xs md:text-sm text-muted-foreground pb-3">
                                      {item.details}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </AccordionContent>
                          </AccordionItem> */}
                          </Accordion>

                          <Button
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTicket(ticket.id);
                            }}
                          >
                            Get Ticket
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Ticket Summary */}
      {/* {selectedTicket && !isSheetOpen && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-semibold">
                    {TICKET_TYPES.find((t) => t.id === selectedTicket)?.name}{" "}
                    Selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₦
                    {TICKET_TYPES.find(
                      (t) => t.id === selectedTicket
                    )?.price.toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSheetOpen(true)}
                className="text-xs"
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}
