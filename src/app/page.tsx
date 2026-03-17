import { ReviewDemo } from "@/components/review-demo";
import { demoLibrarySummary } from "@/lib/demo-library";
import { env } from "@/lib/env";
import { getLibrarySummary, getPhotoLibrary } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [librarySummary, initialResults] = await Promise.all([
    getLibrarySummary().catch(() => demoLibrarySummary),
    getPhotoLibrary(),
  ]);

  return (
    <ReviewDemo
      librarySummary={librarySummary}
      uploadsEnabled={env.enableUploads}
      initialResults={initialResults.slice(0, 6).map((photo) => ({
        ...photo,
        score: 1,
        topLabels: photo.labels.slice(0, 2),
      }))}
    />
  );
}
