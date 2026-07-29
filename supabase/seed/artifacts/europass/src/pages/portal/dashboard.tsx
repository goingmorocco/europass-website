import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListEnrollments, useListMaterials, useListAnnouncements } from "@workspace/api-client-react";
import { BookOpen, Calendar, FileText, Bell, LogOut, ChevronRight, Download, Video, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import portalImg from "@assets/generated_images/student-portal.jpg";

export default function StudentPortal() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: enrollments, isLoading: loadingEnrollments } = useListEnrollments();
  const { data: materials, isLoading: loadingMaterials } = useListMaterials();
  const { data: announcements, isLoading: loadingAnnouncements } = useListAnnouncements();

  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Video className="w-5 h-5 text-blue-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-border hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-bold text-xl text-primary">Student Portal</h2>
          <p className="text-sm text-muted-foreground mt-1">Welcome back!</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <BookOpen className="w-5 h-5 mr-3" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab("materials")}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "materials" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <FileText className="w-5 h-5 mr-3" /> Learning Materials
          </button>
          <button 
            onClick={() => setActiveTab("announcements")}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "announcements" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Bell className="w-5 h-5 mr-3" /> Announcements
          </button>
        </nav>
        
        <div className="p-4 border-t border-border">
          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-border p-6 flex items-center justify-between md:hidden">
          <h2 className="font-display font-bold text-xl text-primary">Student Portal</h2>
          <select 
            className="border-border rounded-md text-sm"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="overview">Overview</option>
            <option value="materials">Materials</option>
            <option value="announcements">Announcements</option>
          </select>
        </header>

        <div className="p-6 md:p-10 flex-1 overflow-auto">
          
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative rounded-3xl overflow-hidden bg-primary h-48 md:h-64 flex items-end p-8">
                <img src={portalImg} alt="Study" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
                <div className="relative z-10 text-primary-foreground">
                  <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Ready to learn?</h1>
                  <p className="text-primary-foreground/80">Check your latest materials and announcements.</p>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6">My Courses</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loadingEnrollments ? (
                    <Skeleton className="h-40 rounded-2xl" />
                  ) : enrollments && enrollments.length > 0 ? (
                    enrollments.map(enr => (
                      <div key={enr.id} className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${enr.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {enr.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg mb-1">{enr.courseName || `Course #${enr.courseId}`}</h4>
                        <p className="text-muted-foreground text-sm flex items-center">
                          <Calendar className="w-4 h-4 mr-1" /> {enr.preferredSchedule || "Schedule TBD"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-white p-8 rounded-2xl border border-border text-center">
                      <p className="text-muted-foreground mb-4">You are not enrolled in any courses yet.</p>
                      <Button asChild><Link href="/courses">Browse Courses</Link></Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h1 className="text-3xl font-display font-bold">Learning Materials</h1>
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {loadingMaterials ? (
                  <div className="p-6 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : materials && materials.length > 0 ? (
                  <div className="divide-y divide-border">
                    {materials.map(mat => (
                      <div key={mat.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            {getMaterialIcon(mat.type)}
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{mat.title}</h4>
                            <p className="text-sm text-muted-foreground">{mat.description || "Course Material"}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={mat.url} target="_blank" rel="noreferrer">
                            {mat.type === 'Video' || mat.type === 'Link' ? 'Open' : <><Download className="w-4 h-4 mr-2" /> Download</>}
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No materials have been uploaded for your courses yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h1 className="text-3xl font-display font-bold">Announcements</h1>
              <div className="space-y-4">
                {loadingAnnouncements ? (
                  <><Skeleton className="h-32 rounded-2xl w-full" /><Skeleton className="h-32 rounded-2xl w-full" /></>
                ) : announcements && announcements.length > 0 ? (
                  announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {ann.isGlobal ? (
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded">Global</span>
                        ) : (
                          <span className="bg-secondary/20 text-secondary px-2 py-1 rounded">Course Update</span>
                        )}
                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-xl mb-2">{ann.title}</h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-border text-center text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No recent announcements.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
