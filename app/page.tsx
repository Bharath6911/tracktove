"use client";

import dynamic from "next/dynamic";

const DashboardPage = dynamic(
  () => import("@/components/dashboard/dashboard-page").then((module) => module.DashboardPage),
  {
    ssr: false,
  }
);

export default function Page() {
  return <DashboardPage />;
}