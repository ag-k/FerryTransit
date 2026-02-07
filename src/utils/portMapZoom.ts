const DEFAULT_PORT_MAP_ZOOM = 16
const BOARDING_FOCUS_ZOOM = 18

const PORT_MODAL_ZOOM_BY_ID: Record<string, number> = {
  HONDO: 15,
  HONDO_SHICHIRUI: 17,
  HONDO_SAKAIMINATO: 17,
  SAIGO: 17,
  HISHIURA: 17,
  BEPPU: 16,
  KURI: 17
}

export const getPortMapZoom = (portId?: string | null): number => {
  if (!portId) return DEFAULT_PORT_MAP_ZOOM
  return PORT_MODAL_ZOOM_BY_ID[portId] ?? DEFAULT_PORT_MAP_ZOOM
}

export {
  DEFAULT_PORT_MAP_ZOOM,
  BOARDING_FOCUS_ZOOM
}
