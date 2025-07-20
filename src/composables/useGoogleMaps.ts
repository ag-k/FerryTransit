interface GoogleMapsOptions {
  center?: { lat: number; lng: number }
  zoom?: number
  mapTypeId?: string
  styles?: any[]
}

export const useGoogleMaps = () => {
  const isLoaded = ref(false)
  const loadError = ref<Error | null>(null)

  const loadGoogleMaps = async (): Promise<void> => {
    if (isLoaded.value) {
      console.log('Google Maps already loaded')
      return
    }

    const config = useRuntimeConfig()
    const apiKey = config.public.googleMapsApiKey

    console.log('Loading Google Maps with API key:', apiKey ? 'configured' : 'missing')

    if (!apiKey) {
      loadError.value = new Error('Google Maps API key is not configured')
      return
    }

    if (typeof window.google !== 'undefined' && window.google.maps) {
      console.log('Google Maps already available in window')
      isLoaded.value = true
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log('Google Maps script loaded successfully')
        isLoaded.value = true
        resolve()
      }

      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error)
        loadError.value = new Error('Failed to load Google Maps')
        reject(loadError.value)
      }

      document.head.appendChild(script)
    })
  }

  const createMap = async (
    container: globalThis.Ref<HTMLElement | null>,
    options: GoogleMapsOptions = {}
  ): Promise<any | null> => {
    console.log('Creating map, container:', !!container.value)
    
    if (!container.value) {
      console.error('No container element for map')
      return null
    }

    await loadGoogleMaps()

    if (!isLoaded.value || loadError.value) {
      console.error('Google Maps is not loaded', loadError.value)
      return null
    }

    const defaultOptions = {
      center: { lat: 36.1049, lng: 133.1769 }, // 隠岐諸島の中心付近
      zoom: 10,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      ...options
    }

    console.log('Creating Google Map with options:', defaultOptions)
    
    try {
      const mapInstance = new window.google.maps.Map(container.value, defaultOptions)
      console.log('Map created successfully')
      return mapInstance
    } catch (error) {
      console.error('Error creating map:', error)
      return null
    }
  }

  const createMarker = (
    map: any,
    position: { lat: number; lng: number },
    options: any = {}
  ): any => {
    return new window.google.maps.Marker({
      map,
      position,
      ...options
    })
  }

  const createPolyline = (
    map: any,
    path: { lat: number; lng: number }[],
    options: any = {}
  ): any => {
    return new window.google.maps.Polyline({
      map,
      path,
      geodesic: true,
      strokeOpacity: 0.8,
      strokeWeight: 3,
      ...options
    })
  }

  const fitBounds = (
    map: any,
    points: { lat: number; lng: number }[],
    padding = 50
  ): void => {
    const bounds = new window.google.maps.LatLngBounds()
    points.forEach(point => bounds.extend(point))
    map.fitBounds(bounds, padding)
  }

  return {
    isLoaded: readonly(isLoaded),
    loadError: readonly(loadError),
    loadGoogleMaps,
    createMap,
    createMarker,
    createPolyline,
    fitBounds
  }
}