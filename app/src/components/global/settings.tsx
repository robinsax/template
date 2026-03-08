/**
*   Settings control components. 
*/
import { useQuery, useMutation, useI18n, supportedLocales } from "@/hooks";
import { queryLocalSettings, mutateLocalSettings } from "@/state";
import { Icon, Popover, Stack, Switch, Button, Text } from "@/components/base";

/**
*   UI to toggle the theme.
*/
export const ThemeToggle = () => {
    const [currentSettings] = useQuery(queryLocalSettings);
    const [onSettingsChange] = useMutation(mutateLocalSettings);

    return (
        <Stack horizontal justify="end">
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
        <Popover
            trigger={ open => (
                <Button ghost active={ open }>
                    <Icon name="globe"/>
                </Button>
            ) }
            panelStyles={ {
                width: 10
            } }
        >
            <Stack gap={ 1 }>
                <Text fontSize="xs" color="subtle">
                    { t("Select a language") }
                </Text>
                { supportedLocales.map(locale => (
                    <Button ghost
                        key={ locale.key }
                        active={
                            !!currentSettings &&
                            currentSettings.locale == locale.key
                        }
                        width="100%"
                        justifyContent="flex-start"
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
                    </Button>
                )) }
            </Stack>
        </Popover>
    );
};
