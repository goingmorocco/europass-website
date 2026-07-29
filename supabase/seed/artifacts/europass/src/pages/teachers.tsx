import { useListTeachers } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Teachers() {
  const { data: teachers, isLoading } = useListTeachers();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Our Teachers</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            Learn from passionate experts dedicated to your success. Our faculty brings international experience and modern teaching methods to the classroom.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center space-y-4">
                  <Skeleton className="h-48 w-48 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : teachers && teachers.length > 0 ? (
              teachers.map((teacher) => (
                <div key={teacher.id} className="bg-white p-8 rounded-3xl border border-border shadow-sm text-center hover:shadow-lg transition-shadow">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-muted">
                    {teacher.photoUrl ? (
                      <img src={teacher.photoUrl} alt={teacher.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-display font-bold">
                        {teacher.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{teacher.name}</h3>
                  <p className="text-secondary font-bold text-sm uppercase tracking-wider mb-4">{teacher.title}</p>
                  
                  {teacher.specialties && (
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      {teacher.specialties}
                    </p>
                  )}
                  
                  <p className="text-muted-foreground text-sm line-clamp-4">
                    {teacher.bio}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <p className="text-muted-foreground">Teacher profiles coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
