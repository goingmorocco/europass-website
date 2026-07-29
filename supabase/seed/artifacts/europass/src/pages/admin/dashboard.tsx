import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetStatsOverview, useGetRecentInquiries } from "@workspace/api-client-react";
import { Users, BookOpen, MessageSquare, GraduationCap, ArrowRight, LayoutDashboard, Settings, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { data: stats, isLoading: loadingStats } = useGetStatsOverview();
  const { data: recentInquiries, isLoading: loadingInquiries } = useGetRecentInquiries();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* SIDEBAR */}
      <aside className="w-64 bg-primary text-primary-foreground hidden md:flex flex-col border-r border-primary-foreground/10">
        <div className="p-6 border-b border-primary-foreground/10">
          <h2 className="font-display font-bold text-xl">Admin Panel</h2>
          <p className="text-sm text-primary-foreground/60 mt-1">EuroPass CMS</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium bg-primary-foreground/10 text-white">
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </button>
          
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-primary-foreground/50 uppercase tracking-wider">Content</div>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Courses
          </button>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Teachers
          </button>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Blog Posts
          </button>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            FAQs
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-primary-foreground/50 uppercase tracking-wider">Operations</div>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Inquiries
          </button>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Enrollments
          </button>
          <button className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 transition-colors">
            Materials
          </button>
        </nav>
        
        <div className="p-4 border-t border-primary-foreground/10">
          <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-white" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-border p-6 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Overview</h1>
          <Button variant="outline" size="sm" asChild className="hidden md:flex">
            <Link href="/" target="_blank">View Live Site</Link>
          </Button>
        </header>

        <div className="p-6 md:p-10 flex-1 overflow-auto">
          
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {loadingStats ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
            ) : (
              <>
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-muted-foreground text-sm">Total Enrollments</h3>
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><GraduationCap className="h-5 w-5" /></div>
                  </div>
                  <div className="text-3xl font-display font-bold">{stats?.totalEnrollments || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-muted-foreground text-sm">Active Courses</h3>
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600"><BookOpen className="h-5 w-5" /></div>
                  </div>
                  <div className="text-3xl font-display font-bold">{stats?.totalCourses || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-muted-foreground text-sm">Teachers</h3>
                    <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Users className="h-5 w-5" /></div>
                  </div>
                  <div className="text-3xl font-display font-bold">{stats?.totalTeachers || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-muted-foreground text-sm">Pending Inquiries</h3>
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><MessageSquare className="h-5 w-5" /></div>
                  </div>
                  <div className="text-3xl font-display font-bold">{stats?.pendingInquiries || 0}</div>
                </div>
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* RECENT INQUIRIES */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Recent Inquiries</h3>
                <Button variant="ghost" size="sm" className="text-primary font-bold text-xs">View All</Button>
              </div>
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {loadingInquiries ? (
                  <div className="p-6"><Skeleton className="h-48 w-full" /></div>
                ) : recentInquiries && recentInquiries.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recentInquiries.slice(0,5).map(inq => (
                      <div key={inq.id} className="p-4 sm:p-5 hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm">{inq.name}</h4>
                          <span className="text-xs text-muted-foreground">{new Date(inq.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2"><span className="font-semibold text-primary">{inq.type}</span> &bull; {inq.email}</p>
                        <p className="text-sm line-clamp-2 text-foreground/80">{inq.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No recent inquiries.</div>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div>
              <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-white hover:bg-primary/5 hover:text-primary border-border hover:border-primary/50 transition-all">
                  <BookOpen className="w-6 h-6" />
                  <span>Add New Course</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-white hover:bg-primary/5 hover:text-primary border-border hover:border-primary/50 transition-all">
                  <FileText className="w-6 h-6" />
                  <span>Write Blog Post</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-white hover:bg-primary/5 hover:text-primary border-border hover:border-primary/50 transition-all">
                  <Bell className="w-6 h-6" />
                  <span>Send Announcement</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-white hover:bg-primary/5 hover:text-primary border-border hover:border-primary/50 transition-all">
                  <Settings className="w-6 h-6" />
                  <span>System Settings</span>
                </Button>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
