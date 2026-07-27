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

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UploadSkin = lazy(() => import("./pages/UploadSkin"));
const Cases = lazy(() => import("./pages/Cases"));
const CaseView = lazy(() => import("./pages/CaseView"));
const Battles = lazy(() => import("./pages/Battles"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Admin = lazy(() => import("./pages/Admin"));
const Inventory = lazy(() => import("./components/Inventory"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));

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
