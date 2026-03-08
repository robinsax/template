/**
*   File upload components. 
*/
import React, {
    ChangeEvent, ReactNode, DragEvent, createContext, useContext, useMemo, useRef,
    useState, useCallback
} from "react";
import { Input, useToast } from "@chakra-ui/react";

import { APICallOptions } from "@/api-client";
import { UploadModel, Permission } from "@/model";
import {
    useAuthzCheck, useI18n
} from "@/hooks";
import { Clickable } from "@/components/base";

import { useEnableStateCheck } from "./actions";

export type UploadController = {
    multiple: boolean,
    fieldId: string,
    working: boolean,
    uploadedDataURI: string | null,
    upload: (file: File) => Promise<void>,
    openMenu: () => void
};

const uploadContext = createContext<UploadController>(
    null as unknown as UploadController
);

/**
*   An area within which a file is uploaded. Uses a hidden input to allow file menus to
*   be triggered.
*/
export const UploadArea = ({
    onUpload, onProgress, ignoreResult, endpoint, mimetype, children,
    allowMultiple = false
}: {
    onUpload: (upload: UploadModel) => void | Promise<void>,
    onProgress?: (progress: number | null) => void,
    ignoreResult?: boolean,
    endpoint: { post: (body: File, options?: APICallOptions) => Promise<UploadModel> },
    mimetype: string,
    children: ReactNode,
    allowMultiple?: boolean
}) => {
    const toast = useToast();
    const t = useI18n();

    const input = useRef<HTMLInputElement>(null);
    const [fieldId] = useState<string>(() => Math.random().toString(36).substring(2, 9));

    const [resultUpload, setResultUpload] = useState<UploadModel | null>(null);

    const uploadedDataURI = useFetchedUpload(resultUpload);

    const openMenu = useMemo(() => {
        return () => {
            if (!input.current) return;

            input.current.click();
        };
    }, []);

    const [upload, working] = useAsyncCallback(async (file: File) => {
        if (!file.type.startsWith(mimetype)) {
            toast({
                title: t("Invalid file type."),
                status: "error"
            });
            return;
        }

        let upload;
        try {
            upload = await endpoint.post(file, { onProgress });
        }
        catch (err) {
            if (input.current) input.current.value = "";
            throw err;
        }

        if (!ignoreResult) setResultUpload(upload);

        const callbackRv = onUpload(upload);
        if (callbackRv instanceof Promise) {
            await callbackRv;
        }
    }, []);

    const [onChange, changeWorking] = useAsyncCallback(async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        if (!event.target.files) return;

        for (const file of event.target.files) {
            if (!file.type.startsWith(mimetype)) continue;

            await upload(file);
            if (!allowMultiple) break;
        }

        if (input.current) input.current.value = "";
    }, [upload, mimetype, allowMultiple]);

    return (
        <>
            <Input
                ref={ input }
                id={ fieldId }
                position="fixed" top="-100px"
                width="1px" height="1px" opacity="0"
                type="file"
                accept={ mimetype + "*" }
                onChange={ onChange }
                multiple={ allowMultiple }
            />
            <uploadContext.Provider
                value={ {
                    multiple: allowMultiple, working: changeWorking || working,
                    fieldId, uploadedDataURI, upload, openMenu
                } }
            >
                { children }
            </uploadContext.Provider>
        </>
    );
};

/**
*   Return the upload controller above the caller"s mount point.
*
*   Must only be used within an {@link UploadArea}.
*/
export const useUpload = () => useContext(uploadContext);

/**
*   A trigger area that opens the file selection menu.
*
*   `children` must be a render function that is passed whether the upload is currently
*   occurring.
* 
*   Must only be mounted below an {@link UploadArea}.
*/
export const UploadMenuTrigger = ({ children, hidden, enableState, permission }: {
    children: (working: boolean) => ReactNode,
    hidden?: boolean,
    enableState?: string,
    permission: Permission | Permission[] | null
}) => {
    const { fieldId, openMenu, working, upload } = useUpload();

    const growStyles = useGrowOnHover();
    const [hovered, setHovered] = useState(false);

    const allowed = useAuthzCheck(permission);
    const enabled = useEnableStateCheck(enableState || null);

    const active = allowed && enabled;

    const [onDrop, dropWorking] = useAsyncCallback(async (event: DragEvent) => {
        event.preventDefault();
        setHovered(false);
        if (!event.dataTransfer.files) return;

        for (const file of event.dataTransfer.files) {
            await upload(file);
        }
    }, [upload]);
    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        setHovered(true);
    }, []);
    const onDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault();
        setHovered(false);
    }, []);

    const labelProps = useMemo(() => ({
        htmlFor: fieldId,
        onDrop: onDrop,
        onDragOver: onDragOver,
        onDragLeave: onDragLeave,
        style: hovered ? growStyles._hover : {},
    }), [fieldId, onDrop, onDragOver, onDragLeave, growStyles, hovered]);

    return (
        !active ? (
            <label { ...labelProps }>{ children(false) }</label>
        ) : hidden ? (
            <label { ...labelProps }>{ children(dropWorking || working) }</label>
        ) : (
            <label { ...labelProps }>
                <Clickable onClick={ openMenu }>
                    { children(dropWorking || working) }
                </Clickable>
            </label>
        )
    );
};
