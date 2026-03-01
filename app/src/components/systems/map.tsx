/**
*   Embedded map components using Google Maps. 
*/
/// <reference types="@types/google.maps" />
import React, {
    ReactNode, useCallback, useEffect, useMemo, useRef, useState
} from "react";
import { Box } from "@chakra-ui/react";
import { GoogleMap, PolygonF, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import * as turf from "@turf/turf";
import { Geometry, Polygon } from "geojson";

import { error } from "@/util";
import { LocationsEmbedResp } from "@/models";
import { useThemeColor } from "@/theme";
import { useFetchedState } from "@/hooks";
import { FullAreaSpinner } from "@/components/common";

const INIT_POSITION: google.maps.LatLngLiteral = {
    lat: 56.17002298293205,
    lng: -96.20406533512536
};

export type MapViewport = {
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number
};

export type MapObject = {
    id: string,
    feature: Record<string, unknown>
};

/**
*   Internal component for rendering GeoJSON feature geometries as Google Maps markers
*   and polygons.
*/
const ObjectShape = ({ feature, highlight, onClick }: {
    feature: Geometry,
    highlight?: boolean,
    onClick?: () => void
}) => {
    // Convert models.
    const [point, poly] = useMemo(() => {
        const convertRing = (ring: [number, number][]) => (
            ring.map(([lng, lat]) => ({ lat, lng }))
        );
    
        if (feature.type == "Point") {
            const [lng, lat] = feature.coordinates as [number, number];
    
            return [{ lat, lng }, null];
        }
        else if (feature.type == "Polygon") {
            const paths = (
                feature.coordinates as [number, number][][]
            ).map(ring => [convertRing(ring)]);
    
            return [null, paths];
        }
        else if (feature.type == "MultiPolygon") {
            const paths = (
                feature.coordinates as [number, number][][][]
            ).map(polygon => polygon.map(convertRing));
    
            return [null, paths];
        }
        else {
            return error("unsupported GeoJSON for <Map/>", [null, null]);
        }
    }, [feature]);

    const [hovered, setHovered] = useState(false);

    const highlightColor = useThemeColor("mapSelection");
    const showHighlight = useMemo(() => highlight || hovered, [highlight, hovered]);

    return (
        point ? (
            <MarkerF
                position={ point }
                onClick={ onClick }
                icon={ {
                    url: "/marker.png",
                    scaledSize: new google.maps.Size(40, 40)
                } }
            />
        ) : (
            <>
                { poly && poly.map((path, j) => (
                    <PolygonF
                        key={ j }
                        paths={ path }
                        options={ {
                            fillColor: showHighlight ? highlightColor : "transparent",
                            strokeColor: showHighlight ? highlightColor : "transparent",
                            strokeWeight: 2,
                            zIndex: highlight ? 0 : 1
                        } }
                        onClick={ onClick }
                        onMouseOver={ () => setHovered(true) }
                        onMouseOut={ () => setHovered(false) }
                    />
                )) }
            </>
        )
    );
};

/**
*   Internal helper for Google Maps configurations.
*/
const useMapConfig = (lock?: boolean) => {
    const waterColor = useThemeColor("mapPanelBg");
    const featureColor = useThemeColor("mapFeature");
    const landColor = useThemeColor("mapLand");

    return useMemo(() => {
        const styles = {
            width: "100%",
            height: "100%",
            backgroundColor: "transparent"
        };

        const mapStyle = [
            {
                featureType: "all",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: featureColor }]
            },
            {
                // This throws an error in the console for being the wrong key but
                // appears to in fact be correct...
                featureType: "pointOfInterest.recreation.park",
                elementType: "geometry",
                stylers: [{ color: featureColor }]
            },
            {
                featureType: "landscape",
                elementType: "geometry",
                stylers: [{ color: landColor }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: waterColor }]
            }
        ];

        const options: google.maps.MapOptions = {
            disableDefaultUI: true,
            gestureHandling: lock ? "none" : "greedy",
            keyboardShortcuts: false,
            styles: mapStyle,
            maxZoom: 10,
            restriction: {
                latLngBounds: {
                    north: 84,
                    south: -84,
                    west: -179.9,
                    east: 179.9
                },
                strictBounds: true
            }
        };

        return [styles, options] as const;
    }, [landColor, featureColor, waterColor]);
};

/**
*   An embedded Google Map with support for rendering models that have GeoJSON features.
*
*   Must be rendered below a {@link MapsProvider}.
*
*   `objects` will be rendered and selectable as implemented by `onObjectClick`. The
*   `onViewportChange` callback can be used to fetch `objects` dynamically as the map
*   viewport moves.
*
*   Passing a new or updated `focusObject` will cause the viewport to be set to a view
*   containing it.
*
*   Passing `lock` will disable all interaction.
*/
export const Map = <T extends MapObject>({
    width, height, objects, focusObject, lock, onObjectClick, onViewportChange
}: {
    width: string,
    height: string,
    objects?: T[] | null,
    focusObject?: T | null,
    lock?: boolean,
    onObjectClick?: (obj: T) => void,
    onViewportChange?: (viewport: MapViewport) => void
}) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const lastViewportRef = useRef<MapViewport | null>(null);

    const [loaded, setLoaded] = useState(false);
    const [center, setCenter] = useState<google.maps.LatLngLiteral>(INIT_POSITION);

    const [mapStyles, mapOptions] = useMapConfig(lock);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setLoaded(true);
    }, []);

    // Viewport change callback handling.
    const onIdle = useCallback(() => {
        if (!mapRef.current) return;

        const center = mapRef.current.getCenter();
        if (!center) return;

        setCenter({ lat: center.lat(), lng: center.lng() });

        const bounds = mapRef.current.getBounds();
        if (!bounds) return;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        const viewport: MapViewport = {
            minLat: sw.lat(),
            minLon: sw.lng(),
            maxLat: ne.lat(),
            maxLon: ne.lng(),
        };

        // Cull updates.
        if (lastViewportRef.current) {
            const equal = (
                viewport.minLat == lastViewportRef.current.minLat &&
                viewport.minLon == lastViewportRef.current.minLon &&
                viewport.maxLat == lastViewportRef.current.maxLat &&
                viewport.maxLon == lastViewportRef.current.maxLon
            );
            if (equal) return;
        }

        lastViewportRef.current = viewport;
        if (onViewportChange) onViewportChange(viewport);
    }, []);

    // Center on focusObject.
    useEffect(() => {
        if (!mapRef.current || !focusObject) return;

        const geom = focusObject.feature as unknown as Geometry;
        let bounds = null;
        if (geom.type == "MultiPolygon") {
            let largestPolygon = null;
            let maxArea = 0;

            for (const coords of geom.coordinates) {
                const poly = turf.polygon(coords);
                const area = turf.area(poly);

                if (area > maxArea) {
                    largestPolygon = poly;
                    maxArea = area;
                }
            }

            const bbox = turf.bbox(largestPolygon as unknown as Polygon);
            bounds = new window.google.maps.LatLngBounds(
                { lat: bbox[1], lng: bbox[0] },
                { lat: bbox[3], lng: bbox[2] }
            );
        }
        else {
            const box = turf.bbox(geom);
            bounds = new window.google.maps.LatLngBounds(
                { lat: box[1], lng: box[0] },
                { lat: box[3], lng: box[2] }
            );
        }

        const map = mapRef.current;
        map.fitBounds(bounds);
        setTimeout(() => map.fitBounds(bounds), 50);
    }, [focusObject, loaded]);

    return (
        <Box
            width={ width }
            height={ height }
            borderRadius="md"
            overflow="hidden"
        >
            <GoogleMap
                mapContainerStyle={ mapStyles }
                center={ focusObject ? undefined : center }
                zoom={ focusObject ? undefined : 2 }
                options={ mapOptions }
                onLoad={ onLoad }
                onIdle={ onIdle }
            >
                { focusObject && (
                    <ObjectShape
                        feature={ focusObject.feature as unknown as Geometry }
                        highlight
                    />
                ) }
                <>
                    { loaded && objects && objects.map((obj, i) => (
                        <ObjectShape
                            key={ obj.id + i }
                            feature={ obj.feature as unknown as Geometry }
                            onClick={
                                onObjectClick ?
                                    () => onObjectClick(obj)
                                :
                                    undefined
                            }
                        />
                    )) }
                </>
            </GoogleMap>
        </Box>
    );
};

/**
*   Internal provider for {@link MapsProvider}. Necessary because `<LoadScript>` renders
*   a div that breaks layouts.
*/
const MapsProviderInner = ({ embed, children }: {
    embed: LocationsEmbedResp,
    children: ReactNode
}) => {
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: embed.api_key });

    return (
        isLoaded ? (
            children
        ) : (
            <FullAreaSpinner/>
        )
    );
};

/**
*   A provider that allows {@link Map}s to be rendered below it. Renders a load state
*   until initialized.
*/
export const MapsProvider = ({ children }: { children: ReactNode }) => {
    const [embed] = useFetchedState(api => api.locations.embed.get());

    return (
        embed ? (
            <MapsProviderInner embed={ embed }>
                { children }
            </MapsProviderInner>
        ) : (
            <FullAreaSpinner/>
        )
    );
};
