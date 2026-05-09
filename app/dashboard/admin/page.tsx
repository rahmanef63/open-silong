import { Suspense } from "react";
import ClientAdmin from "./ClientAdmin";

export const metadata = {
  title: "Admin",
};

export default function AdminRoutePage() {
  return (
    <Suspense fallback={null}>
      <ClientAdmin />
    </Suspense>
  );
}
