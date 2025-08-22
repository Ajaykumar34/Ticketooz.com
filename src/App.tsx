
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import PublicHome from "./pages/PublicHome";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EventDetails from "./pages/EventDetails";
import UserDashboard from "./pages/UserDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import EventRequest from "./pages/EventRequest";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import CookieSettings from "./pages/CookieSettings";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import BookingSuccess from "./pages/BookingSuccess";
import ResetPassword from "./pages/ResetPassword";
import VerifyTicket from "./pages/VerifyTicket";
import CreateAdmin from "./pages/CreateAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/events" element={<Events />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/profile" element={<CustomerProfile />} />
            <Route path="/event-request" element={<EventRequest />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/cookie-settings" element={<CookieSettings />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/create-admin" element={<CreateAdmin />} />
            <Route path="/verify-ticket/:bookingId" element={<VerifyTicket />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
