import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: classes }] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("classes")
      .select("alias")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        displayName={profile?.display_name || user.email || "Teacher"}
        classAliases={(classes ?? []).map((c) => c.alias)}
      />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
