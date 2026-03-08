import { ReactNode, MouseEvent, useCallback, useState, useMemo, useRef } from "react";

import { BlockProps, BlockStyles, useBlockProps } from "./base";
import { useWindowListener } from "@/hooks";
import { Card } from "./layout";

export const Popover = ({
    children, trigger, placement = "auto", triggerStyles, panelStyles, ...props
}: BlockProps & {
    children: ReactNode,
    trigger: (open: boolean) => ReactNode,
    triggerStyles?: BlockStyles,
    placement?: (
        "auto" | "topLeftward" | "bottomLeftward" | "bottomRightward" | "topRightward"
    ),
    panelStyles?: BlockStyles
}) => {
    const rawProps = useBlockProps(props, {
        position: "relative"
    });
    const triggerRawProps = useBlockProps(triggerStyles || {});

    const [open, setOpen] = useState(false);
    const elRef = useRef<HTMLDivElement>(null);

    const onToggle = useCallback((event: MouseEvent) => {
        event.stopPropagation();

        setOpen(!open);
    }, [open]);

    useWindowListener("click", () => {
        setOpen(false);
    });

    const panelPlacementStyles = useMemo(() => {
        const styles: BlockStyles = {};
    
        let place = placement;
        if (place == "auto") {
            const el = elRef.current;
            if (!el) place = "topLeftward";
            else {
                const elBox = el.getBoundingClientRect();

                place = (
                    elBox.top < window.innerHeight / 2 ? "bottom" : "top"
                ) + (
                    elBox.left < window.innerWidth / 2 ? "Rightward" : "Leftward"
                );
            }
        }

        let translateY = "0%";
        if (place.startsWith("top")) {
            styles.top = -0.25;
            translateY = "-100%";
        } else {
            styles.bottom = -0.25;
            translateY = "100%";
        }

        if (place.endsWith("Leftward")) {
            styles.right = 0;
        } else {
            styles.left = 0;
        }

        styles.transform = `translate(0%, ${translateY})`;

        return styles;
    }, [placement, open]);

    return (
        <div { ...rawProps } ref={ elRef }>
            <div onClick={ onToggle } { ...triggerRawProps }>
                { trigger(open) }
            </div>
            { open && (
                <Card
                    onClick={ event => event.stopPropagation() }
                    position="absolute"
                    padding={ 1 }
                    zIndex={ 150 }
                    { ...panelPlacementStyles }
                    { ...panelStyles }
                >
                    { children }
                </Card>
            ) }
        </div>
    );
};
