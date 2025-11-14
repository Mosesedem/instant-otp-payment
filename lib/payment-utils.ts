// Utility functions for payment integration

declare global {
  interface Window {
    EtegramPay?: any;
  }
}

/**
 * Load Etegram script dynamically
 */
export const loadEtegramScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.EtegramPay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://etegram.com/pay/v1/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Etegram script"));
    document.body.appendChild(script);
  });
};

/**
 * Load Paystack script dynamically
 */
// export const loadPaystackScript = (): Promise<void> => {
//   return new Promise((resolve, reject) => {
//     // Check if already loaded
//     if (window.PaystackPop) {
//       resolve();
//       return;
//     }

//     const script = document.createElement("script");
//     script.src = "https://js.paystack.co/v1/inline.js";
//     script.async = true;
//     script.onload = () => resolve();
//     script.onerror = () => reject(new Error("Failed to load Paystack script"));
//     document.body.appendChild(script);
//   });
// };

/**
 * Format amount to Naira with proper formatting
 */
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Parse payment reference to determine provider
 */
export const getPaymentProvider = (
  reference: string
): "etegram" | "paystack" | null => {
  if (reference.startsWith("ETG-")) return "etegram";
  if (reference.startsWith("PSK-")) return "paystack";
  return null;
};

/**
 * Validate email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Nigerian phone number
 */
export const isValidNigerianPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

/**
 * Format phone number to standard format
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // If it starts with 234, add +
  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  }

  // If it starts with 0, replace with +234
  if (cleaned.startsWith("0")) {
    return `+234${cleaned.substring(1)}`;
  }

  // Otherwise, assume it's without country code
  return `+234${cleaned}`;
};
