/**
*   Settings control components. 
*/
import React from "react";
import {
    HStack, Switch, Text, Popover, PopoverTrigger, PopoverContent, PopoverBody, Button,
    VStack, PopoverArrow, useColorMode
} from "@chakra-ui/react";

import {
    I18nLocaleKey, useLocale, useSupportedLocales, useI18n, useCurrentUserOrNull, useAPI,
    useAsyncCallback
} from "@/hooks";

import { Icon } from "./icons";
import { ClickTarget } from "../layouts/common";

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
    const api = useAPI();

    const user = useCurrentUserOrNull();

    const [currentLocale, setLocale] = useLocale();

    const availableLocales = useSupportedLocales();

    const [onLocaleChange] = useAsyncCallback(async (locale: I18nLocaleKey) => {
        setLocale(locale);
        if (!user) return;

        await api.users.id(user.id).put({
            locale,
            name: null,
            avatar_id: null
        });
    }, [user]);

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
                        { availableLocales.map(locale => (
                            <ClickTarget
                                width="full"
                                showHighlight={ locale.key == currentLocale }
                                p={ 2 }
                                key={ locale.key }
                                onClick={ () => onLocaleChange(locale.key) }
                            >
                                <Text
                                    position="relative"
                                    top="1px"
                                    fontSize="xs"
                                >
                                    { t(locale.label) }
                                </Text>
                            </ClickTarget>
                        )) }
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
