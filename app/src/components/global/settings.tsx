/**
*   Settings control components. 
*/
import { useQuery, useMutation, useI18n, supportedLocales } from "@/hooks";
import { queryLocalSettings, mutateLocalSettings } from "@/state";
import { Icon, Stack, Switch } from "@/components/base";

/**
*   UI to toggle the theme.
*/
export const ThemeToggle = () => {
    const [currentSettings] = useQuery(queryLocalSettings);
    const [onSettingsChange] = useMutation(mutateLocalSettings);

    return (
        <Stack layout="horizontal" justify="end">
            <Icon name="darkTheme"/>
            <Switch
                active={ !!currentSettings && currentSettings.darkTheme }
                onChange={ () => onSettingsChange({
                    darkTheme: !currentSettings?.darkTheme
                }) }
            />
        </Stack>
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
        <></>
        /*
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
        */
    );
};
