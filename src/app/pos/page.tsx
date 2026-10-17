import type { Metadata } from "next";
import PosKiosk from "./PosKiosk";

export const metadata: Metadata = { title: "Hillview Assets" };

export default function PosPage() {
  return <PosKiosk />;
}
