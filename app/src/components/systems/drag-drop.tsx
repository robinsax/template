/**
*   Drag and drop component system using cursor-based hit detection.
*/
import React, {
    ReactNode, createContext, useCallback, useContext, 
    useEffect, useMemo, useRef, forwardRef, useState
} from "react";
import { Box, ChakraProps, Portal } from "@chakra-ui/react";

/**
*   Handler for drop-related events.
*/
export type DropHandlerFn<T> = (data: T) => void;

// Internal helpers.
type DropHandlers<T> = {
    onDrop: DropHandlerFn<T>,
    onOver?: DropHandlerFn<T | null>,
    onDraggingChanged?: DropHandlerFn<T | null>
};

type DragHandlers = {
    onDrag?: () => void,
    onDrop?: () => void
};

type DropZone<T> = {
    id: string,
    element: HTMLElement,
    handlers: DropHandlers<T>
};

type DragDropContextType<T> = {
    registerDrop: (
        element: HTMLElement, 
        handler: DropHandlers<T>
    ) => [string, () => void],
    registerDrag: (handler: DragHandlers) => [string, () => void],
    startDrag?: (
        dragId: string, 
        data: T, 
        previewElement: ReactNode, 
        initialX: number, 
        initialY: number
    ) => void
};

/**
*   Creates a drag and drop system comprised of 3 component types:
*       - `DragDropArea`, which is the context provider and must be mounted 
*       at the system boundary.
*       - `DragTarget`, with which draggable components should be wrapped.
*       - `DropArea`, with which drop target components should be wrapped.
*
*   Uses cursor position for precise drop target detection.
*/
export const createDragDropSystem = <T,>() => {
    const context = createContext<DragDropContextType<T>>(
        null as unknown as DragDropContextType<T>
    );

    const DragDropArea = ({ children }: { children: ReactNode }) => {
        const dropZonesRef = useRef<Record<string, DropZone<T>>>({});
        const dragsRef = useRef<Record<string, DragHandlers>>({});
        const idRef = useRef(0);
        const currentDragRef = useRef<{ id: string, data: T } | null>(null);
        const currentOverRef = useRef<string | null>(null);
        const [dragPreview, setDragPreview] = useState<{
            element: ReactNode,
            x: number,
            y: number
        } | null>(null);

        const nextId = useCallback(() => (idRef.current++) + "", []);

        const registerDrop = useCallback((
            element: HTMLElement, handler: DropHandlers<T>
        ) => {
            const id = nextId();
            dropZonesRef.current[id] = { id, element, handlers: handler };
    
            const remove = () => {
                delete dropZonesRef.current[id];
            };

            return [id, remove] as [string, () => void];
        }, []);

        const registerDrag = useCallback((handler: DragHandlers) => {
            const id = nextId();
            dragsRef.current[id] = handler;
    
            const remove = () => {
                delete dragsRef.current[id];
            };

            return [id, remove] as [string, () => void];
        }, []);

        // Find drop zone at cursor position - prioritize topmost element
        const getDropZoneAtPoint = useCallback((x: number, y: number): string | null => {
            // Use document.elementFromPoint to get the topmost element at cursor
            const elementAtPoint = document.elementFromPoint(x, y);
            if (!elementAtPoint) return null;

            // Find the drop zone that contains this element (or is this element)
            for (const [id, zone] of Object.entries(dropZonesRef.current)) {
                if (zone.element === elementAtPoint || 
                    zone.element.contains(elementAtPoint)) {
                    const rect = zone.element.getBoundingClientRect();
                    if (x >= rect.left && x <= rect.right && 
                        y >= rect.top && y <= rect.bottom) {
                        return id;
                    }
                }
            }
            
            // Fallback to original method if no containing drop zone found
            for (const [id, zone] of Object.entries(dropZonesRef.current)) {
                const rect = zone.element.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && 
                    y >= rect.top && y <= rect.bottom) {
                    return id;
                }
            }
            return null;
        }, []);

        const handleMouseMove = useCallback((e: MouseEvent) => {
            if (!currentDragRef.current) return;

            // Update drag preview position using page coordinates
            setDragPreview(prev => prev ? {
                ...prev,
                x: e.clientX,
                y: e.clientY
            } : null);

            const dropZoneId = getDropZoneAtPoint(e.clientX, e.clientY);
            
            // Handle over changes
            if (dropZoneId !== currentOverRef.current) {
                // Clear previous over
                if (currentOverRef.current) {
                    const prevZone = dropZonesRef.current[currentOverRef.current];
                    if (prevZone?.handlers.onOver) {
                        prevZone.handlers.onOver(null);
                    }
                }

                // Set new over
                currentOverRef.current = dropZoneId;
                if (dropZoneId) {
                    const zone = dropZonesRef.current[dropZoneId];
                    if (zone?.handlers.onOver) {
                        zone.handlers.onOver(currentDragRef.current.data);
                    }
                }
            }
        }, [getDropZoneAtPoint]);

        const handleMouseUp = useCallback((e: MouseEvent) => {
            if (!currentDragRef.current) return;

            const dropZoneId = getDropZoneAtPoint(e.clientX, e.clientY);

            // Clear all drag states
            for (const zone of Object.values(dropZonesRef.current)) {
                if (zone.handlers.onOver) {
                    zone.handlers.onOver(null);
                }
                if (zone.handlers.onDraggingChanged) {
                    zone.handlers.onDraggingChanged(null);
                }
            }

            // Handle drop
            if (dropZoneId) {
                const zone = dropZonesRef.current[dropZoneId];
                if (zone?.handlers.onDrop) {
                    zone.handlers.onDrop(currentDragRef.current.data);
                }
            }

            // Call drag handler onDrop
            const dragHandler = dragsRef.current[currentDragRef.current.id];
            if (dragHandler?.onDrop) {
                dragHandler.onDrop();
            }

            currentDragRef.current = null;
            currentOverRef.current = null;
            setDragPreview(null);

            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        }, [getDropZoneAtPoint, handleMouseMove]);

        const startDrag = useCallback((
            dragId: string, 
            data: T, 
            previewElement: ReactNode, 
            initialX: number, 
            initialY: number
        ) => {
            currentDragRef.current = { id: dragId, data };
            setDragPreview({
                element: previewElement,
                x: initialX,
                y: initialY
            });

            // Notify all drop zones that dragging started
            for (const zone of Object.values(dropZonesRef.current)) {
                if (zone.handlers.onDraggingChanged) {
                    zone.handlers.onDraggingChanged(data);
                }
            }

            // Call drag handler onDrag
            const dragHandler = dragsRef.current[dragId];
            if (dragHandler?.onDrag) {
                dragHandler.onDrag();
            }

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }, [handleMouseMove, handleMouseUp]);

        return (
            <context.Provider value={{ 
                registerDrop, 
                registerDrag, 
                startDrag 
            }}>
                { children }
                { dragPreview && <Portal>
                    <Box
                        position="fixed"
                        left={ `${dragPreview.x}px` }
                        top={ `${dragPreview.y}px` }
                        pointerEvents="none"
                        zIndex={ 9999 }
                        transform="translate(-50%, -50%) rotate(3deg)"
                        opacity={ 0.8 }
                    >
                        {dragPreview.element}
                    </Box>
                </Portal>}
            </context.Provider>
        );
    };
    
    const DragTarget = ({ children, data, onDrag, onDrop, extraTransform, ...props }: {
        children: ReactNode,
        extraTransform?: string,
        data: T,
        onDrag?: () => void,
        onDrop?: () => void
    } & ChakraProps) => {
        const { registerDrag, startDrag } = useContext(context);
        const [isDragging, setIsDragging] = useState(false);

        const [id, remove] = useMemo(() => (
            registerDrag({ 
                onDrag: () => {
                    setIsDragging(true);
                    onDrag?.();
                },
                onDrop: () => {
                    setIsDragging(false);
                    onDrop?.();
                }
            })
        ), [registerDrag, onDrag, onDrop]);

        useEffect(() => remove, [remove]);

        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            e.preventDefault();
            startDrag?.(id, data, children, e.clientX, e.clientY);
        }, [id, data, startDrag, children]);

        return (
            <Box
                onMouseDown={ handleMouseDown }
                style={{
                    transform: isDragging 
                        ? `rotate(3deg) ${extraTransform || ""}` 
                        : extraTransform || "",
                    cursor: isDragging ? "grabbing" : "grab"
                }}
                userSelect="none"
                { ...props }
            >
                { children }
            </Box>
        );
    };
    
    const DropArea = forwardRef<HTMLDivElement, {
        children: ReactNode,
        onOver?: DropHandlerFn<T | null>,
        onDrop: DropHandlerFn<T>,
        onDraggingChanged?: DropHandlerFn<T | null>,
        onHoverChanged?: (hovered: boolean) => void
    } & ChakraProps>(({
        children, onOver, onDrop, onDraggingChanged, onHoverChanged, ...props
    }, forwardedRef) => {
        const contextValue = useContext(context);
        const elementRef = useRef<HTMLDivElement>(null);

        // Register drop zone when element is available
        useEffect(() => {
            if (!elementRef.current || !contextValue?.registerDrop) return;

            const [_, remove] = contextValue.registerDrop(elementRef.current, {
                onDrop,
                onOver,
                onDraggingChanged
            });

            return remove;
        }, [contextValue?.registerDrop, onDrop, onOver, onDraggingChanged]);

        // Combine refs
        const combinedRef = useCallback((node: HTMLDivElement | null) => {
            elementRef.current = node;
            if (forwardedRef) {
                if (typeof forwardedRef === "function") {
                    forwardedRef(node);
                } else {
                    forwardedRef.current = node;
                }
            }
        }, [forwardedRef]);

        return (
            <Box
                ref={ combinedRef }
                onMouseEnter={ onHoverChanged ? () => onHoverChanged(true) : undefined }
                onMouseLeave={ onHoverChanged ? () => onHoverChanged(false) : undefined }
                { ...props }
            >
                { children }
            </Box>
        );
    });
    
    return { DragDropArea, DragTarget, DropArea };
};

/**
*   Returns a drag and drop system. See {@link createDragDropSystem}.
*/
export const useDragDropSystem = <T,>() => {
    return useMemo(() => createDragDropSystem<T>(), []);
};
