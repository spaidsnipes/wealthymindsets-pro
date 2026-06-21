"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VailBuildRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/veddbuild"); }, [router]);
  return null;
}
