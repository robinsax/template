/**
*   Basic reusable layouts. 
*/
import React, {
    ComponentType, MouseEvent, ReactNode, useCallback, useMemo, useState
} from 'react';
import {
    HTMLChakraProps, VStack, HStack, Heading, Text, Spacer, Box, Button, Spinner,
    Flex, ChakraProps, Checkbox, Popover, PopoverTrigger, PopoverContent, PopoverBody,
    Portal, shouldForwardProp, chakra
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isValidMotionProp } from 'framer-motion';

import { UploadModel, Permission } from '@/models';
import {
    I18nValueFn, useI18n, useAPI, useFetchedUpload, useWindowListener, useAuthzCheck
} from '@/hooks';
import {
    usePanelStylesFix, useGrowOnHover, useMediaBg, useBoxShadow, useHideScrollbars
} from '@/theme';

import { Icon, IconName } from './icons';
import { useEnableStateCheck } from './actions';
import { UploadArea, UploadMenuTrigger, useUpload } from './upload';

// Highlight areas.
export type HighlightedProps<T extends 'span' | 'a'> = (
    HTMLChakraProps<T> &
    { showHighlight?: boolean, disableHighlight?: boolean, highlightColor?: string }
);

const createHighlighted = <T extends 'span' | 'a'>(type: T) => {
    return chakra<T, HighlightedProps<T>>(type, {
        baseStyle: (props) => {
            const {
                showHighlight, disableHighlight, highlightColor = 'insetPanelBg'
            } = props as unknown as HighlightedProps<T>;

            return {
                display: 'inline-block',
                cursor: !disableHighlight ? 'pointer' : 'inherit',
                bg: (
                    (showHighlight && !disableHighlight) ? highlightColor : 'transparent'
                ),
                borderRadius: 'md',
                _hover: {
                    backgroundColor: !disableHighlight ? highlightColor : 'transparent'
                }
            };
        },
        shouldForwardProp: (prop) => (
            !['showHighlight', 'disableHighlight', 'highlightColor'].includes(prop) &&
            !isValidMotionProp(prop) &&
            shouldForwardProp(prop)
        )
    });
};

/**
*   A clickable target area with highlight presentation.
*/
export const ClickTarget = createHighlighted('span');

const ClickTargetAnchor = createHighlighted('a');

/**
*   A clickable link that is highlighted while active.
*/
export const ClickTargetLink = ({ href, ...props }: HighlightedProps<'a'>) => {
    const navigate = useNavigate();
    const location = useLocation();

    const onClick = useCallback((event: MouseEvent) => {
        event.preventDefault();

        navigate(href as string);
    }, [href, navigate]);

    return (
        <ClickTargetAnchor
            href={ href }
            onClick={ onClick }
            showHighlight={ location.pathname == href }
            {...props}
        />
    );
};

/**
*   A spinner centered in its container.
*/
export const FullAreaSpinner = (props: HTMLChakraProps<'div'>) => {
    return (
        <Flex
            justifyContent="center"
            alignItems="center"
            width="full" height="full"
            {...props}
        >
            <Spinner/>
        </Flex>
    );
};

/**
*   A canonical layout for simple forms.
*/
export const FormLayout = ({ children }: { children: ReactNode }) => {
    return (
        <VStack width="full" spacing={ 4 }>
            { children }
        </VStack>
    );
};

/**
*   A canonical layout for management screens.
*/
export const ManagerLayout = ({ heading, description, headerRight, children }: {
    heading: I18nValueFn,
    description?: I18nValueFn,
    headerRight?: ReactNode,
    children: ReactNode
}) => {
    const t = useI18n();

    return (
        <VStack spacing={ 4 }>
            <HStack width="full">
                <VStack alignItems="left">
                    <Heading>
                        { heading(t) }
                    </Heading>
                    { description && (
                        <Text variant="light">
                            { description(t) }
                        </Text>
                    ) }
                </VStack>
                <Spacer/>
                { headerRight }
            </HStack>
            <HStack width="full" alignItems="flex-start">
                <Box width="full">
                    { children }
                </Box>
            </HStack>
        </VStack>
    );
};

/**
*   A canonical layout for account editor screens.
*/
export const AccountEditorLayout = ({
    children, FormSubmit, FormError, AvatarField
}: {
    children: ReactNode,
    FormSubmit: ComponentType,
    FormError: ComponentType,
    AvatarField: ComponentType
}) => {
    return (
        <VStack width="full" height="full" spacing={ 4 }>
            <AvatarField/>
            <VStack width="full" spacing={ 4 }>
                <FormError/>
                { children }
            </VStack>
            <Spacer/>
            <FormSubmit/>
        </VStack>
    );
};

/**
*   Canonical presentation of UI that represents a selection.
*/
export const RichSelection = ({
    children, width, iconName, onClick, error, selected, selectableWhenDisabled
}: {
    children: ReactNode,
    width?: string,
    iconName: IconName,
    onClick?: () => void,
    error?: boolean,
    selected: boolean,
    selectableWhenDisabled?: boolean
}) => {
    const panelStyles = usePanelStylesFix();
    const growStyles = useGrowOnHover();

    return (
        <HStack
            { ...panelStyles }
            { ...((onClick || selectableWhenDisabled) ? growStyles : {}) }
            sx={ {
                ...panelStyles.sx,
                background: selected ? panelStyles.sx.background : 'transparent'
            } }
            backdropFilter={ selected ? panelStyles.backdropFilter : undefined }
            cursor={ (onClick || selectableWhenDisabled) ? 'pointer' : 'default' }
            borderRadius="md"
            border="2px solid"
            width={ width }
            maxWidth="30rem"
            borderColor={ error ? 'error' : 'transparent' }
            py={ 2 }
            px={ 4 }
            spacing={ 4 }
            onClick={ onClick }
            boxShadow={ selected ? 'raise' : undefined }
        >
            <Box
                borderRadius="full"
                bg={ error ? 'error' : selected ? 'selection' : 'panelBg' }
                p={ 2 }
            >
                <Icon name={ iconName } size="2rem"/>
            </Box>
            <VStack alignItems="left" spacing={ 1 }>
                { children }
            </VStack>
        </HStack>
    );
};

// Media area layouts.
/**
*   Reusable layout for media container UI.
*/
export const MediaContainerLayout = ({
    height, width, minHeight, children, onClick, noEvents, borderRadius
}: {
    height: string,
    width?: string,
    minHeight?: string,
    noEvents?: boolean,
    children: ReactNode,
    borderRadius?: string,
    onClick?: () => void
}) => {
    const checkerStyles = useMediaBg(30);

    return (
        <Box
            height={ height }
            minHeight={ minHeight }
            width={ width || 'full' }
            flexGrow={ 0 }
            flexShrink={ 0 }
            flexBasis="auto"
            borderRadius={ borderRadius || 'md' }
            p={ 4 }
            { ...checkerStyles }
            onClick={ onClick }
            pointerEvents={ noEvents ? 'none' : undefined }
        >
            { children }
        </Box>
    );
};

/**
*   Renders a loaded image inside a media container with a gap.
*/
export const MediaContainerImage = ({
    dataURI: dataURIProp, upload, title, disabled, onLayout, children
}: {
    dataURI?: string,
    upload?: UploadModel,
    title?: I18nValueFn,
    disabled?: boolean,
    onLayout?: (size: [number, number]) => void,
    children?: ReactNode
}) => {
    const t = useI18n();

    const boxShadow = useBoxShadow();

    const fetchedDataURI = useFetchedUpload(upload || null);

    const [imageSize, setImageSize] = useState<[number, number]>([0, 0]);

    const onImage = useCallback((el: HTMLImageElement | null) => {
        if (!el) return;

        const size = [el.width, el.height] as [number, number];

        setImageSize(size);
        if (onLayout) onLayout(size);
    }, []);

    const dataURI = dataURIProp || fetchedDataURI;
    return (
        <>
        { !dataURI ? (
            <FullAreaSpinner/>
        ) : (
            <Box
                position="relative"
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="full"
                height="full"
            >
                <img
                    ref={ onImage }
                    src={ dataURI }
                    title={ title ? title(t) : undefined }
                    style={ {
                        cursor: 'pointer',
                        objectFit: 'contain',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        margin: 'auto',
                        borderRadius: '5px',
                        boxShadow,
                        filter: disabled ? 'grayscale(100%)' : undefined
                    } }
                />
                { children && (
                    <Box
                        position="absolute"
                        bottom={ 0 } top={ 0 } left={ 0 } right={ 0 }
                    >
                        <Box
                            position="relative"
                            width={ imageSize[0] + 'px' }
                            height={ imageSize[1] + 'px' }
                            top="50%" left="50%"
                            transform="translate(-50%, -50%)"
                        >
                            { children }
                        </Box>
                    </Box>
                ) }
            </Box>
        ) }
        </>
    );
};

// Block cards layout.
const useBlockCardStyles = (dropPanelStyles?: boolean, dropGrowStyles?: boolean) => {
    const panelStyles = usePanelStylesFix();
    const growStyles = useGrowOnHover();

    return useMemo<ChakraProps>(() => ({
        p: 4,
        borderRadius: 'md',
        border: '1px solid',
        borderColor: !dropPanelStyles ? 'lightBorder' : 'transparent',
        width: '20rem',
        height: '26rem',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: !dropPanelStyles ? 'raise' : undefined,
        ...(!dropPanelStyles ? panelStyles : {}),
        ...(!dropGrowStyles ? growStyles : {})
    }), [panelStyles, growStyles, dropPanelStyles]);
};

export const BlockCards = ({ justifyContent, children, ...props }: {
    justifyContent?: string,
    children: ReactNode
} & ChakraProps) => {
    return (
        <Flex
            width="full" flexWrap="wrap" alignItems="flex-start" gap={ 4 }
            justifyContent={ justifyContent }
            { ...props }
        >
            { children }
        </Flex>
    );
};

export const BlockCardNew = ({
    onClick, working, iconName, permission, label, enableState, disabled,
    permissionAnyClientInnerScope, ...props
}: {
    onClick?: () => void,
    working?: boolean,
    iconName?: IconName,
    permission: Permission | Permission[],
    /**
    *   Whether to pass authz check if the user has any grant within the client
    *   (including business-level) that provides `permission`.
    */
    permissionAnyClientInnerScope?: boolean,
    enableState?: string | null,
    label: I18nValueFn,
    disabled?: boolean
} & ChakraProps) => {
    const t = useI18n();

    const allowed = useAuthzCheck(permission, {
        anyClientInnerScope: permissionAnyClientInnerScope
    });
    const enabled = useEnableStateCheck(enableState || null);

    const active = !disabled && allowed && enabled;

    const styles = useBlockCardStyles(false, !active);

    return (
        <ClickTarget
            {...styles}
            border="3px dashed"
            borderColor="lightBorder"
            backdropFilter="none"
            boxShadow="none"
            {...props}
            cursor={ active ? 'pointer' : 'not-allowed' }
            onClick={ active ? onClick : undefined }
        >
            { working ? (
                <FullAreaSpinner/>
            ) : (
                <>
                    <Icon name={ iconName || 'add' } size="1.5rem"/>
                    <Text variant="light" mt={ 2 }>
                        { label(t) }
                    </Text>
                </>
            ) }
        </ClickTarget>
    );
};

export const BlockCard = <
    T extends ComponentType<ChakraProps & { children: ReactNode }>
>({
    children, as: Component, styleOnHover, onMouseEnter, onMouseLeave, onClick,
    ...props
}: {
    children: ReactNode,
    as?: T,
    styleOnHover?: boolean,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
    onClick?: () => void
} & ChakraProps) => {
    const styles = useBlockCardStyles();
    const noPanelStyles = useBlockCardStyles(true);

    // @ts-expect-error ts(2322)
    if (!Component) Component = Box;

    return (
        // @ts-expect-error ts(2769)
        <Component
            cursor={ onClick ? 'pointer' : undefined }
            { ...(styleOnHover ? noPanelStyles : styles) }
            justifyContent="flex-start"
            { ...props }
            _hover={ {
                ...(styleOnHover ? {
                    ...styles,
                    width: undefined,
                    height: undefined,
                    _hover: undefined
                } : {}),
                ...(props._hover || {}),
                ...(styles._hover || {})
            } }
            onMouseEnter={ onMouseEnter }
            onMouseLeave={ onMouseLeave }
            onClick={ onClick }
        >
            { children }
        </Component>
    );
};

/**
*   Component rendering a targetability indication for drag and drop systems.
*   Must be mounted below a non-`static`-positioned element.
*/
export const TargetableIndication = ({ possible, active, borderRadius }: {
    possible: boolean,
    active: boolean,
    borderRadius?: string
}) => {
    return (
        <Box
            position="absolute"
            top={ 0 }
            left={ 0 }
            width="full"
            height="full"
            border="3px dashed"
            borderRadius={ borderRadius || 'md' }
            zIndex={ 1 }
            pointerEvents="none"
            borderColor={
                active ?
                    'dndTarget'
                : possible ?
                    'lightBorder'
                :
                    'transparent'
            }
        />
    );
};

// Sidebar view.
export type SidebarControl = {
    open: boolean,
    fullyOpen: boolean,
    close: () => void
};

/**
*   Return a control object to be passed to a {@link Sidebar}, and a callback to open it.
*/
export const useSidebarControl = (onClose?: () => void) => {
    const [open, setOpen] = useState(false);
    const [fullyOpen, setFullyOpen] = useState(false);

    const control = useMemo<SidebarControl>(() => {
        const close = () => {
            if (!open) return;

            setFullyOpen(false);
            setTimeout(() => {
                setOpen(false);
                if (onClose) onClose();
            }, 250);
        };

        return { open, fullyOpen, close };
    }, [open, fullyOpen]);

    const onOpen = useCallback(() => {
        if (open) return;

        setOpen(true);
        setTimeout(() => setFullyOpen(true), 100);
    }, [open]);

    return [control, onOpen] as const;
};

/**
*   Sidebar that opens as a global right-hand overlay.
*/
export const Sidebar = ({ control, width, minWidth, maxWidth, children }: {
    control: SidebarControl,
    width?: string,
    minWidth?: string,
    maxWidth?: string,
    children: ReactNode
}) => {
    const panelStyles = usePanelStylesFix();

    useWindowListener('click', () => {
        if (!control.fullyOpen) return;

        control.close();
    });

    const finalSize = width || '30rem';
    return control.open && (
        <Portal>
            <Box overflowX="hidden">
                <Box
                    { ...panelStyles }
                    position="fixed"
                    top={ 0 }
                    right={ control.fullyOpen ? 0 : '-' + finalSize }
                    width={ finalSize }
                    minWidth={ minWidth }
                    maxWidth={ maxWidth }
                    height="100vh"
                    borderLeft="1px solid"
                    borderColor="lightBorder"
                    boxShadow="raise"
                    transition="right 0.2s ease-in-out"
                    overflowY="auto"
                    overflowX="hidden"
                    p={ 8 }
                    zIndex={ 500 }
                    onClick={ e => e.stopPropagation() }
                >
                    { children }
                </Box>
            </Box>
        </Portal>
    );
};

// Child selector.
/**
*   Reusable layout for child relationships managed in a sidebar.
*/
export const ChildSidebarControl = ({ children, iconName, label, onClose }: {
    iconName: IconName,
    label: I18nValueFn,
    onClose?: () => void,
    children: ReactNode
}) => {
    const t = useI18n();

    const [sidebarControl, onSidebarOpen] = useSidebarControl(onClose);

    return (
        <>
            <ClickTarget p={ 2 } onClick={ onSidebarOpen }>
                <HStack>
                    <Icon name={ iconName }/>
                    <Text fontSize="xs" color="themeTextSofter">
                        { label(t) }
                    </Text>
                </HStack>
            </ClickTarget>
            <Sidebar control={ sidebarControl }>
                { children }
            </Sidebar>
        </>
    );
};

/**
*   Reusable layout for child relationships managed in a popover.
*/
export const ChildSelector = ({ children, working, iconName, label }: {
    working?: boolean,
    iconName: IconName,
    label: I18nValueFn,
    children: ReactNode
}) => {
    const t = useI18n();

    const hideScrollbars = useHideScrollbars();

    return (
        <Popover placement="top-start">
            <PopoverTrigger>
                <ClickTarget p={ 2 }>
                    <HStack>
                        { working ? (
                            <Spinner size="xs"/>
                        ) : (
                            <>
                                <Icon name={ iconName }/>
                                <Text fontSize="xs" color="themeTextSofter">
                                    { label(t) }
                                </Text>
                            </>
                        ) }
                    </HStack>
                </ClickTarget>
            </PopoverTrigger>
            <Portal>
                <PopoverContent>
                    <PopoverBody
                        position="relative"
                        maxHeight="25rem"
                        overflowY="scroll"
                        p={ 4 }
                        { ...hideScrollbars }
                    >
                        <VStack
                            width="full" alignItems="left"
                            spacing={ 4 }
                        >
                            { children }
                        </VStack>
                    </PopoverBody>
                </PopoverContent>
            </Portal>
        </Popover>
    );
};

/**
*   Reusable layout for {@link ChildSelector} list items.
*/
export const ChildSelectorItem = ({
    children, assigned, permission, enableState, onToggle
}: {
    children: ReactNode,
    assigned: boolean,
    permission: Permission | Permission[],
    enableState?: string | null,
    onToggle: () => void
}) => {
    const allowed = useAuthzCheck(permission);
    const enabled = useEnableStateCheck(enableState || null);

    const active = allowed && enabled;

    return (
        <HStack spacing={ 4 }>
            <Checkbox
                isDisabled={ !active }
                isChecked={ assigned }
                onChange={ active ? onToggle : undefined }
                opacity={ active ? 1 : 0.5 }
            />
            <VStack alignItems="left" spacing={ 0.5 }>
                { children }
            </VStack>
        </HStack>
    );
};

// Avatars upload.
/**
*   Base type for component types that display a persona.
*/
export type PersonaComponent<T> = ComponentType<{
    for: T | null,
    size: string,
    avatarOnly?: boolean,
    draftDataURI?: string | null
}>;

/**
*   Internal helper for avatar upload UI.
*/
const AvatarUploadInner = <T,>({ forProp, size, PersonaComponent }: {
    forProp: T | null,
    size: string,
    PersonaComponent: PersonaComponent<T>
}) => {
    const { uploadedDataURI } = useUpload();

    return (
        <PersonaComponent
            for={ forProp }
            avatarOnly
            size={ size }
            draftDataURI={ uploadedDataURI }
        />
    );
};

/**
*   Avatar upload UI for the given persona component implementation. Handles upload
*   area interactions and presentation of the avatar.
*/
export const AvatarUpload = <T,>({
    for: forProp, size, onUpload, PersonaComponent, permission
}: {
    for: T | null,
    size: string,
    onUpload: (upload: UploadModel) => void,
    PersonaComponent: PersonaComponent<T>,
    permission: Permission | null
}) => {
    const t = useI18n();
    const api = useAPI();

    return (
        <VStack spacing={ 4 }>
            <UploadArea
                endpoint={ api.uploads.avatars }
                mimetype="image/"
                onUpload={ upload => onUpload(upload) }
            >
                <AvatarUploadInner
                    forProp={ forProp }
                    size={ size }
                    PersonaComponent={ PersonaComponent }
                />
                <UploadMenuTrigger permission={ permission }>
                    { working => (
                        <Button
                            isLoading={ working }
                            variant="ghost"
                            leftIcon={ <Icon name="switch"/> }
                        >
                            { working ? 
                                <Spinner/>
                            :
                                t('Change')
                            }
                        </Button>
                    ) }
                </UploadMenuTrigger>
            </UploadArea>
        </VStack>
    );
};

/**
*   Reusable layout for list options in oversized modal lists.
*/
export const BigListOption = ({ label, detail, selected, children, onClick }: {
    label: I18nValueFn,
    detail?: I18nValueFn,
    selected: boolean,
    children?: ReactNode,
    onClick: (() => void) | null
}) => {
    const t = useI18n();

    return (
        <ClickTarget
            highlightColor="panelBg" width="full"
            p={ 2 }
            showHighlight={ selected }
            disableHighlight={ !onClick }
            onClick={ onClick || undefined }
        >
            <HStack width="full" spacing={ 2 }>
                <VStack alignItems="left" spacing={ 1 }>
                    <Text>
                        { label(t) }
                    </Text>
                    { detail && (
                        <Text variant="light">
                            { detail(t) }
                        </Text>
                    ) }
                </VStack>
                <Spacer/>
                { children }
                { selected && (
                    <Box mr={ 2 }>
                        <Icon name="check"/>
                    </Box>
                ) }
            </HStack>
        </ClickTarget>
    );
};
