import { useI18n, useMutation, useQuery } from "@/hooks";
import { mutateLogOut, queryCurrentUser } from "@/state";
import {
    Box, Button, Icon, Popover, Stack, Spacer, Text, BlockStyles, Heading
} from "@/components/base";

export const ActiveUserMenu = ({ small = false, buttonStyles, ...props }: BlockStyles & {
    small?: boolean,
    buttonStyles?: BlockStyles
}) => {
    const t = useI18n();

    const [user] = useQuery(queryCurrentUser);

    const [onLogOut, working] = useMutation(mutateLogOut);

    return (
        <Popover
            { ...props }
            trigger={ open => (
                <Button active={ open } { ...buttonStyles }>
                    <Icon name="user" marginRight={ small ? 0 : 0.5 }/>
                    { !small && (
                        <Heading fontSize="md">
                            { !user ? "\u00A0" : user.name.split(' ')[0] }
                        </Heading>
                    ) }
                </Button>
            ) }
        >{ user && (
            <Stack width={ 15 }>
                <Box>
                    <Heading fontSize="md">{ user.name }</Heading>
                    <Text fontSize="sm" color="subtle">{ user.email }</Text>
                </Box>
                <Stack horizontal width="100%">
                    <Spacer/>
                    <Button
                        icon="logout" fontSize="sm"
                        working={ working } onClick={ onLogOut }
                    >
                        { t('Log out') }
                    </Button>
                </Stack>
            </Stack>
        ) }</Popover>
    );
};
