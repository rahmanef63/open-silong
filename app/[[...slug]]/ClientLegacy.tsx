"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/legacy-app/App"), {
  ssr: false,
  loading: () => null,
});

export default function ClientLegacy() {
  return <App />;
}
