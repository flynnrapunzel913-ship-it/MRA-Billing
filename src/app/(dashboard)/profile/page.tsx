import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/layout/profile-view";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ProfileView
      userName={session.user.name || "User"}
      email={session.user.email || ""}
      role={session.user.role}
    />
  );
}
