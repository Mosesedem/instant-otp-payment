"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

type DomainStatus = "idle" | "checking" | "valid" | "invalid";
type SubdomainStatus = "idle" | "checking" | "valid" | "invalid";

interface CreatePanelFormProps {
  onSubmit?: (data: any) => void;
}

export function CreatePanelForm({ onSubmit }: CreatePanelFormProps = {}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [panelName, setPanelName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem("register_form");
      if (saved) {
        const v = JSON.parse(saved);
        setPanelName(v.panelName || "");
        setSubdomain(v.subdomain || "");
        setCustomDomain(v.customDomain || "");
        setOwnerName(v.ownerName || "");
        setOwnerEmail(v.ownerEmail || "");
        setOwnerPhone(v.ownerPhone || "");
      }
    } catch (e) {}
  }, []);
  
  useEffect(() => {
    try {
      const payload = {
        panelName,
        subdomain,
        customDomain,
        ownerName,
        ownerEmail,
        ownerPhone,
      };
      localStorage.setItem("register_form", JSON.stringify(payload));
    } catch (e) {}
  }, [panelName, subdomain, customDomain, ownerName, ownerEmail, ownerPhone]);

  // Domain validation state
  const [domainStatus, setDomainStatus] = useState<DomainStatus>("idle");
  const [domainMessage, setDomainMessage] = useState("");
  const debouncedDomain = useDebounce(customDomain, 500);

  // Subdomain validation state
  const [subdomainStatus, setSubdomainStatus] =
    useState<SubdomainStatus>("idle");
  const [subdomainMessage, setSubdomainMessage] = useState("");
  const debouncedSubdomain = useDebounce(subdomain, 500);

  // Validate custom domain when it changes
  useEffect(() => {
    if (debouncedDomain && debouncedDomain.length > 3) {
      validateDomain(debouncedDomain);
    } else if (!debouncedDomain) {
      setDomainStatus("idle");
      setDomainMessage("");
    }
  }, [debouncedDomain]);

  // Validate subdomain when it changes
  useEffect(() => {
    if (debouncedSubdomain && debouncedSubdomain.length >= 3) {
      validateSubdomain(debouncedSubdomain);
    } else if (!debouncedSubdomain) {
      setSubdomainStatus("idle");
      setSubdomainMessage("");
    } else if (debouncedSubdomain && debouncedSubdomain.length < 3) {
      setSubdomainStatus("invalid");
      setSubdomainMessage("Subdomain must be at least 3 characters");
    }
  }, [debouncedSubdomain]);

  async function validateSubdomain(sub: string) {
    setSubdomainStatus("checking");
    setSubdomainMessage("Checking subdomain availability...");

    try {
      const response = await fetch("/api/check-subdomain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: sub }),
      });

      const data = await response.json();

      if (data.valid) {
        setSubdomainStatus("valid");
        setSubdomainMessage(data.message || "Subdomain is available");
      } else {
        setSubdomainStatus("invalid");
        setSubdomainMessage(data.message || "Subdomain is not available");
      }
    } catch (err) {
      setSubdomainStatus("invalid");
      setSubdomainMessage("Failed to check subdomain availability");
    }
  }

  async function validateDomain(domain: string) {
    setDomainStatus("checking");
    setDomainMessage("Checking domain...");

    try {
      const response = await fetch("/api/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (data.valid) {
        setDomainStatus("valid");
        setDomainMessage(data.message || "Domain is valid and available");
      } else {
        setDomainStatus("invalid");
        setDomainMessage(data.message || "Domain validation failed");
      }
    } catch (err) {
      setDomainStatus("invalid");
      setDomainMessage("Failed to validate domain");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: panelName,
          subdomain,
          customDomain: customDomain || null,
          ownerEmail,
          ownerName,
          ownerPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create panel");
      }

      setSuccess(true);
      const panelData = {
        id: data.panel.id,
        name: panelName,
        subdomain,
        customDomain, // Using panel name as owner name for now
        ownerEmail,
        ownerName,
        ownerPhone,
        paymentStatus: "PENDING",
      };
      if (onSubmit) {
        onSubmit(panelData);
      } else {
        setTimeout(() => {
          router.push("/payment");
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getDomainIcon = () => {
    switch (domainStatus) {
      case "checking":
        return (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        );
      case "valid":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getSubdomainIcon = () => {
    switch (subdomainStatus) {
      case "checking":
        return (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        );
      case "valid":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (success) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-500">
          Panel created successfully! Redirecting to payment page...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="panelName">Panel Name</Label>
        <Input
          id="panelName"
          placeholder="My Client Panel"
          value={panelName}
          onChange={(e) => setPanelName(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          A friendly name for this child panel
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subdomain">Subdomain *</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="subdomain"
              placeholder="client"
              value={subdomain}
              onChange={(e) =>
                setSubdomain(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                )
              }
              required
              className="pr-10"
            />
            {subdomain && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getSubdomainIcon()}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            .instantotp.com
          </span>
        </div>
        {subdomainMessage && (
          <p
            className={`text-sm flex items-center gap-2 ${
              subdomainStatus === "valid"
                ? "text-green-500"
                : subdomainStatus === "invalid"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {subdomainMessage}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customDomain">Custom Domain *</Label>
        <div className="relative">
          <Input
            id="customDomain"
            placeholder="panel.example.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
            required
            className="pr-10"
          />
          {customDomain && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getDomainIcon()}
            </div>
          )}
        </div>
        {domainMessage && (
          <p
            className={`text-sm flex items-center gap-2 ${
              domainStatus === "valid"
                ? "text-green-500"
                : domainStatus === "invalid"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {domainMessage}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerName">Owner Name *</Label>
        <Input
          id="ownerName"
          type="text"
          placeholder="Elon Musk"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Email address of the panel owner
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerEmail">Owner Email *</Label>
        <Input
          id="ownerEmail"
          type="email"
          placeholder="client@example.com"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Email address of the panel owner
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerPhone">Owner Phone Number *</Label>
        <Input
          id="ownerPhone"
          type="tel"
          placeholder="+1234567890"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Phone number of the panel owner (include country code)
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            subdomainStatus !== "valid" ||
            domainStatus !== "valid"
          }
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Panel...
            </>
          ) : (
            "Create Panel"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
