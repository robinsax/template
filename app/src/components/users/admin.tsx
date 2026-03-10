import { useCallback, useMemo, useState } from "react";

import { UserAuditEvent, UserModel } from "@/model";
import {
    LocaleEntry, useI18n, useMutation, useQuery, localesList
} from "@/hooks";
import {
    mutateUserActiveState, queryAllUsers, queryUserAudits
} from "@/state";
import {
    Badge, Button, Card, Heading, Icon, Input, LoadIndicator, Modal, Spacer, Stack, Text
} from "@/components/base";
import { AuditEntry, AuditEventLabels } from "@/components/audit";
import { UserEditForm } from "./forms";

const userEventLabels: AuditEventLabels<UserAuditEvent> = {
    create: [t => t("Created"), "warning"],
    update_password: [t => t("Password updated"), "warning"],
    update_details: [t => t("Details updated"), "primary"],
    confirm: [t => t("Confirmed"), "success"],
    deactivate: [t => t("Deactivated"), "error"],
    reactivate: [t => t("Reactivated"), "success"],
};

const UserAdminDetails = ({ user }: { user: UserModel }) => {
    const t = useI18n();

    const localeEntry = useMemo(() => (
        localesList.find(check => check.key == user.locale) as LocaleEntry
    ), [user.locale]);

    return (
        <Stack gap={ 0.25 }>
            <Stack horizontal gap={ 0.5 }>
                <Heading level={ 3 }>{ user.name }</Heading>
                { !user.is_confirmed && (
                    <Badge fontSize="xs" badgeColor="warning">
                        { t("Unconfirmed") }
                    </Badge>
                ) }
                { user.is_inactive && (
                    <Badge fontSize="xs" badgeColor="error">
                        { t("Inactive") }
                    </Badge>
                ) }
            </Stack>
            <Stack horizontal gap={ 0.5 } color="subtle">
                <Text>{ user.email }</Text>
                <Icon name="dot"/>
                <Text>{ t(localeEntry.label) }</Text>
            </Stack>
        </Stack>
    );
};

const UserAdminCard = ({ user, selected, onClick }: {
    user: UserModel,
    selected?: boolean,
    onClick?: () => void
}) => {
    const [hovered, setHovered] = useState(false);

    return (
        <Card
            width="100%" padding={ 1 } cursor="pointer"
            onClick={ onClick }
            onMouseEnter={ () => setHovered(true) }
            onMouseLeave={ () => setHovered(false) }
        >
            <Stack horizontal width="100%">
                <UserAdminDetails user={ user }/>
                <Spacer/>
                { (hovered || selected) && (
                    <Icon name="right"/>
                ) }
            </Stack>
        </Card>
    );
};

const UserAdminSelection = ({ user }: { user: UserModel }) => {
    const t = useI18n();

    const [editDetailsOpen, setEditDetailsOpen] = useState(false);

    const [audits] = useQuery(queryUserAudits, { userId: user.id });

    const [onMutateActive] = useMutation(mutateUserActiveState);

    const onToggle = useCallback(() => {
        onMutateActive({ userId: user.id, active: user.is_inactive });
    }, [onMutateActive, user.id, user.is_inactive]);

    const onCloseEditDetails = useCallback(() => {
        setEditDetailsOpen(false);
    }, []);

    return <>
        <Stack width="100%">
            <Stack horizontal justify="end" width="100%">
                <UserAdminDetails user={ user }/>
                <Spacer/>
                <Button
                    icon="edit" iconLeft
                    onClick={ () => setEditDetailsOpen(true) }
                >
                    { t("Edit details") }
                </Button>
                { user.is_inactive ? (
                    <Button icon="unlock" iconLeft onClick={ onToggle }>
                        { t("Activate") }
                    </Button>
                ) : (
                    <Button icon="lock" iconLeft onClick={ onToggle }>
                        { t("Deactivate") }
                    </Button>
                ) }
            </Stack>
            { !audits ? (
                <Stack horizontal>
                    <LoadIndicator/>
                    <Text fontSize="sm" color="subtle">
                        { t("Loading events...") }
                    </Text>
                </Stack>
            ) : (
                <Stack>
                    { audits.map(audit => (
                        <AuditEntry
                            key={ audit.id } audit={ audit }
                            events={ userEventLabels }
                        />
                    )) }
                </Stack>
            ) }
        </Stack>
        <Modal open={ editDetailsOpen } onClose={ onCloseEditDetails }>
            <Stack width={ 25 } gap={ 2 }>
                <Stack width="100%" horizontal>
                    <Heading fontSize="lg">{ t("Edit details") }</Heading>
                    <Spacer/>
                    <Button
                        ghost icon="close" fontSize="lg"
                        onClick={ onCloseEditDetails }
                    />
                </Stack>
                <UserEditForm user={ user } onSuccess={ onCloseEditDetails }/>
            </Stack>
        </Modal>
    </>;
};

export const UserAdminList = () => {
    const [users] = useQuery(queryAllUsers);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filterTerm, setFilterTerm] = useState("");

    const processedUsers = useMemo(() => {
        if (!users) return null;

        return users.filter(user => (
            user.name.toLowerCase().includes(filterTerm.toLowerCase())
        ));
    }, [users, filterTerm]);
    const selectedUser = useMemo(() => {
        if (!selectedId || !users) return null;

        return users.find(user => user.id == selectedId);
    }, [selectedId, users]);

    return (
        <Stack horizontal align="start" width="100%" gap={ 4 }>
            <Stack width="50%">
                <Input
                    value={ filterTerm } onChange={ setFilterTerm }
                    placeholder={ t => t("Filter users...") }
                />
                { !processedUsers ? (
                    <Stack horizontal justify="center" width="100%" height={ 10 }>
                        <LoadIndicator />
                    </Stack>
                ) : (
                    <Stack width="100%">
                        { processedUsers.map((user) => (
                            <UserAdminCard
                                key={ user.id } user={ user }
                                selected={ selectedId == user.id }
                                onClick={ () => setSelectedId(user.id) }
                            />
                        )) }
                    </Stack>
                ) }
            </Stack>
            { selectedUser && (
                <Stack width="50%" marginTop={ 4 }>
                    <UserAdminSelection user={ selectedUser }/>
                </Stack>
            ) }
        </Stack>
    );
};
