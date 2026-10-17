import type { Metadata } from "next";
import Seeker from "./Seeker";

export const metadata: Metadata = { title: "Hillview Assets • Seeker" };

export default function SeekerPage() {
  return <Seeker />;
}
