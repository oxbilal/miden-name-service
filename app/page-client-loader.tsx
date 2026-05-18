"use client";

import dynamic from "next/dynamic";

const MidenNameServiceApp = dynamic(() => import("./miden-name-service-app"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#120c07] text-white">
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-orange-100/60">
        Loading Miden Name Service
      </div>
    </main>
  ),
});

export default function PageClientLoader() {
  return <MidenNameServiceApp />;
}
