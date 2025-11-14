"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { useSession } from "@/hooks/use-session";

interface AttendeeFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  cart?: Array<{
    ticketType: string;
    quantity: number;
    price: number;
  }>;
}

export function AttendeeForm({
  onSubmit,
  onBack,
  cart = [],
}: AttendeeFormProps) {
  // Calculate total number of attendees
  const totalAttendees = cart.reduce((sum, item) => sum + item.quantity, 0);
  const { sessionId } = useSession();
  const STORAGE_KEY = useMemo(
    () => `attendee_form_state_${sessionId}`,
    [sessionId]
  );

  const [currentAttendeeIndex, setCurrentAttendeeIndex] = useState(0);
  const [allAttendees, setAllAttendees] = useState<any[]>(
    Array(Math.max(totalAttendees, 1))
      .fill(null)
      .map(() => ({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
      }))
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
  });

  // Track hydration precedence (local vs server) to avoid clobbering user input
  const lastHydratedAtRef = useRef<number>(0);
  const hasHydratedRef = useRef<boolean>(false);

  // Load persisted form state if available
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        currentIndex: number;
        allAttendees: any[];
        formData: typeof formData;
        totalAttendees: number;
        version?: number;
        updatedAt?: string;
      };

      // Reconcile saved attendees with current required total
      let restored = saved.allAttendees || [];
      if (totalAttendees > restored.length) {
        // pad with blanks
        const toAdd = totalAttendees - restored.length;
        restored = restored.concat(
          Array(toAdd)
            .fill(null)
            .map(() => ({
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              company: "",
              jobTitle: "",
            }))
        );
      } else if (totalAttendees > 0 && totalAttendees < restored.length) {
        restored = restored.slice(0, totalAttendees);
      }

      setAllAttendees(restored);
      const idx = Math.min(
        Math.max(0, saved.currentIndex ?? 0),
        Math.max(0, totalAttendees - 1)
      );
      setCurrentAttendeeIndex(idx);
      setFormData(
        saved.formData ||
          restored[idx] || {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
            jobTitle: "",
          }
      );
      // Remember last hydration timestamp (prefer server if it's newer)
      if (saved.updatedAt) {
        const ts = Date.parse(saved.updatedAt);
        if (!Number.isNaN(ts)) lastHydratedAtRef.current = ts;
      }
      hasHydratedRef.current = true;
    } catch {
      // ignore corrupted storage
    }
    // Re-evaluate when session or attendee count changes
  }, [STORAGE_KEY, totalAttendees]);

  // Persist form state on changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        version: 1,
        currentIndex: currentAttendeeIndex,
        allAttendees,
        formData,
        totalAttendees,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore write errors (e.g. storage full)
    }
  }, [
    STORAGE_KEY,
    currentAttendeeIndex,
    allAttendees,
    formData,
    totalAttendees,
  ]);

  // Prefill from server if available and more recent than local/browser copy
  useEffect(() => {
    let aborted = false;
    if (!sessionId) return;
    // Fetch once per session/attendee-count change
    const fetchDraft = async () => {
      try {
        const res = await fetch(
          `/api/session/sync?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        if (!res.ok) return;
        const json = await res.json();
        const record = json?.data;
        if (!record) return;
        const serverUpdatedAt = record?.updatedAt
          ? Date.parse(record.updatedAt)
          : 0;
        // If session marked completed, don't hydrate
        if (
          record?.status &&
          String(record.status).toLowerCase() === "completed"
        )
          return;
        const draft = record?.draft;
        // If server has no draft, try attendee snapshot fallback (first attendee only)
        if (!draft && record?.attendee) {
          const a = record.attendee as any;
          const first = {
            firstName: a?.firstName || "",
            lastName: a?.lastName || "",
            email: a?.email || "",
            phone: a?.phone || "",
            company: a?.company || "",
            jobTitle: a?.jobTitle || "",
          };
          if (aborted) return;
          setAllAttendees([first]);
          setCurrentAttendeeIndex(0);
          setFormData(first);
          lastHydratedAtRef.current = serverUpdatedAt || Date.now();
          hasHydratedRef.current = true;
          return;
        }
        // If server has no draft at all, nothing to hydrate
        if (!draft) return;
        // Only apply if it's newer than what we hydrated
        if (serverUpdatedAt <= (lastHydratedAtRef.current || 0)) return;

        // Draft shape expected: { version, currentIndex, totalAttendees, formData, allAttendees }
        const saved = draft as {
          currentIndex?: number;
          allAttendees?: any[];
          formData?: typeof formData;
          totalAttendees?: number;
        };

        // Reconcile attendee list length with current cart
        let restored: any[] = Array.isArray(saved.allAttendees)
          ? [...saved.allAttendees]
          : [];
        if (totalAttendees > restored.length) {
          const toAdd = totalAttendees - restored.length;
          restored = restored.concat(
            Array(toAdd)
              .fill(null)
              .map(() => ({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                company: "",
                jobTitle: "",
              }))
          );
        } else if (totalAttendees > 0 && totalAttendees < restored.length) {
          restored = restored.slice(0, totalAttendees);
        }

        if (aborted) return;
        setAllAttendees(restored);
        const idx = Math.min(
          Math.max(0, saved.currentIndex ?? 0),
          Math.max(0, totalAttendees - 1)
        );
        setCurrentAttendeeIndex(idx);
        setFormData(
          saved.formData ||
            restored[idx] || {
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              company: "",
              jobTitle: "",
            }
        );
        lastHydratedAtRef.current = serverUpdatedAt || Date.now();
        hasHydratedRef.current = true;
      } catch {
        // ignore network/server errors
      }
    };
    fetchDraft();
    return () => {
      aborted = true;
    };
  }, [sessionId, totalAttendees]);

  // Also sync draft progress to server (debounced)
  const syncTimer = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionId) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      const draft = {
        version: 1,
        currentIndex: currentAttendeeIndex,
        totalAttendees,
        formData,
        allAttendees,
      };
      fetch("/api/session/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          lastStep: "attendee",
          status: "in_progress",
          draft,
        }),
        cache: "no-store",
      }).catch(() => {});
    }, 700);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [sessionId, currentAttendeeIndex, totalAttendees, formData, allAttendees]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      // Save current attendee data
      const updatedAttendees = [...allAttendees];
      updatedAttendees[currentAttendeeIndex] = formData;

      // Check if this is the last attendee
      if (currentAttendeeIndex < totalAttendees - 1) {
        // Save and move to next attendee
        setAllAttendees(updatedAttendees);
        setCurrentAttendeeIndex(currentAttendeeIndex + 1);
        // Load next attendee's data or clear form
        setFormData(
          updatedAttendees[currentAttendeeIndex + 1] || {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
            jobTitle: "",
          }
        );
        setErrors({});
      } else {
        // All attendees completed, submit all data
        setAllAttendees(updatedAttendees);
        // Persist final set too
        try {
          const payload = {
            version: 1,
            currentIndex: currentAttendeeIndex,
            allAttendees: updatedAttendees,
            formData,
            totalAttendees,
            updatedAt: new Date().toISOString(),
          };
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          }
        } catch {}
        onSubmit({
          attendees: updatedAttendees,
          primaryAttendee: updatedAttendees[0], // For backward compatibility
          ...updatedAttendees[0], // Spread first attendee as main contact
        });
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handlePrevious = () => {
    if (currentAttendeeIndex > 0) {
      // Save current data before going back
      const updatedAttendees = [...allAttendees];
      updatedAttendees[currentAttendeeIndex] = formData;
      setAllAttendees(updatedAttendees);

      // Go to previous attendee
      setCurrentAttendeeIndex(currentAttendeeIndex - 1);
      setFormData(updatedAttendees[currentAttendeeIndex - 1]);
      setErrors({});
    } else {
      onBack();
    }
  };

  // Reset dialog state and handler
  const [showResetDialog, setShowResetDialog] = useState(false);
  const doReset = async () => {
    try {
      // Clear browser cache
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      // Clear server draft
      if (sessionId) {
        await fetch("/api/session/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            draft: null,
            attendee: null,
            lastStep: null,
          }),
        });
      }
    } catch {}
    // Reset in-memory state
    setAllAttendees(
      Array(Math.max(totalAttendees, 1))
        .fill(null)
        .map(() => ({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          company: "",
          jobTitle: "",
        }))
    );
    setCurrentAttendeeIndex(0);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
    });
    setErrors({});
    lastHydratedAtRef.current = Date.now();
    setShowResetDialog(false);
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-orange-600">
          {(() => {
            if (totalAttendees <= 0) return "Attendee Information";
            // Build expanded label list based on cart quantities
            const expanded: string[] = [];
            cart.forEach((item) => {
              for (let i = 0; i < item.quantity; i++)
                expanded.push(item.ticketType);
            });
            // Guard: if indexes mismatch, fallback
            if (
              currentAttendeeIndex < 0 ||
              currentAttendeeIndex >= expanded.length
            ) {
              return "Attendee Information";
            }
            const typeAtIndex = expanded[currentAttendeeIndex] || "Attendee";
            // Compute index within this type (1-based)
            let countWithinType = 0;
            for (let i = 0; i <= currentAttendeeIndex; i++) {
              if (expanded[i] === typeAtIndex) countWithinType += 1;
            }
            // Format label like "Regular Attendee (1)"
            const cleaned = String(typeAtIndex).trim();
            return `${cleaned} Attendee (${countWithinType})`;
          })()}
        </CardTitle>
        <CardDescription className="text-sm">
          {totalAttendees > 1
            ? `Please provide details for attendee ${currentAttendeeIndex + 1}`
            : "Please provide your details to continue"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Reset dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowResetDialog(false)}
            />
            <div className="relative z-10 w-[90%] max-w-md rounded-lg bg-white p-5 shadow-lg border">
              <h3 className="text-base md:text-lg font-semibold mb-1">
                Reset attendee form?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will clear all attendee details saved in your browser and
                on this device for your session. You can’t undo this.
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
                  onClick={doReset}
                >
                  Reset Form
                </Button>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
                className={`text-sm md:text-base ${
                  errors.firstName ? "border-destructive" : ""
                }`}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
                className={`text-sm md:text-base ${
                  errors.lastName ? "border-destructive" : ""
                }`}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium flex items-center gap-1">
              <Mail className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
              Email Address <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john@example.com"
              className={`text-sm md:text-base ${
                errors.email ? "border-destructive" : ""
              }`}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium flex items-center gap-1">
              <Phone className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
              Phone Number <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+234 800 000 0000"
              className={`text-sm md:text-base ${
                errors.phone ? "border-destructive" : ""
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                Company{" "}
                <span className="text-xs text-muted-foreground">
                  (Optional)
                </span>
              </label>
              <Input
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Your Company"
                className="text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium flex items-center gap-1">
                <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                Job Title{" "}
                <span className="text-xs text-muted-foreground">
                  (Optional)
                </span>
              </label>
              <Input
                value={formData.jobTitle}
                onChange={(e) =>
                  setFormData({ ...formData, jobTitle: e.target.value })
                }
                placeholder="Your Position"
                className="text-sm md:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              type="button"
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {currentAttendeeIndex > 0 ? "Previous Attendee" : "Back"}
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold order-1 sm:order-2"
            >
              {currentAttendeeIndex < totalAttendees - 1
                ? "Next Attendee"
                : "Continue to Payment"}
            </Button>
            <div className="sm:ml-auto w-full sm:w-auto order-3 flex justify-start sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setShowResetDialog(true)}
              >
                Reset Form
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
