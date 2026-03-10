import { ReactNode } from "react";
import { createPortal } from "react-dom";

import { Box, Card } from "./layout";
import { BlockStyles } from "./base";

export const Portal = ({ children }: { children: ReactNode }) => {
    return createPortal(children, document.body);
};

export const OverlayPortal = ({ children, open = false, onClose }: {
    children: ReactNode,
    open?: boolean,
    onClose?: () => void
}) => {
    if (!open) return null;

    return (
        <Portal>
            <Box
                position="fixed"
                top={ 0 } left={ 0 } right={ 0 } bottom={ 0 }
                display="flex" alignItems="center" justifyContent="center"
                backgroundColor="overlay"
                onClick={ onClose }
            >
                { children }
            </Box>
        </Portal>
    );
};

export const Modal = ({ children, open = false, onClose, ...props }: BlockStyles & {
    children: ReactNode,
    open?: boolean,
    onClose?: () => void
}) => {
    if (!open) return null;

    return (
        <OverlayPortal open={ open } onClose={ onClose }>
            <Card
                { ...props }
                onClick={ event => event.stopPropagation() }
            >
                { children }
            </Card>
        </OverlayPortal>
    );
};
