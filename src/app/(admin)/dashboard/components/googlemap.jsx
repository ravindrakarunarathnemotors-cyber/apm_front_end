import React, { useEffect, useRef, useState } from "react";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { useGetParcelDetailsQuery } from "../../../../store/features/apiSlice";
import { Spinner } from "react-bootstrap";
import { isNull } from "util";

const AllGoogleMaps = ({ client_id }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const clientData =[]
  // Fetch client details using RTK Query
 
  // Fetch parcel details using RTK Query
  const { data: parcelData, isLoading: parcelLoading, isError: parcelError } = useGetParcelDetailsQuery({ client_id });

  useEffect(() => {
    if (typeof window !== "undefined" && !window.google && !googleMapsLoaded) {
      const existingScript = document.getElementById("google-maps-script");

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
        script.id = "google-maps-script";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setGoogleMapsLoaded(true);
          setMapLoaded(true);
        };
        document.body.appendChild(script);
      } else {
        setGoogleMapsLoaded(true);
        setMapLoaded(true);
      }
    } else {
      setMapLoaded(true);
    }
  }, [googleMapsLoaded]);

  // Function to extract latitude and longitude from Google Maps URL
  const extractLatLngFromUrl = (mapsUrl) => {
    try {
      const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = mapsUrl.match(regex);
      if (match && match.length >= 3) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    } catch (error) {
      console.error("Error extracting location from URL:", error);
    }
    return null;
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google ||  !parcelData) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: 7.8731, lng: 80.7718 }, // Default center for Sri Lanka
      mapTypeControl: false,
      streetViewControl: false,
    });

    const infoWindow = new window.google.maps.InfoWindow();

    // Custom marker colors
    const clientMarkerIcon = {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#363996", // Client marker color
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#ffffff",
    };

    const otherCityMarkerIcon = {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: "#0b9444", // Other city marker color
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#ffffff",
    };

    // Add client location marker with custom color if clientData.client_location is available
    if (clientData.client_location) {
      const clientLocation = extractLatLngFromUrl(clientData.client_location);
      if (clientLocation) {
        const clientMarker = new window.google.maps.Marker({
          position: clientLocation,
          map: map,
          icon: clientMarkerIcon,
          title: clientData.name,
        });

        let infoContent = `<div><h3>${clientData.name}</h3><p>Client Location</p></div>`;
        clientMarker.addListener("click", function () {
          infoWindow.setContent(infoContent);
          infoWindow.open(map, clientMarker);
        });
      }
    }

    // Group parcels by city_id for easy access when clicking on a marker
    const parcelsByCity = parcelData.reduce((acc, parcel) => {
      if (!acc[parcel.city_id]) {
        acc[parcel.city_id] = [];
      }
      acc[parcel.city_id].push(parcel);
      return acc;
    }, {});

    // Add markers for each city in the parcel data
    parcelData.forEach((parcel) => {
      const { city_name, city_id, latitude, longitude } = parcel;

      // Skip city markers with no latitude/longitude
      if (latitude === null || longitude === null) return;

      const cityLocation = { lat: latitude, lng: longitude };

      const marker = new window.google.maps.Marker({
        position: cityLocation,
        map: map,
        icon: otherCityMarkerIcon,
        title: city_name,
      });

      // Info window content for each city
      const cityParcels = parcelsByCity[city_id];
      const cityInfoContent = `
        <div><h3>${city_name}</h3>
        <p><strong>Parcels in this City:</strong></p>
        <ul>
          ${cityParcels
            .map(
              (parcel) =>
                `<li>Parcel ID: ${parcel.parcel_id}, Delivery Status: ${parcel.deliverystatus}</li>`
            )
            .join("")}
        </ul>
        </div>
      `;

      marker.addListener("click", function () {
        infoWindow.setContent(cityInfoContent);
        infoWindow.open(map, marker);
      });
    });
  }, [mapLoaded, clientData, parcelData]);

  if ( parcelLoading) {
    return (
      <ComponentContainerCard title="Loading Map...">
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" variant="primary" />
        </div>
      </ComponentContainerCard>
    );
  }

  if ( parcelError || !clientData || !parcelData || parcelData.length === 0) {
    return (
      null
    );
  }

  return (
    <ComponentContainerCard title="Your Parcel Map: Discover New Markets, Promote Your Business, and Watch Your Sales Soar!">
      <div ref={mapRef} style={{ width: "100%", height: "600px", backgroundColor: "#f0f0f0" }}></div>
    </ComponentContainerCard>
  );
};

export default AllGoogleMaps;
