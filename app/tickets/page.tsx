// app/tickets/page.tsx
// Main page component for viewing tickets.

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";

// --- Type Definitions (Retained 100%) ---
interface Purchase {
  status: "successful" | "pending" | "failed";
  amount: number;
  paymentMethod: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

interface Ticket {
  id: string;
  ticketId: string;
  ticketType: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeCompany?: string;
  attendeeJobTitle?: string;
  price: number;
  status: "active" | "expired" | "used";
  checkedInAt?: string;
  checkedInBy?: string;
  reference: string;
  createdAt: string;
  purchase: Purchase;
}

interface ApiResponse {
  tickets: Ticket[];
  total: number;
}

// --- Custom Components for Enhanced UI ---

// Full-screen, centered loading indicator with a dim background
const LoadingIndicator = () => (
  <div className="fixed inset-0 bg-gray-100 bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-2xl">
      <svg
        className="animate-spin h-8 w-8 text-primary mb-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="text-gray-600 font-medium">
        Loading tickets, please wait...
      </p>
    </div>
  </div>
);

// Placeholder for content loading (Skeletal/Shimmer effect)
const TableSkeletonLoader = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </td>
      </tr>
    ))}
  </>
);

// --- Inner Component (Wrapped in Suspense to handle useSearchParams) ---
function TicketsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // State for data and UI
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState<number>(0);
  // Full-page initial load state
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  // Partial-load state for search/pagination
  const [isSearchingOrPaginating, setIsSearchingOrPaginating] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Authentication state (Retained 100%)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const allowedPin = ["7878", "5678", "9012", "A123", "1759", "8080"]; // Hard-coded PIN for access

  // URL derived values
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const urlSearchQuery = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState<string>(urlSearchQuery);

  // Debounce ref
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Sync internal search state with URL query on mount/change
  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  // Debounced search update
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (searchQuery !== urlSearchQuery) {
      timeoutRef.current = setTimeout(() => {
        const newParams = new URLSearchParams();
        if (searchQuery) {
          newParams.set("search", searchQuery);
        }
        newParams.set("page", "1");
        router.push(`/tickets?${newParams.toString()}`);
      }, 500); // 500ms debounce delay
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, urlSearchQuery, router]);

  // Handle PIN submission (Retained 100%)
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allowedPin.includes(pin)) {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  // Fetch Tickets Logic
  const fetchTickets = useCallback(async () => {
    // Only set the partial loading state for subsequent fetches
    if (!initialLoading) {
      setIsSearchingOrPaginating(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(urlSearchQuery && { search: urlSearchQuery }),
      });
      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) {
        // Log the response status for better debugging
        console.error("Failed to fetch tickets:", res.status, res.statusText);
        throw new Error(`Failed to fetch tickets (Status: ${res.status})`);
      }
      const data: ApiResponse = await res.json();
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching data.");
      setTickets([]); // Clear tickets on error
      setTotal(0);
    } finally {
      setInitialLoading(false);
      setIsSearchingOrPaginating(false);
    }
  }, [page, urlSearchQuery, initialLoading]);

  // Effect to trigger fetch on dependency change
  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, fetchTickets]);

  // Handle search submission: immediate update (triggers URL change and fetch)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Only navigate if the search query has changed from the current URL state
    if (searchQuery !== urlSearchQuery) {
      // Set page to 1 on a new search
      const newParams = new URLSearchParams();
      if (searchQuery) {
        newParams.set("search", searchQuery);
      }
      newParams.set("page", "1");
      router.push(`/tickets?${newParams.toString()}`);
    }
  };

  // Handle page change: updates URL, which triggers `fetchTickets` via `useEffect`
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/tickets?${params.toString()}`);
  };

  // Details Sheet handlers (Retained 100%)
  const openDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsOpen(true);
  };

  const closeDetails = () => {
    setIsOpen(false);
    setSelectedTicket(null);
  };

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  // --- Render Authentication Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 space-y-6">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Admin Access Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the PIN to view tickets.
            </p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-gray-700"
              >
                PIN
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                required
              />
            </div>
            {authError && (
              <p className="text-red-600 text-sm text-center">{authError}</p>
            )}
            <button
              type="submit"
              // Updated to use a standard primary color (primary for consistency)
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Initial Loading Screen ---
  if (initialLoading) {
    return <LoadingIndicator />;
  }

  // --- Render Main Content ---
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Tickets & Payments
        </h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 relative">
            <input
              type="text"
              placeholder="Search by name, email, ticket ID, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // Focus ring updated to indigo
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
            <button
              type="submit"
              // Button color updated to indigo
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
              disabled={isSearchingOrPaginating}
            >
              {isSearchingOrPaginating ? (
                // Small loading spinner inside the button during search
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Search"
              )}
            </button>
          </div>
          {/* Subtle Indicator for background loading */}
          {isSearchingOrPaginating && (
            <div className="mt-2 text-sm text-primary flex items-center">
              <span className="animate-pulse">Fetching results...</span>
            </div>
          )}
        </form>

        {/* Error Display */}
        {error && (
          <div
            className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
            role="alert"
          >
            <span className="font-medium">An Error Occured:</span> {error}
          </div>
        )}

        {/* Tickets Table Container - Relative positioning for loading overlay */}
        <div className="bg-white shadow overflow-x-auto rounded-lg relative">
          {/* Transparent Overlay for Loading */}
          {isSearchingOrPaginating && (
            <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="animate-spin h-6 w-6 text-primary mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-primary text-sm mt-2">Loading data...</p>
              </div>
            </div>
          )}

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Conditional rendering for data or skeleton */}
              {isSearchingOrPaginating ? (
                <TableSkeletonLoader rows={limit} />
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openDetails(ticket)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.ticketId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.ticketType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.attendeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.attendeeEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{ticket.price.toLocaleString("en-NG")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === "active"
                            ? "bg-green-100 text-green-800"
                            : ticket.status === "used"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.purchase.status === "successful"
                            ? "bg-green-100 text-green-800"
                            : ticket.purchase.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ticket.purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(ticket);
                        }}
                        // Updated to use a standard primary color (primary)
                        className="text-primary hover:text-green-600 transition-colors duration-150"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* No results */}
          {!isSearchingOrPaginating && tickets.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              No tickets found matching your criteria.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isSearchingOrPaginating && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{(page - 1) * limit + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(page * limit, total)}
                  </span>{" "}
                  of <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {/* Render page buttons for simplicity, show 5 pages around current */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-150 ${
                          pageNum === page
                            ? // Updated color to match primary indigo
                              "z-10 bg-indigo-50 border-primary text-primary"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Details Sheet (Enhanced Styling, 100% Logic Retained) */}
        {isOpen && selectedTicket && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={closeDetails}
            />

            {/* Sliding Sheet */}
            <div
              className={`
        fixed z-50 bg-white shadow-2xl transform transition-all duration-300 ease-in-out 
        overflow-y-auto rounded-t-2xl md:rounded-none
        ${isOpen ? "translate-x-0" : "translate-x-full"}
        bottom-0 right-0 w-full h-[85vh] md:top-0 md:w-[420px] md:h-full
      `}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  🎟️ Ticket Details
                </h3>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-6 text-sm">
                {/* Ticket Info */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                  <h4 className="text-base font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2">
                    🎫 Ticket Information
                  </h4>
                  <div className="space-y-1.5 text-gray-700">
                    <p>
                      <strong>ID:</strong> {selectedTicket.ticketId}
                    </p>
                    <p>
                      <strong>Type:</strong> {selectedTicket.ticketType}
                    </p>
                    <p>
                      <strong>Status:</strong>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                ${
                  selectedTicket.checkedInAt
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }
              `}
                      >
                        {selectedTicket.status}
                      </span>
                    </p>
                    <p>
                      <strong>Price:</strong> ₦
                      {selectedTicket.price.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p>
                      <strong>Checked In:</strong>
                      {selectedTicket.checkedInAt
                        ? ` ${new Date(
                            selectedTicket.checkedInAt
                          ).toLocaleString()}`
                        : " No"}
                    </p>
                    <p>
                      <strong>Checked In By:</strong>{" "}
                      {selectedTicket.checkedInBy || "N/A"}
                    </p>
                    <hr className="my-3 border-gray-200" />
                    <p>
                      <strong>Attendee:</strong> {selectedTicket.attendeeName}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedTicket.attendeeEmail}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {selectedTicket.attendeePhone || "N/A"}
                    </p>
                    <p>
                      <strong>Company:</strong>{" "}
                      {selectedTicket.attendeeCompany || "N/A"}
                    </p>
                    <p>
                      <strong>Job Title:</strong>{" "}
                      {selectedTicket.attendeeJobTitle || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                  <h4 className="text-base font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2">
                    💳 Payment Details
                  </h4>
                  <div className="space-y-1.5 text-gray-700">
                    <p>
                      <strong>Reference:</strong> {selectedTicket.reference}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₦
                      {selectedTicket.purchase.amount.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p>
                      <strong>Method:</strong>{" "}
                      {selectedTicket.purchase.paymentMethod}
                    </p>
                    <p>
                      <strong>Status:</strong> {selectedTicket.purchase.status}
                    </p>
                    <p>
                      <strong>Completed:</strong>{" "}
                      {selectedTicket.purchase.completedAt
                        ? new Date(
                            selectedTicket.purchase.completedAt
                          ).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>

                    {/* Metadata */}
                    {selectedTicket.purchase.metadata && (
                      <details className="mt-3 group">
                        <summary className="cursor-pointer text-primary font-medium hover:text-green-600 flex items-center gap-1">
                          <span>View Metadata</span>
                          <svg
                            className="h-4 w-4 transform group-open:rotate-90 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </summary>
                        <pre className="mt-2 text-xs bg-white border border-gray-200 rounded-md p-2 overflow-x-auto text-gray-800">
                          {JSON.stringify(
                            selectedTicket.purchase.metadata,
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Main Component (Wrapped in Suspense) ---
export default function TicketsPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <TicketsContent />
    </Suspense>
  );
}
