import { redirect } from "next/navigation";

// Default to the charts dashboard
export default function Home() {
  redirect("/charts");
}
