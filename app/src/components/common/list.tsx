/**
*   Component system for type safe presentation of lists of models with good out of the
*   box behavior.
*/
import React, {
    ReactNode, ComponentType, Fragment, createContext, useMemo, useState, useContext,
    useEffect
} from 'react';
import { VStack, Input, Box, Text, Flex, Spinner } from '@chakra-ui/react';

import { I18nFn, I18nValueFn, useI18n } from '@/hooks';
import { BaseModel } from '@/models';

// Spec.
/**
*   List system configuration.
*/
export type ListSpec<T extends BaseModel> = {
    /**
    *   Converts `item` to its string keys, with translation as needed, to support
    *   filtering.
    */
    keyFields: (item: T, t: I18nFn) => string[],
    emptyLabel?: I18nValueFn
};

// Controller.
/**
*   List control interface made available through hooks and to the list provider's
*   parent.
*/
export type ListController<T extends BaseModel> = {
    data: T[] | null,
    filterTerm: string,
    setFilterTerm: (filterTerm: string) => void
};

// System components.
/**
*   Props for a list provider.
*/
export type ListProviderProps<T extends BaseModel> = {
    /**
    *   The list data.
    */
    data: T[] | null,
    /**
    *   Invoked when the filter term changes.
    */
    onFilterTermChanged?: (filterTerm: string) => void,
    /**
    *   Invoked with the {@link ListController} when the it's ready.
    */
    onReady?: (context: ListController<T>) => void,
    children: ReactNode
};

/**
*   Props for a list.
*/
export type ListProps<T extends BaseModel> = {
    maxItems?: number,
    emptyLabel?: I18nValueFn | null,
    emptyView?: ReactNode,
    emptyLabelAlign?: 'center' | 'left',
    spacing?: number,
    initialOrder?: boolean,
    /**
    *   Disables the default vertical layout when passed.
    */
    noLayout?: boolean,
    /**
    *   Filter function to be applied.
    */
    filter?: (item: T) => boolean,
    /**
    *   Callback to render each item in the list.
    */
    children: (item: T) => ReactNode
};

/**
*   Props for a list filter input.
*/
export type ListFilterInputProps = {
    label?: I18nValueFn
};

/**
*   Type safe component system for presenting lists of models.
*/
export type ListSystem<T extends BaseModel> = {
    /**
    *   Provider below which other components must be mounted. 
    */
    ListProvider: ComponentType<ListProviderProps<T>>,
    /**
    *   The list UI. `children` determines how items are rendered.
    */
    List: ComponentType<ListProps<T>>,
    /**
    *   The list filter input.
    */
    FilterInput: ComponentType<ListFilterInputProps>
};

/**
*   Factory for a {@link ListSystem}. See {@link ListSpec} for parameters.
*
*   `T` is the type of the list items.
*
*   If your list is contained to a single component, use {@link useListSystem} instead.
*/
export const createListSystem = <T extends BaseModel>({
    keyFields, emptyLabel: specEmptyLabel
}: ListSpec<T>) => {
    const context = createContext<ListController<T>>(
        null as unknown as ListController<T>
    );

    const useData = (): ListController<T> => useContext(context);

    const ListProvider = ({
        data, onFilterTermChanged, onReady, children
    }: ListProviderProps<T>) => { 
        const [filterTerm, setFilterTerm] = useState('');

        useEffect(() => {
            if (onFilterTermChanged) onFilterTermChanged(filterTerm);
        }, [filterTerm, onFilterTermChanged]);

        const controller = useMemo(() => ({
            data, filterTerm, setFilterTerm
        }), [data, filterTerm]);

        useEffect(() => {
            if (onReady) onReady(controller);
        }, [controller, onReady]);

        return (
            <context.Provider
                value={ controller }
            >
                { data ? (
                    children
                ) : (
                    <Flex minH="10rem" justifyContent="center" alignItems="center">
                        <Spinner/>
                    </Flex>
                )}
            </context.Provider>
        );
    };

    const ListFilterInput = ({ label }: ListFilterInputProps) => {
        const t = useI18n();
        const { filterTerm, setFilterTerm } = useData();

        return (
            <Input
                placeholder={ label ? label(t) : t('Type to search...') }
                value={ filterTerm }
                onChange={ e => setFilterTerm(e.target.value) }
            />
        );
    };

    const List = ({
        children, maxItems, filter: filterProp, emptyLabel, emptyLabelAlign,
        emptyView, noLayout, spacing, initialOrder
    }: ListProps<T>) => {
        const t = useI18n();
        const { data, filterTerm } = useData();
    
        // Filter and slice data.
        const filteredData = useMemo(() => {
            if (!data) return [];

            let preFiltered = data;
            if (filterProp) {
                preFiltered = data.filter(filterProp);
            }

            const termParts = filterTerm.toLowerCase().split(/\s+/);
    
            const results = preFiltered.filter(item => {
                const itemFields = keyFields(item, t);
                for (const termPart of termParts) {
                    if (!itemFields.some(key => key.toLowerCase().includes(termPart))) {
                        return false;
                    }
                }

                return true;
            });
            
            if (!initialOrder) {
                results.sort((a, b) => {
                    const aKey = keyFields(a, t)[0];
                    const bKey = keyFields(b, t)[0];

                    return aKey.localeCompare(bKey);
                });
            }

            return results;
        }, [data, filterTerm, filterProp, initialOrder]);

        const slicedData = useMemo(() => {
            if (!maxItems) return filteredData;
    
            return filteredData.slice(0, maxItems);
        }, [filteredData, maxItems]);

        const finalEmptyLabel = useMemo(() => (
            emptyLabel || specEmptyLabel
        ), [emptyLabel, specEmptyLabel]);

        const inner = (
            slicedData.length ? (
                <>
                    <>
                        { slicedData.map(item => (
                            <Fragment key={ item.id }>
                                { children(item) }
                            </Fragment>
                        )) }
                    </>
                    { slicedData.length < filteredData.length && (
                        <Box width="full" textAlign="center">
                            <Text variant="light">
                                { t('{count} more...', {
                                    count: filteredData.length - slicedData.length
                                }) }
                            </Text>
                        </Box>
                    ) }
                </>
            ) : emptyView || (
                finalEmptyLabel && (
                    <Box
                        width="full"
                        py={ 2 }
                        textAlign={ emptyLabelAlign || 'center' }
                    >
                        <Text variant="light">
                            { filterTerm ? (
                                t('No results.')
                            ) : (
                                finalEmptyLabel ? (
                                    finalEmptyLabel(t)
                                ) : (
                                    t('There\'s nothing here yet.')
                                )
                            ) }
                        </Text>
                    </Box>
                )
            )
        );

        return (
            noLayout ? (
                inner
            ) : (
                <VStack width="full" spacing={ spacing || 2 } alignItems="left">
                    { inner }
                </VStack>
            )
        );
    };

    return { ListProvider, List, ListFilterInput };
};

/**
*   Returns a {@link ListSystem}. See {@link createListSystem}.
*/
export const useListSystem = <T extends BaseModel>(options: ListSpec<T>) => {
    return useMemo(() => createListSystem(options), []);
};
