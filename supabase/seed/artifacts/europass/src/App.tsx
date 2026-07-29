import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

// Layout
import { AppLayout } from '@/components/app-layout';
import { ProtectedRoute } from '@/components/protected-route';

// Pages
import Home from '@/pages/home';
import About from '@/pages/about';
import Courses from '@/pages/courses';
import CourseDetail from '@/pages/course-detail';
import Ausbildung from '@/pages/ausbildung';
import Teachers from '@/pages/teachers';
import Blog from '@/pages/blog';
import BlogDetail from '@/pages/blog-detail';
import Faq from '@/pages/faq';
import Contact from '@/pages/contact';
import Privacy from '@/pages/privacy';
import Terms from '@/pages/terms';
import Login from '@/pages/login';
import Register from '@/pages/register';

// Portals
import StudentPortal from '@/pages/portal/dashboard';
import AdminDashboard from '@/pages/admin/dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Routes inside Layout */}
      <Route path="/">
        <AppLayout><Home /></AppLayout>
      </Route>
      <Route path="/about">
        <AppLayout><About /></AppLayout>
      </Route>
      <Route path="/courses">
        <AppLayout><Courses /></AppLayout>
      </Route>
      <Route path="/courses/:slug">
        <AppLayout><CourseDetail /></AppLayout>
      </Route>
      <Route path="/ausbildung">
        <AppLayout><Ausbildung /></AppLayout>
      </Route>
      <Route path="/teachers">
        <AppLayout><Teachers /></AppLayout>
      </Route>
      <Route path="/blog">
        <AppLayout><Blog /></AppLayout>
      </Route>
      <Route path="/blog/:id">
        <AppLayout><BlogDetail /></AppLayout>
      </Route>
      <Route path="/faq">
        <AppLayout><Faq /></AppLayout>
      </Route>
      <Route path="/contact">
        <AppLayout><Contact /></AppLayout>
      </Route>
      <Route path="/privacy">
        <AppLayout><Privacy /></AppLayout>
      </Route>
      <Route path="/terms">
        <AppLayout><Terms /></AppLayout>
      </Route>
      
      {/* Auth */}
      <Route path="/login">
        <AppLayout><Login /></AppLayout>
      </Route>
      <Route path="/register">
        <AppLayout><Register /></AppLayout>
      </Route>

      {/* Student Portal Routes */}
      <Route path="/portal*">
        <ProtectedRoute allowedRole="student">
          <Switch>
            <Route path="/portal" component={StudentPortal} />
            {/* We'll just route everything in portal to the dashboard for now or build separate nested views inside the portal component */}
            <Route path="/portal/:rest*" component={StudentPortal} />
          </Switch>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin*">
        <ProtectedRoute allowedRole="admin">
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            {/* Same here, admin dashboard will handle internal routing or sub-views via state for simplicity, or we map them */}
            <Route path="/admin/:rest*" component={AdminDashboard} />
          </Switch>
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route>
        <AppLayout><NotFound /></AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
