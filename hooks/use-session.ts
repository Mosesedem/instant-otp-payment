"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface CartItem {
  ticketType: string;
  quantity: number;
  price: number;
}

interface AttendeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
}

interface PaymentData {
  transactionId: string;
  amount: number;
  method: "etegram" | "paystack";
  timestamp: string;
}

interface SessionData {
  cart: CartItem[];
  attendee: AttendeeData | null;
  payment: PaymentData | null;
  sessionId: string;
}

const SESSION_STORAGE_KEY = "ticket_booking_session";
// Keep in sync with components/attendee-form.tsx
const FORM_STORAGE_PREFIX = "attendee_form_state_";

export function useSession() {
  const [sessionData, setSessionData] = useState<SessionData>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // If parsing fails, return default
        }
      }
    }
    return {
      cart: [],
      attendee: null,
      payment: null,
      sessionId: generateSessionId(),
    };
  });

  // Persist to localStorage whenever sessionData changes
  const updateSession = useCallback((newData: SessionData) => {
    setSessionData(newData);
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newData));
    }
  }, []);

  // Ensure the initial session (and its sessionId) is persisted immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const existing = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      }
    } catch {
      // ignore storage errors
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced network sync to DB
  const syncTimerRef = useRef<number | null>(null);
  const syncToServer = useCallback(
    (
      data: SessionData,
      extra?: Partial<{ status: string; lastStep: string }>
    ) => {
      if (typeof window === "undefined") return;
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        fetch("/api/session/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: data.sessionId,
            cart: data.cart,
            attendee: data.attendee,
            payment: data.payment,
            status: extra?.status,
            lastStep: extra?.lastStep,
          }),
          cache: "no-store",
        }).catch(() => {});
      }, 500);
    },
    []
  );

  const addToCart = useCallback(
    (ticketType: string, quantity: number, price: number) => {
      const newCart = [...sessionData.cart];
      const existingItem = newCart.find(
        (item) => item.ticketType === ticketType
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        newCart.push({ ticketType, quantity, price });
      }

      const updated = {
        ...sessionData,
        cart: newCart,
      };
      updateSession(updated);
      syncToServer(updated, { lastStep: "tickets", status: "in_progress" });
    },
    [sessionData, updateSession, syncToServer]
  );

  const removeFromCart = useCallback(
    (ticketType: string) => {
      const newCart = sessionData.cart.filter(
        (item) => item.ticketType !== ticketType
      );
      const updated = {
        ...sessionData,
        cart: newCart,
      };
      updateSession(updated);
      syncToServer(updated, { lastStep: "tickets", status: "in_progress" });
    },
    [sessionData, updateSession, syncToServer]
  );

  const updateCartQuantity = useCallback(
    (ticketType: string, quantity: number) => {
      const newCart = sessionData.cart.map((item) =>
        item.ticketType === ticketType
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      );
      const updated = {
        ...sessionData,
        cart: newCart.filter((item) => item.quantity > 0),
      };
      updateSession(updated);
      syncToServer(updated, { lastStep: "tickets", status: "in_progress" });
    },
    [sessionData, updateSession, syncToServer]
  );

  const updateAttendee = useCallback(
    (attendeeData: AttendeeData) => {
      const updated = {
        ...sessionData,
        attendee: attendeeData,
      };
      updateSession(updated);
      syncToServer(updated, { lastStep: "attendee", status: "in_progress" });
    },
    [sessionData, updateSession, syncToServer]
  );

  const completePayment = useCallback(
    (
      method: "etegram" | "paystack",
      paymentInfo: { transactionId: string; amount: number; method: string }
    ) => {
      const updated = {
        ...sessionData,
        payment: {
          transactionId: paymentInfo.transactionId,
          amount: paymentInfo.amount,
          method: method,
          timestamp: new Date().toISOString(),
        },
      };
      updateSession(updated);
      syncToServer(updated, { lastStep: "success", status: "completed" });
    },
    [sessionData, updateSession, syncToServer]
  );

  const clearSession = useCallback(() => {
    // Clean up any persisted attendee form state
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(FORM_STORAGE_PREFIX)) {
            // Defer deletion to avoid index shifting issues
            // Collect keys first
          }
        }
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(FORM_STORAGE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // no-op
      }
    }

    const clearedSession: SessionData = {
      cart: [],
      attendee: null,
      payment: null,
      sessionId: generateSessionId(),
    };
    updateSession(clearedSession);
  }, [updateSession]);

  const resetSession = useCallback(() => {
    // Reset everything except successful purchases (which should be in database)
    // Also clear any persisted attendee form state
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(FORM_STORAGE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }

    const resetData: SessionData = {
      cart: [],
      attendee: null,
      payment: null,
      sessionId: generateSessionId(),
    };
    updateSession(resetData);
  }, [updateSession]);

  const getSession = useCallback(() => {
    return sessionData;
  }, [sessionData]);

  return {
    cart: sessionData.cart,
    attendee: sessionData.attendee,
    payment: sessionData.payment,
    sessionId: sessionData.sessionId,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateAttendee,
    completePayment,
    clearSession,
    resetSession,
    getSession,
  };
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
