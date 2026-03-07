/**
*   Settings control components. 
*/
import React from "react";
import {
    HStack, Switch, Text, Popover, PopoverTrigger, PopoverContent, PopoverBody, Button,
    VStack, PopoverArrow, useColorMode
} from "@chakra-ui/react";

import { useQuery, useMutation, useI18n, supportedLocales } from "@/hooks";
import { queryLocalSettings, mutateLocalSettings } from "@/state";
import { Clickable, Icon } from "@/components/design";

/**
*   UI to toggle the theme.
*/
export const ThemeToggle = () => {
    const { colorMode, toggleColorMode } = useColorMode();

    return (
        <HStack justifyContent="right">
            <Icon name="darkTheme"/>
            <Switch
                isChecked={ colorMode == "dark" }
                onChange={ toggleColorMode }
            />
        </HStack>
    );
};

/**
*   UI to select the i18n locale.
*/
export const LocaleSelect = () => {
    const t = useI18n();

    const [currentSettings] = useQuery(queryLocalSettings);
    const [onSettingsChange] = useMutation(mutateLocalSettings);

    return (
        <Popover placement="top-end">
            <PopoverTrigger>
                <Button variant="ghost">
                    <Icon name="globe"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent width="240px">
                <PopoverArrow/>
                <PopoverBody>
                    <VStack spacing={ 1 }>
                        { supportedLocales.map(locale => (
                            <Clickable
                                key={ locale.key }
                                width="full" px={ 2 } py={ 1 }
                                activeColor="offsetBg"
                                variant="solid"
                                active={
                                    !!currentSettings &&
                                    locale.key == currentSettings.locale
                                }
                                onClick={ () => onSettingsChange({
                                    locale: locale.key
                                }) }
                            >
                                <Text
                                    position="relative"
                                    top="1px"
                                    fontSize="xs"
                                >
                                    { t(locale.label) }
                                </Text>
                            </Clickable>
                        )) }
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
