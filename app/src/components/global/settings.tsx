/**
*   Settings control components. 
*/
import React from "react";
import {
    HStack, Switch, Text, Popover, PopoverTrigger, PopoverContent, PopoverBody, Button,
    VStack, PopoverArrow, Box, useColorMode
} from "@chakra-ui/react";

import { useQuery, useMutation, useI18n, supportedLocales } from "@/hooks";
import { queryLocalSettings, mutateLocalSettings } from "@/state";
import { Icon } from "@/components/design";

/**
*   UI to toggle the theme.
*/
export const ThemeToggle = () => {
    const { colorMode, toggleColorMode } = useColorMode();

    return (
        <HStack justifyContent="right">
            <Switch
                isChecked={ colorMode == "dark" }
                onChange={ toggleColorMode }
            />
            <Icon name="darkTheme"/>
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
        <Popover>
            <PopoverTrigger>
                <Button variant="ghost">
                    <Icon name="globe"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent width="auto">
                <PopoverArrow/>
                <PopoverBody>
                    <VStack spacing={ 1 }>
                        { supportedLocales.map(locale => (
                            <Box
                                width="full"
                                p={ 2 }
                                key={ locale.key }
                                onClick={ () => onSettingsChange({ locale: locale.key }) }
                            >
                                <Text
                                    position="relative"
                                    top="1px"
                                    fontSize="xs"
                                >
                                    { t(locale.label) }
                                </Text>
                            </Box>
                        )) }
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
