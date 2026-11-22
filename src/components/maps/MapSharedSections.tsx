"use client";

import { ArrowSquareOutIcon, MapPinIcon } from "@phosphor-icons/react";
import { roadCategory } from "@/lib/bbr-road-display";
import { bbrReferencePoints } from "@/lib/bbr-reference";
import type { MapWorkspace } from "@/hooks/useMapWorkspace";

/** Details of the selected road line (unverified OSM tags), shared by both map layouts. */
export function RoadDetails({ ws }: { ws: MapWorkspace }) {
  const { selectedRoad, reviewFlags, setSelectedRoadId } = ws;
  return <>
          {selectedRoad ? (
            <div className="mt-3 space-y-2">
              <p className="break-words font-semibold">{selectedRoad.properties.name}</p>
              <p>OSM type: <span className="font-medium">{selectedRoad.properties.highway.replaceAll("_", " ")}</span></p>
              <p>Category: {roadCategory(selectedRoad.properties.highway)}</p>
              <p className="text-caption text-slate-900">Blue means OSM road type only; dashed orange/red nearby sections are fictional report-vicinity indicators and do not establish that this road is blocked.</p>
              {reviewFlags.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h4 className="font-semibold text-slate-900">Mapped tags to review</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-caption text-slate-900">
                    {reviewFlags.map(flag => <li key={flag.code}>{flag.label}</li>)}
                  </ul>
                  <p className="mt-2 text-caption text-slate-900">Review flags are based on unverified OSM tags, not actual road availability or flood safety.</p>
                </div>
              ) : <p className="text-caption text-slate-600">No review flags from the selected tags. Other restrictions may still exist.</p>}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="font-semibold">Mapped road attributes</h4>
                <dl className="mt-2 space-y-1 text-caption">
                  {(["oneway", "access", "bridge", "tunnel", "layer", "motor_vehicle", "junction"] as const).map(tag => (
                    <div key={tag} className="flex justify-between gap-3">
                      <dt className="text-slate-600">{tag.replaceAll("_", " ")}</dt>
                      <dd className="break-words text-right font-medium">{selectedRoad.properties[tag] ?? "Not recorded"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-caption text-slate-900">OSM values are unverified. Missing tags do not mean unrestricted access or safe conditions.</p>
              </div>
              <p className="text-slate-600">Verification: mapped by OSM contributors; not independently checked.</p>
              <a href={selectedRoad.properties.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-semibold text-teal-800 underline">Inspect OSM way <ArrowSquareOutIcon size={14} aria-hidden="true"/></a>
              <button type="button" className="block rounded-lg border px-3 py-1 text-caption" onClick={() => setSelectedRoadId(null)}>Clear selection</button>
            </div>
          ) : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4"><MapPinIcon size={20} className="text-slate-700" aria-hidden="true" /><p className="mt-3 font-semibold text-slate-800">Select a road to explore</p><p className="mt-1 text-small leading-6 text-slate-600">Click any road line on the map to see its name, mapped attributes and original source.</p></div>}
  </>;
}

/** Node topology research, source attribution and reference points, shared by both map layouts. */
export function MapResearchSections({ ws }: { ws: MapWorkspace }) {
  const { topology, selectedNodeId, setSelectedNodeId, setGroupNumber, setFilter, setSelectedRoadId, selectedNode, roadMessage } = ws;
  return <>
      <details className="group mt-4 rounded-xl border border-slate-200 bg-slate-50/80">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-small font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-teal-600">Advanced research · Node topology and source inspection <span className="ml-1 text-caption font-normal text-slate-500">(expand)</span></summary>
        <div className="border-t border-slate-200 p-4" aria-label="OSM source node inspection">
        <h3 className="font-semibold">Source-node topology inspection</h3>
        {topology.status === "missing_node_ids" ? (
          <p className="mt-2 text-small text-slate-600">This imported file does not include original OSM node IDs. Back up the GeoJSON and refresh it using the upgraded importer to enable node-based inspection. Coordinate grouping alone is not proof of road access.</p>
        ) : (
          <>
            <p className="mt-2 text-caption text-slate-600">Research only · source node references on {topology.waysWithNodeIds} of {topology.roadLines} road lines. {topology.waysWithoutNodeIds > 0 ? "Partial source coverage: unmatched ways are not assessed." : "All imported ways have source node IDs."}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-caption sm:grid-cols-4">
              <div><dt className="text-slate-500">Shared OSM nodes</dt><dd className="text-heading font-semibold">{topology.sharedOsmNodes}</dd></div>
              <div><dt className="text-slate-500">Candidate groups</dt><dd className="text-heading font-semibold">{topology.candidateWayGroups}</dd></div>
              <div><dt className="text-slate-500">Coordinate collisions</dt><dd className="text-heading font-semibold">{topology.coordinateCollisionLocations}</dd></div>
              <div><dt className="text-slate-500">Review flags</dt><dd className="text-heading font-semibold">{topology.flaggedSharedNodes}</dd></div>
            </dl>
            {topology.reviewExamples.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-small font-semibold">
                  Inspect flagged OSM node
                  <select value={selectedNodeId ?? ""} onChange={event => {
                    const id = Number(event.target.value);
                    setSelectedNodeId(event.target.value ? id : null);
                    setGroupNumber(0); setFilter("all"); setSelectedRoadId(null);
                  }} className="mt-1 block max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                    <option value="">Choose source node</option>
                    {topology.reviewExamples.slice(0, 30).map(item =>
                      <option key={item.nodeId} value={item.nodeId}>Node {item.nodeId} · {item.reasons[0]}</option>
                    )}
                  </select>
                </label>
                {selectedNode ? (
                  <div className="text-caption text-slate-700">
                    <p>Mapped ways: {selectedNode.wayIds.join(", ")}</p>
                    <p>Review: {selectedNode.reasons.join("; ")}</p>
                    <a href={selectedNode.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">View OSM node source</a>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 text-caption text-slate-900">Shared source node IDs indicate OSM data relationships only. They do not verify turns, accessibility, road safety or live flooding. The map remains separate from the demonstration scenario.</p>
          </>
        )}
      </div>
      </details>
      <p role="status" className="mt-3 text-caption text-slate-500">{roadMessage}</p>
      <p className="mt-3 text-caption text-slate-600">Map data © OpenStreetMap contributors. The background tiles require internet access; line data comes from your imported GeoJSON file.</p>
      <details className="mt-3 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-small font-semibold text-slate-700 transition hover:bg-slate-50">Reference points, attribution and source links <span className="ml-1 text-caption font-normal text-slate-500">(expand)</span></summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-2">
        {bbrReferencePoints.features.map(feature => (
          <article key={feature.properties.id} className="rounded-lg border border-slate-200 p-3 text-small">
            <h4 className="font-semibold">{feature.properties.name}</h4>
            <p className="mt-1 text-slate-600">{feature.properties.evidence}</p>
            <p className="mt-1 text-caption text-slate-500">WGS84: {feature.geometry.coordinates[1]}, {feature.geometry.coordinates[0]}</p>
            <a className="mt-2 inline-flex items-center gap-1 font-semibold text-teal-800 underline"
              href={feature.properties.sourceUrl} target="_blank" rel="noopener noreferrer">View mapped source <ArrowSquareOutIcon size={14} aria-hidden="true"/></a>
          </article>
        ))}
      </div>
      </details>
  </>;
}
