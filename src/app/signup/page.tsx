import { redirect } from "next/navigation";

// Public self-registration is disabled for beta. Beta accounts are created
// manually in Supabase by the project owner; this route only ever sends
// visitors to login, regardless of auth state.
export default function SignupPage() {
  redirect("/login");
}
