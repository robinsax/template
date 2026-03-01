import React, { Fragment, useState, useCallback, useEffect } from "react";
import { Heading, Text, HStack } from "@chakra-ui/react";

import { useI18n } from "@/hooks";

export const LiveClock = ({ upFrom, downTo }: {
    upFrom?: Date | null,
    downTo?: Date | null
}) => {
    const t = useI18n();

    const getValue = useCallback(() => {
        let time = null;
        if (upFrom) {
            time = (Date.now() - upFrom.getTime()) / 1000;
        } else if (downTo) {
            time = (downTo.getTime() - Date.now()) / 1000;
        }
        if (!time || time < 0) return [null, null, null, null];

        const days = Math.floor(time / (60 * 60 * 24));
        const hours = Math.floor((time % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((time % (60 * 60)) / 60);
        const seconds = Math.floor(time % 60);

        return [days, hours, minutes, seconds];
    }, [upFrom, downTo]);

    const [value, setValue] = useState(getValue());

    useEffect(() => {
        const interval = setInterval(() => {
            setValue(getValue());
        }, 250);

        return () => clearInterval(interval);
    }, [getValue]);

    return (
        <HStack>
            { value.map((v, i) => (
                <Fragment key={ i }>
                    <Heading
                        textAlign="center" width="2rem"
                        color={
                            (v !== null && v !== undefined) ? "themeText" : "lightText"
                        }
                    >
                        { v ? v.toFixed(0).padStart(2, "0") : "00" }
                    </Heading>
                    { i != 3 && <Text color="lightText">{ t(":") }</Text> }
                </Fragment>
            )) }
        </HStack>
    );
};
