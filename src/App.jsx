// App.jsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/NavBar";
import LiveDrops from "./components/LiveDrops";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { PageLoader } from "./components/LoadingSkeleton";

/**
 * lazyWithRetry — Wraps React.lazy() with a retry mechanism to prevent
 * "Failed to fetch dynamically imported module" errors when the CDN/browser
 * cache serves a stale chunk after a deployment. Retries with cache-busting
 * query param on failure, then reloads the page if still failing.
 */
const lazyWithRetry = (componentImportFn) =>
  lazy(async () => {
    const pageRefreshed = window.sessionStorage.getItem("page-refreshed") === "true";
    try {
      const module = await componentImportFn();
      window.sessionStorage.removeItem("page-refreshed");
      return module;
    } catch (error) {
      if (!pageRefreshed) {
        // First attempt failed — set flag and reload to bust cache
        window.sessionStorage.setItem("page-refreshed", "true");
        window.location.reload();
        throw error;
      }
      // Already retried once — throw to let ErrorBoundary handle it
      window.sessionStorage.removeItem("page-refreshed");
      throw error;
    }
  });

const Home = lazyWithRetry(() => import("./pages/Home"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const UploadSkin = lazyWithRetry(() => import("./pages/UploadSkin"));
const Cases = lazyWithRetry(() => import("./pages/Cases"));
const CaseView = lazyWithRetry(() => import("./pages/CaseView"));
const Battles = lazyWithRetry(() => import("./pages/Battles"));
const Upgrade = lazyWithRetry(() => import("./pages/Upgrade"));
const Contracts = lazyWithRetry(() => import("./pages/Contracts"));
const Ranking = lazyWithRetry(() => import("./pages/Ranking"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Inventory = lazyWithRetry(() => import("./components/Inventory"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const About = lazyWithRetry(() => import("./pages/About"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const Airdrop = lazyWithRetry(() => import("./pages/Airdrop"));

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ToastProvider>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <LiveDrops />
              <main style={{ flex: 1 }}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/upload" element={<ProtectedRoute><UploadSkin /></ProtectedRoute>} />
                    <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
                    <Route path="/case/:id" element={<ProtectedRoute><CaseView /></ProtectedRoute>} />
                    <Route path="/battles" element={<ProtectedRoute><Battles /></ProtectedRoute>} />
                    <Route path="/airdrop" element={<ProtectedRoute><Airdrop /></ProtectedRoute>} />
                    <Route path="/ranking" element={<Ranking />} />
                    <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
                    <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
