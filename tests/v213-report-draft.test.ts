import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectDemoReportDraft} from "../src/lib/v213-report-draft";
const inside=[101.43,3.08] as const;
test("valid fictional report draft is eligible for existing local-demo server check",()=>{
 const x=inspectDemoReportDraft("A fictional roadside tree fell.",inside,null);
 assert.equal(x.canSubmit,true);
 assert.equal(x.locationError,null);
 assert.equal(x.descriptionError,null);
});
test("draft hints explain absent pin and short descriptions without changing backend policy",()=>{
 const x=inspectDemoReportDraft("short",null,null);
 assert.equal(x.canSubmit,false);
 assert.match(x.descriptionError??"",/8 characters/);
 assert.match(x.locationError??"",/map below/);
});
test("wrong location and invalid photo prevent accidental partial submission",()=>{
 const off=inspectDemoReportDraft("Fictional fallen branches",[0,0],null);
 assert.equal(off.canSubmit,false);
 assert.match(off.locationError??"",/inside the service area/);
 const unsupported=inspectDemoReportDraft("Fictional example issue",inside,{type:"image/gif",size:100});
 assert.match(unsupported.photoError??"",/JPEG or PNG/);
 const tooBig=inspectDemoReportDraft("Fictional example issue",inside,{type:"image/png",size:5_000_001});
 assert.match(tooBig.photoError??"",/5 MB/);
});
test("boundary and byte-size limits reflect existing validator",()=>{
 assert.equal(inspectDemoReportDraft("A made up hazard",[101.4,3.06],{type:"image/jpeg",size:5_000_000}).canSubmit,true);
 assert.equal(inspectDemoReportDraft("A made up hazard",[101.47,3.11],{type:"image/png",size:1}).canSubmit,true);
 assert.equal(inspectDemoReportDraft("x".repeat(401),inside,null).canSubmit,false);
});
