import dynamic from "next/dynamic";
import { SlotsPageSkeleton } from "@/components/slots/slots-loading-ui";

const SlotsPageClient = dynamic(
  () =>
    import("@/components/slots/slots-page-client").then((m) => ({
      default: m.SlotsPageClient,
    })),
  {
    loading: () => <SlotsPageSkeleton />,
  },
);

export default function SlotsPage() {
  return <SlotsPageClient />;
}
