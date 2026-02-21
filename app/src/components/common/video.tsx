/**
*   Video player against the streams service. 
*/
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, ChakraProps, useInterval } from '@chakra-ui/react';

import { UploadModel } from '@/models';
import { useAsyncEffect, useAPI, useFetchedUpload } from '@/hooks';
import { useBoxShadow } from '@/theme';

import { FullAreaSpinner } from './layouts';
import { Icon } from './icons';

/**
*   Video element, deferred until interaction. Handles access token provision.
*/
const VideoElement = ({ upload, forcedSize, forceYCenter, onLoaded }: {
    upload: UploadModel,
    forcedSize: [number, number] | null,
    forceYCenter?: boolean,
    onLoaded: () => void
}) => {
    const api = useAPI();

    const [loaded, setLoaded] = useState(false);

    const [accessToken, setAccessToken] = useState<string | null>(null);

    useAsyncEffect(async () => {
        const authResp = await api.auth.post({
            restriction: 'asset_get',
            email: null,
            password: null
        });

        setAccessToken(authResp.token);
    }, [upload]);

    const boxShadow = useBoxShadow();

    const onVideoRef = useCallback((video: HTMLVideoElement) => {
        if (!video) return;

        const onCanPlay = () => {
            setLoaded(true);
            onLoaded();
        };

        video.addEventListener('canplay', onCanPlay);
        return () => {
            video.removeEventListener('canplay', onCanPlay);
        };
    }, []);

    return accessToken && (
        <video
            ref={ onVideoRef }
            src={ `/streams/v1/${upload.id}?token=${accessToken}` }
            style={ {
                borderRadius: '5px',
                boxShadow,
                margin: 'auto',
                width: forcedSize ? forcedSize[0] + 'px' : '100%',
                height: forcedSize ? forcedSize[1] + 'px' : '100%',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
                position: loaded ? (forceYCenter ? 'relative' : 'static') : 'absolute',
                top: forceYCenter ? '50%' : 0,
                left: 0,
                transform: forceYCenter ? 'translateY(-50%)' : undefined
            } }
            autoPlay controls muted
        />
    );
};

/**
*   Video player for video uploads. Defers stream until interaction.
*/
export const VideoPlayer = ({ upload, ...props }: {
    upload: UploadModel
} & ChakraProps) => {
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

    const [showPlayer, setShowPlayer] = useState(false);
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [forcedSize, setForcedSize] = useState<[number, number] | null>(null);

    const thumbDataURI = useFetchedUpload(upload.thumbnail);

    const boxShadow = useBoxShadow();
    const centerStyles = useMemo(() => ({
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
    } as ChakraProps), []);

    const isLandscape = useMemo(() => {
        if (!upload.video_metadata) return false;
        return upload.video_metadata.width / upload.video_metadata.height > 1;
    }, [upload.video_metadata]);

    const onLayout = useCallback(() => {
        if (!containerEl || !upload.video_metadata) return;

        const aspect = upload.video_metadata.width / upload.video_metadata.height;

        let videoWidth = containerEl.offsetWidth;
        let videoHeight = videoWidth / aspect;

        const maxHeight = props.height != 'auto' && containerEl.offsetHeight > 0
            ? containerEl.offsetHeight
            : Infinity;

        if (videoHeight > maxHeight) {
            videoHeight = maxHeight;
            videoWidth = videoHeight * aspect;
        }

        setForcedSize([videoWidth, videoHeight]);
    }, [upload, containerEl, props.height]);

    useEffect(onLayout, [containerEl]);

    useInterval(onLayout, 1000);

    return (
        <Box
            ref={ setContainerEl }
            position="relative" color="white"
            width="full" height="full"
            { ...props }
        >
            { !thumbDataURI ? (
                <FullAreaSpinner />
            ) : thumbDataURI && (
                <>
                    { showPlayer && (
                        <VideoElement
                            upload={ upload }
                            forcedSize={ forcedSize }
                            onLoaded={ () => setPlayerLoaded(true) }
                            forceYCenter={ isLandscape }
                        />
                    ) }
                    { !playerLoaded && (
                        <img
                            style={ {
                                borderRadius: props.borderRadius as string || '5px',
                                boxShadow,
                                margin: 'auto',
                                cursor: 'pointer',
                                width: forcedSize ? forcedSize[0] + 'px' : '100%',
                                height: forcedSize ? forcedSize[1] + 'px' : '100%',
                                transition: '0.1s width, 0.1s height',
                                position: props.height == 'auto' ? 'static' : 'relative',
                                top: props.height == 'auto' ? 'unset' : '50%',
                                transform: props.height == 'auto' 
                                    ? 'none' 
                                    : 'translateY(-50%)'
                            } }
                            src={ thumbDataURI }
                            onClick={ () => setShowPlayer(true) }
                        />
                    ) }
                    { !showPlayer && (
                        <Box
                            { ...centerStyles }
                            cursor="pointer"
                            onClick={ () => setShowPlayer(true) }
                        >
                            <Icon name="play" size="2rem"/>
                        </Box>
                    ) }
                    { !playerLoaded && showPlayer && (
                        <FullAreaSpinner { ...centerStyles }/>
                    ) }
                </>
            ) }
        </Box>
    );
};
