'use client'
import React, { createContext, useContext, useMemo } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const GoogleMapsCtx = createContext({ isLoaded: false, google: undefined })

// Superset of libraries your app needs anywhere
const LIBRARIES = ['drawing', 'geometry', 'places']

export function GoogleMapsProvider({ children }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script', // must stay constant
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAP_API_KEY,
    libraries: LIBRARIES,
  })

  const value = useMemo(
    () => ({
      isLoaded,
      google: typeof window !== 'undefined' ? window.google : undefined,
    }),
    [isLoaded]
  )

  return <GoogleMapsCtx.Provider value={value}>{children}</GoogleMapsCtx.Provider>
}

export function useGoogleMaps() {
  return useContext(GoogleMapsCtx)
}
