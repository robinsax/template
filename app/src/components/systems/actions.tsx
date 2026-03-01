/**
*   Button components with extended functionality.
*/
import React, {
    ReactElement, ReactNode, useCallback, useState, useMemo, useContext, 
    createContext, MouseEvent
} from "react";
import {
    Modal, ModalOverlay, ModalContent, ModalBody, Button, VStack, Heading, Input,
    HStack, Text, Tooltip, PlacementWithLogical, Spinner, useDisclosure
} from "@chakra-ui/react";

import { Permission } from "@/models";
import { I18nValueFn, useAuthzCheck, useI18n, useQueryParamBehavior } from "@/hooks";

import { IconName, Icon } from "./icons";
import { ClickTarget } from "../layout/common";

// Enable state context.
const enableStateContext = createContext<string[]>([]);

/**
*   Enable a state below the mount point. Inherits enabled states from above.
*
*   See {@link useEnableStateCheck}.
*/
export const EnableStateProvider = ({ children, enable }: {
    children: ReactNode,
    enable: string[]
}) => {
    const parent = useContext(enableStateContext);

    return (
        <enableStateContext.Provider value={ [...parent, ...enable] }>
            { children }
        </enableStateContext.Provider>
    );
};

/**
*   Returns whether the given state is enabled. If `state` is `null`, returns `true`.
*/
export const useEnableStateCheck = (state: string | null) => {
    const states = useContext(enableStateContext);

    return useMemo(() => {
        return state ? states.includes(state) : true;
    }, [states, state]);
};

// Confirmation UI.
export type ConfirmationProps = {
    confirmDetail?: ReactNode,
    requireEntry?: string,
    onDone: () => void,
    onConfirm: () => void
};

export type ConfirmationProxyProps = Omit<ConfirmationProps, "onDone" | "onConfirm">;

/**
*   Render a confirmation prompt, optionally with a required entry safeguard.
*/
export const Confirmation = ({
    confirmDetail, requireEntry, onDone, onConfirm
}: ConfirmationProps) => {
    const t = useI18n();

    const [entry, setEntry] = useState("");

    const onTryConfirm = useMemo(() => {
        return () => {
            if (requireEntry && entry != requireEntry) return;

            onConfirm();
            onDone();
        };
    }, [requireEntry, entry, onConfirm, onDone]);

    return (
        <VStack alignItems="left" width="full" spacing={ 6 }>
            <Heading>
                { t("Are you sure?") }
            </Heading>
            { confirmDetail && (
                <Text fontSize="sm">
                    { confirmDetail }
                </Text>
            ) }
            { requireEntry && (
                <>
                    <Text fontSize="sm">
                        { t("Type "{entry}" to confirm.", {
                            entry: requireEntry
                        }) }
                    </Text>
                    <Input
                        placeholder={ requireEntry }
                        value={ entry }
                        onChange={ e => setEntry(e.target.value) }
                    />
                </>
            ) }
            <HStack width="full">
                <Button
                    width="50%"
                    variant="ghost"
                    onClick={ onDone }
                >
                    { t("Cancel") }
                </Button>
                <Button
                    width="50%"
                    isDisabled={
                        (requireEntry && entry != requireEntry) || false
                    }
                    onClick={ onTryConfirm }
                >
                    { t("Confirm") }
                </Button>
            </HStack>
        </VStack>
    );
};

// Buttons.
/**
*   Layout control props for buttons with extended functionality.
*/
export type ModalButtonProps = {
    width?: string,
    variant?: string,
    leftIcon?: ReactElement,
    isLoading?: boolean,
    iconName?: IconName,
    modalCentered?: boolean,
    disabled?: boolean,
    label?: I18nValueFn,
    behaviorQueryParam?: string,
    justifyContent?: string
}

/**
*   Button that opens a modal when clicked.
*
*   `children` is a render function that is passed the `onClose` callback to close the
*   modal.
*/
export const ModalButton = ({
    children, modalSize, modalCentered, label, onClose: onCloseProp, iconName,
    tooltip, disabled, behaviorQueryParam, ...buttonProps
}: {
    children: (onClose: () => void) => ReactNode,
    modalSize?: string,
    onClose?: () => void,
    tooltip?: I18nValueFn
} & ModalButtonProps) => {
    const t = useI18n();

    const { isOpen, onOpen, onClose } = useDisclosure();

    const [onOpenModal, onCloseModal] = useQueryParamBehavior(
        behaviorQueryParam || "never", "true", onOpen, onClose
    );

    // Use query parameter binding if passed, otherwise don"t.
    const onCloseFinal = useCallback(() => {
        if (behaviorQueryParam) onCloseModal();
        else onClose();

        if (onCloseProp) onCloseProp();
    }, [onCloseModal, onClose, onCloseProp]);

    const onOpenFinal = useCallback(() => {
        if (behaviorQueryParam) onOpenModal();
        else onOpen();
    }, [onOpen, onOpenModal]);

    const button = (
        <Button
            leftIcon={ (label && iconName) ? <Icon name={ iconName }/> : undefined }
            {...buttonProps}
            onClick={ onOpenFinal } isDisabled={ disabled }
        >
            { label ? label(t) : (
                iconName && <Icon name={ iconName }/>
            ) }
        </Button>
    );

    return (
        <>
            { tooltip ? (
                <Tooltip label={ tooltip(t) }>
                    { button }
                </Tooltip>
            ) : (
                button
            ) }
            <Modal
                isOpen={ isOpen }
                onClose={ onCloseFinal }
                size={ modalSize }
                isCentered={ modalCentered }
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalBody p={ 8 }>
                        { children(onClose) }
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

/**
*   Button that requires action confirmation. See:
*   - {@link ModalButton}.
*   - {@link Confirmation}.
*/
export const ConfirmedButton = ({
    confirmDetail, requireEntry, onConfirm, ...buttonProps
}: {
    confirmDetail?: ReactNode,
    requireEntry?: string,
    onConfirm: () => void
} & ModalButtonProps & ConfirmationProxyProps) => {
    return (
        <ModalButton modalCentered { ...buttonProps }>
            { onClose => (
                <Confirmation
                    confirmDetail={ confirmDetail }
                    requireEntry={ requireEntry }
                    onConfirm={ onConfirm }
                    onDone={ onClose }
                />
            ) }
        </ModalButton>
    );
};

// Action icons.
export type ActionIconProps = {
    tooltip?: I18nValueFn,
    tooltipPlacement?: PlacementWithLogical,
    iconName: IconName,
    permission: Permission | Permission[] | null,
    enableState?: string | null,
    onClick?: (e: MouseEvent) => void,
    working?: boolean,
    disabled?: boolean,
    showHighlight?: boolean
};

/**
*   Component rendering an action icon with optional tooltip and working state.
*/
export const ActionIcon = ({
    tooltip, tooltipPlacement, iconName, onClick, working, permission, enableState,
    disabled, showHighlight
}: ActionIconProps) => {
    const t = useI18n();

    const allowed = useAuthzCheck(permission);
    const enabled = useEnableStateCheck(enableState || null);

    const active = !disabled && allowed && enabled;

    const inner = (
        <ClickTarget
            p={ 2 }
            showHighlight={ showHighlight }
            disableHighlight={ !active }
            cursor={ active ? "pointer" : "not-allowed" }
            // Prevent working state from resizing us vertically.
            height="32px"
            onClick={ active ? onClick : undefined }
            opacity={ active ? 1 : 0.5 }
        >
            { working ? (
                <Spinner size="xs"/>
            ) : (
                <Icon name={ iconName }/>
            ) }
        </ClickTarget>
    );

    return (
        tooltip ? (
            <Tooltip placement={ tooltipPlacement } label={ tooltip(t) }>
                { inner }
            </Tooltip>
        ) : (
            inner
        )
    );
};

/**
*   Component rendering an action icon that requires confirmation. See:
*   - {@link ActionIcon}.
*   - {@link Confirmation}.
*/
export const ConfirmedActionIcon = ({
    confirmDetail, requireEntry, onConfirm, ...actionIconProps
}: (
    Omit<ActionIconProps, "onClick"> &
    ConfirmationProxyProps &
    { onConfirm: () => void }
)) => {
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <>
            <ActionIcon { ...actionIconProps } onClick={ onOpen }/>
            <Modal isOpen={ isOpen } onClose={ onClose } isCentered>
                <ModalOverlay/>
                <ModalContent>
                    <ModalBody p={ 8 }>
                        <Confirmation
                            confirmDetail={ confirmDetail }
                            requireEntry={ requireEntry }
                            onConfirm={ onConfirm }
                            onDone={ onClose }
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};
