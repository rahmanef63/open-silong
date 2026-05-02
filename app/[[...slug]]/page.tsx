import { Suspense } from "react";
import ClientLegacy from "./ClientLegacy";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientLegacy />
    </Suspense>
  );
}
