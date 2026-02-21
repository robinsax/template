/**
*   User search UI. 
*/
import React, { useState } from 'react';
import { VStack, Button } from '@chakra-ui/react';

import { UserModel } from '@/models';
import { useFetchedState, useI18n } from '@/hooks';
import { ClickTarget, Icon } from '@/components/common';

import { UserPersona } from './personas';
import { UserInvite, useUserList } from './manager';

/**
*   Filterable user search UI.
*/
export const UserSearch = ({ allowInvite, onSelect }: {
    allowInvite?: boolean,
    onSelect: (user: UserModel) => void
}) => {
    const t = useI18n();

    const { ListProvider, ListFilterInput, List } = useUserList();

    const [inviting, setInviting] = useState(false);
    const [users] = useFetchedState(api => api.users.get());

    return (
        <ListProvider data={ users }>
            <VStack spacing={ 4 } alignItems="left">
                { !inviting ? (
                    <>
                        <ListFilterInput/>
                        <List maxItems={ 5 } spacing={ 1 }>
                            { user => (
                                <ClickTarget p={ 2 } onClick={ () => onSelect(user) }>
                                    <UserPersona for={ user } size="sm" withType/>
                                </ClickTarget>
                            ) }
                        </List>
                        { allowInvite && (
                            <Button
                                leftIcon={ <Icon name="mail"/> }
                                onClick={ () => setInviting(true) }
                            >
                                { t('Invite someone to Kedet') }
                            </Button>
                        ) }
                    </>
                ) : (
                    <UserInvite onInvited={ onSelect }>
                        <Button
                            onClick={ () => setInviting(false) }
                            variant="ghost"
                        >
                            { t('Cancel') }
                        </Button>
                    </UserInvite>
                ) }
            </VStack>
        </ListProvider>
    );
};
