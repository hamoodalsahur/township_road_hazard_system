"use client";

import BaseMap from "@/components/maps/BaseMap";
import ClosureLines from "./ClosureLines";
import { boundsOf } from "@/lib/map-platform";
import type { PublicClosure } from "@/lib/road-closures";

const PAD = 0.0012;

/** Small map of one closure, in the Road closures tab. Drawn the same way residents see it. */
export default function ClosureDetailMap({ closure }: { closure: PublicClosure }) {
  const b = boundsOf(closure.roads.flatMap(r => r.coordinates)) ?? [0, 0, 0, 0];
  return <BaseMap fit={[b[0] - PAD, b[1] - PAD, b[2] + PAD, b[3] + PAD]} fitKey={closure.id} label={`Map of ${closure.title}`} controls="none" compactCredit>
    <ClosureLines closures={[closure]} labels={false} />
  </BaseMap>;
}
