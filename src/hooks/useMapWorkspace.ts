"use client";

import { useEffect, useMemo, useState } from "react";
import { validRoadCollection, type RoadFeature } from "@/lib/bbr-roads";
import { filterRoads, type RoadFilter } from "@/lib/bbr-road-display";
import { reviewSmallGroups } from "@/lib/bbr-small-groups";
import { roadReviewFlags } from "@/lib/bbr-road-review-flags";
import { reviewedDemoVicinityStrokes, type ReviewedDemoReport } from "@/lib/v215-road-vicinity";
import { inspectOsmNodeTopology } from "@/lib/bbr-osm-topology";
import { CATEGORY_LABELS, DEMO_HAZARDS, filterDemoHazards, type HazardCategory } from "@/lib/demo-hazards";
import { prepareDemoPhoto } from "@/lib/demo-photo-client";
import { inspectDemoReportDraft } from "@/lib/v213-report-draft";
import { useServiceArea } from "@/hooks/useServiceArea";
import { ROAD_LINES_API } from "@/lib/road-lines";

/**
 * Everything the area map needs: roads, submitted reports, filters, selection and the fictional report
 * form. Shared by the resident page's map (GeographicReferenceWorkspace) and the management Maps stage
 * (ManagementMapStage), so both behave the same and only their layout differs.
 */
export function useMapWorkspace() {
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [roadMessage, setRoadMessage] = useState("Checking for locally imported roads…");
  const [filter, setFilter] = useState<RoadFilter>("all");
  const [groupNumber, setGroupNumber] = useState(0);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [hazardCategory, setHazardCategory] = useState<HazardCategory | "all">("all");
  const [showExampleHazards, setShowExampleHazards] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [storedHazards, setStoredHazards] = useState<typeof DEMO_HAZARDS>([]);
  const [hazardError, setHazardError] = useState("");
  const [draftPosition, setDraftPosition] = useState<[number,number] | null>(null);
  const [reportCategory, setReportCategory] = useState<HazardCategory>("fallen_tree");
  const [reportImpact, setReportImpact] = useState("unknown");
  const [reportDescription, setReportDescription] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [photoInputKey,setPhotoInputKey] = useState(0);
  const [reportPhase,setReportPhase] = useState<"idle"|"saving"|"attaching">("idle");
  const serviceAreaState=useServiceArea();
  const serviceArea=serviceAreaState.data;
  const areaId=serviceArea.area.id;
  const hints=inspectDemoReportDraft(reportDescription,draftPosition,evidenceFile,serviceArea.area);
  const [photoApprovedIds, setPhotoApprovedIds] = useState<string[]>([]);
  const [reviewedReports,setReviewedReports]=useState<ReviewedDemoReport[]>([]);
  const [showVicinityStrokes,setShowVicinityStrokes]=useState(true);
  async function loadStoredHazards() {
    try {
      const response=await fetch("/api/v2/hazards",{cache:"no-store"});
      if(!response.ok) throw Error("Fictional report feed unavailable; check the existing local connection without resetting your database.");
      const payload=await response.json() as {reports:{id:string;category:HazardCategory;description:string;longitude:number;latitude:number;impact:string;reviewState:string;createdAt:string;hasApprovedPhoto:boolean}[]};
      setPhotoApprovedIds(payload.reports.filter(item=>item.hasApprovedPhoto).map(item=>item.id));
      setReviewedReports(payload.reports.map(item=>({
        id:item.id,longitude:item.longitude,latitude:item.latitude,impact:item.impact as ReviewedDemoReport["impact"],
        reviewState:item.reviewState
      })));
      setStoredHazards(payload.reports.map(item=>({
        id:item.id,category:item.category,title:CATEGORY_LABELS[item.category]+" (submitted demo)",
        description:item.description,coordinates:[item.longitude,item.latitude],
        impact:item.impact as typeof DEMO_HAZARDS[number]["impact"],
        reportedAt:item.createdAt,status:"fictional_unverified",sourceMode:"simulation"
      })));
      setHazardError("");
    } catch(e){setHazardError(e instanceof Error?e.message:"Could not load demo reports");}
  }
  useEffect(()=>{
    void loadStoredHazards();
    const listener=()=>{void loadStoredHazards();};
    window.addEventListener("township-hazards-updated",listener);
    return ()=>window.removeEventListener("township-hazards-updated",listener);
  },[]);
  // Submitted reports appear by default; four authored example pins are opt-in.
  // Rejected submissions remain in the review queue but not the operational map.
  const rejectedIds=new Set(reviewedReports.filter(item=>item.reviewState==="rejected").map(item=>item.id));
  const submittedMapHazards=storedHazards.filter(item=>!rejectedIds.has(item.id));
  const allHazards=[...submittedMapHazards,...(showExampleHazards?DEMO_HAZARDS:[])];
  const visibleHazards=filterDemoHazards(hazardCategory,allHazards);
  const selectedHazard = allHazards.find(hazard => hazard.id === selectedHazardId) ?? null;
  async function submitDemoHazard() {
    if(!hints.canSubmit||!draftPosition){
      setReportMessage(hints.locationError??hints.descriptionError??hints.photoError??"Complete the fictional report form.");
      return;
    }
    setSendingReport(true);setReportPhase("saving");setReportMessage("");
    try {
      const response=await fetch("/api/v2/hazards",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({category:reportCategory,impact:reportImpact,description:reportDescription,coordinates:draftPosition})
      });
      const result=await response.json() as {error?:string;report?:{id:string}};
      if(!response.ok)throw Error(result.error??"Report not saved");
      let photoNote = "";
      if(evidenceFile && result.report?.id) {
        setReportPhase("attaching");
        try {
          const encoded = await prepareDemoPhoto(evidenceFile);
          const upload=await fetch(`/api/v2/hazards/${result.report.id}/evidence`,{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(encoded)
          });
          if(!upload.ok) {
            const failure=await upload.json() as {error?:string};
            throw Error(failure.error??"Photo upload failed");
          }
          photoNote=" Private demo photo attached for operator review.";
        } catch (photoError) {
          photoNote=" Report saved, but photo could not be attached: "+(photoError instanceof Error?photoError.message:"unknown issue");
        }
      }
      setReportDescription("");setDraftPosition(null);setEvidenceFile(null);setPhotoInputKey(x=>x+1);
      setReportMessage("Fictional incident submitted. No road closure created."+photoNote);
      window.dispatchEvent(new Event("township-hazards-updated"));
      await loadStoredHazards();
    } catch(e){setReportMessage(e instanceof Error?e.message:"Unable to submit demo hazard");}
    finally{setSendingReport(false);setReportPhase("idle");}
  }

  // Road lines for the active area: from the database after `npm run db:import-roads`, otherwise from the area's file.
  useEffect(() => {
    if (!serviceAreaState.loaded) return;
    let active = true;
    setRoads([]); setSelectedRoadId(null);
    fetch(ROAD_LINES_API, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Road file unavailable");
        const data: unknown = await response.json();
        if (!validRoadCollection(data)) throw new Error("Road file failed validation");
        if (active) {
          setRoads(data.features);
          setRoadMessage(data.features.length
            ? `${data.features.length} OSM mapped road lines imported (unverified, not a connected graph)${(data as { source?: unknown }).source === "database" ? ", read from the database" : ", read from the area's file"}.`
            : `No road lines for ${serviceArea.area.name} yet. Run ${areaId === "bbr" ? "npm run geo:import" : "npm run geo:import-area"} locally.`);
        }
      }).catch(() => { if (active) setRoadMessage(areaId === "bbr"
        ? "Road file missing or invalid; showing reference points only."
        : `No road lines for ${serviceArea.area.name} yet. Run npm run geo:import-area to download them from OpenStreetMap.`); });
    return () => { active = false; };
  }, [serviceAreaState.loaded, areaId]);

  const smallGroups = useMemo(() => reviewSmallGroups({ type: "FeatureCollection", features: roads }).smallerGroups, [roads]);
  const topology = useMemo(() => inspectOsmNodeTopology({ type: "FeatureCollection", features: roads }), [roads]);
  const selectedNode = topology.reviewExamples.find(item => item.nodeId === selectedNodeId) ?? null;
  const selectedNodePosition = selectedNode ? selectedNode.coordinate.split(",").map(Number) as [number, number] : null;
  const activeGroup = smallGroups.find(group => group.groupNumber === groupNumber);
  const visibleRoads = useMemo(() => {
    const byCategory = filterRoads(roads, filter);
    if (!activeGroup) return byCategory;
    const ids = new Set(activeGroup.ways.map(road => road.id));
    return byCategory.filter(road => ids.has(road.properties.id));
  }, [roads, filter, activeGroup]);
  const vicinityStrokes=useMemo(()=>reviewedDemoVicinityStrokes(roads,reviewedReports,serviceArea.area),[roads,reviewedReports,serviceArea.area]);
  const selectedRoad = roads.find(road => road.properties.id === selectedRoadId) ?? null;
  const reviewFlags = selectedRoad ? roadReviewFlags(selectedRoad) : [];
  const counts = useMemo(() => ({
    major: filterRoads(roads, "major").length,
    local: filterRoads(roads, "local").length,
    service: filterRoads(roads, "service").length,
    other: filterRoads(roads, "other").length,
  }), [roads]);

  const reviewStates = useMemo(() => Object.fromEntries(reviewedReports.map(report => [report.id, report.reviewState])) as Record<string, string>, [reviewedReports]);
  return {
    reviewStates, roads, roadMessage, filter, setFilter, groupNumber, setGroupNumber, selectedRoadId, setSelectedRoadId, selectedNodeId, setSelectedNodeId,
    hazardCategory, setHazardCategory, showExampleHazards, setShowExampleHazards, selectedHazardId, setSelectedHazardId,
    storedHazards, hazardError, draftPosition, setDraftPosition, reportCategory, setReportCategory, reportImpact, setReportImpact,
    reportDescription, setReportDescription, sendingReport, reportMessage, setReportMessage, evidenceFile, setEvidenceFile, photoInputKey, setPhotoInputKey,
    reportPhase, serviceArea, hints, photoApprovedIds, reviewedReports, showVicinityStrokes, setShowVicinityStrokes,
    rejectedIds, submittedMapHazards, allHazards, visibleHazards, selectedHazard, submitDemoHazard, loadStoredHazards,
    smallGroups, topology, selectedNode, selectedNodePosition, activeGroup, visibleRoads, vicinityStrokes, selectedRoad, reviewFlags, counts,
  };
}

export type MapWorkspace = ReturnType<typeof useMapWorkspace>;
