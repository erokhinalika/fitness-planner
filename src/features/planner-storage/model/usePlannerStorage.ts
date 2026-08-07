import { useEffect, useRef, useState } from "react";

import { createDefaultMeta, loadPlannerData, revokePhotoUrls, savePlannerMeta } from "./plannerRepository";
import type { PlannerMeta, ProgressPhotoView } from "./types";

export function usePlannerStorage() {
  const [state, setState] = useState<PlannerMeta>(() => createDefaultMeta());
  const [photos, setPhotos] = useState<ProgressPhotoView[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPlannerData().then(({ meta, photos: loadedPhotos }) => {
      if (!active) {
        revokePhotoUrls(loadedPhotos);
        return;
      }
      setState(meta);
      setPhotos(loadedPhotos);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void savePlannerMeta(state);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => revokePhotoUrls(photosRef.current), []);

  return { state, setState, photos, setPhotos, ready } as const;
}
