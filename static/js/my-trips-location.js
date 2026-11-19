import { TRIPS, TASKS } from "./trip-prep-core.js";

export const MY_TRIPS_PATHS = ["/my-trips/", "/ko/my-trips/"];

const anchors = new Set(["#trip-selector"]);
for (const city of Object.keys(TRIPS)) {
  for (const prefix of ["trip-", "saved-guides-", "next-visit-note-", "note-title-"]) anchors.add("#" + prefix + city);
  for (const task of TASKS) anchors.add(`#trip-${city}-${task}`);
}

export const isMyTripsAnchor = hash => anchors.has(hash);
