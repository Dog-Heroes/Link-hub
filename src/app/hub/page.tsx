import HubShell from "@/components/hub/HubShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dog Heroes | Link Hub",
  description: "Tutto Dog Heroes in un unico posto",
};

export default function HubPage() {
  return <HubShell brand="dog" />;
}
