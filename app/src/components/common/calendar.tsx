/**
*   Calendar and date picker components.
*/
import React, { ReactNode, useMemo, useState, useCallback } from 'react';
import {
    Popover, PopoverTrigger, PopoverContent, Button, Box, Grid, Text, Flex, Divider,
    VStack
} from '@chakra-ui/react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
    isSameDay, isSameMonth,
    isWithinInterval
} from 'date-fns';

import { useI18n } from '@/hooks';

import { Icon } from './icons';

// Calendar.
type CalendarDay = {
    date: number,
    value: Date,
    selected: boolean,
    isToday: boolean,
    leftBoundary: boolean,
    rightBoundary: boolean,
    month: boolean
};

type CalendarValue = Date | [Date, Date];

/**
*   Calendar view that allows date- or date-range selection.
*
*   View only when `setValue` is not passed.
*/
export const Calendar = ({ range, value, minimal, setValue }: {
    range: boolean,
    value: CalendarValue | null,
    minimal?: boolean,
    setValue?: ((date: CalendarValue) => void)
}) => {
    const t = useI18n();

    const [month, setMonth] = useState(new Date());
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  
    // Build week rows.
    const weeks = useMemo(() => {
        const startDate = startOfWeek(startOfMonth(month));
        const endDate = endOfWeek(endOfMonth(month));

        let day = startDate;
        const weeks: CalendarDay[][] = [];
        while (day <= endDate) {
            const week: CalendarDay[] = [];
            for (let i = 0; i < 7; i++) {
                const current = addDays(day, i);
                const isCurrentMonth = isSameMonth(current, month);

                let selected = false;
                let leftBoundary = false;
                let rightBoundary = false;
                if (value && value instanceof Date) {
                    selected = isSameDay(current, value);
                    leftBoundary = selected;
                    rightBoundary = selected;
                }
                else if (value || (rangeStart && rangeEnd)) {
                    let start, end;
                    if (rangeStart && rangeEnd) {
                        start = rangeStart as Date;
                        end = rangeEnd as Date;
                    }
                    else {
                        start = (value as Date[])[0];
                        end = (value as Date[])[1];
                    }

                    if (start > end) {
                        const temp = start;
                        start = end;
                        end = temp;
                    }

                    selected = isWithinInterval(current, { start, end });
                    leftBoundary = isSameDay(current, start);
                    rightBoundary = isSameDay(current, end);
                }

                week.push({
                    date: current.getDate(),
                    value: current,
                    isToday: isSameDay(current, new Date()),
                    selected,
                    leftBoundary,
                    rightBoundary,
                    month: isCurrentMonth
                });
            }
            weeks.push(week);
            day = addDays(day, 7);
        }

        return weeks;
    }, [month, rangeStart, rangeEnd, value]);

    // Input callbacks.
    const onDateClick = useCallback((date: Date) => {
        if (!setValue) return;

        if (!range) {
            setValue(date);
        }
        else {
            if (!rangeStart) {
                setRangeStart(date);
            }
            else {
                if (date < rangeStart) setValue([date, rangeStart]);
                else setValue([rangeStart, date]);

                setRangeStart(null);
                setRangeEnd(null);
            }
        }
    }, [range, rangeStart, setValue]);

    const onDateHover = useCallback((date: Date) => {
        if (!range || !rangeStart || !setValue) return;

        setRangeEnd(date);
    }, [range, rangeStart, setValue]);

    return (
      <VStack width="full" spacing={ minimal ? 0 : 2 }>
        <Flex
            width="full"
            justifyContent={ minimal ? 'center' : 'space-between' }
            mb={ minimal ? 0 : 2 }
        >
            { !minimal && (
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={ () => setMonth(addMonths(month, -1)) }
                >
                    <Icon name="left"/>
                </Button>
            ) }
            <Text fontSize={ minimal ? 'xs' : 'md' }>
                { format(month, 'MMMM yyyy') }
            </Text>
            { !minimal && (
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={ () => setMonth(addMonths(month, 1)) }
                >
                    <Icon name="right"/>
                </Button>
            ) }
        </Flex>
        { !minimal && (
            <>
                <Divider/>
                <Grid
                    width="full"
                    templateColumns="repeat(7, 1fr)"
                    fontWeight="bold"
                    fontSize="xs"
                    textAlign="center"
                    mb={1}
                >
                    <Text>{ t('Su') }</Text>
                    <Text>{ t('Mo') }</Text>
                    <Text>{ t('Tu') }</Text>
                    <Text>{ t('We') }</Text>
                    <Text>{ t('Th') }</Text>
                    <Text>{ t('Fr') }</Text>
                    <Text>{ t('Sa') }</Text>
                </Grid>
            </>
        )}
        <Box>
            { weeks.map((week, i) => (
                <Grid key={ i } templateColumns="repeat(7, 1fr)">
                    { week.map(day => (
                        <Box
                            key={day.date}
                            p={2}
                            bg={
                                (day.leftBoundary || day.rightBoundary) ? 'selection' :
                                (day.isToday || day.selected) ? 'lightSelection' :
                                'transparent'
                            }
                            color={
                                (day.selected || day.month) ?
                                    'themeText' : 'lightText'
                            }
                            textAlign="center"
                            cursor={ setValue ? 'pointer' : 'default' }
                            fontSize="xs"
                            borderRadius="md"
                            borderLeftRadius={
                                (day.selected && !day.leftBoundary) ? '0px' : 'md'
                            }
                            borderRightRadius={
                                (day.selected && !day.rightBoundary) ? '0px' : 'md'
                            }
                            _hover={
                                setValue ? { bg: 'selection' } : undefined
                            }
                            onClick={ () => onDateClick(day.value) }
                            onMouseOver={ () => onDateHover(day.value) }
                        >
                            { day.date }
                        </Box>
                    )) }
                </Grid>
            ))}
        </Box>
      </VStack>
    );
};

/**
*   Popover that contains a calendar for date picker implementation.
*/
const PickerPopover = ({ range, value, setValue, children }: {
    range: boolean,
    value: CalendarValue | null,
    setValue?: (date: CalendarValue) => void,
    children: ReactNode
}) => {  
    return (
      <Popover>
        <PopoverTrigger>
            { children }
        </PopoverTrigger>
        <PopoverContent width="auto" p={4}>
          <Calendar range={ range } value={ value } setValue={ setValue }/>
        </PopoverContent>
      </Popover>
    );
};

// Pickers.
/**
*   Date picker for a single date. Compatible with form systems.
*/
export const DatePicker = ({ children, value, setValue }: {
    children: ReactNode,
    value: Date | null,
    setValue?: (date: Date) => void
}) => {
    return (
        <PickerPopover
            range={ false }
            value={ value }
            setValue={ setValue as (date: CalendarValue) => void }
        >
            { children }
        </PickerPopover>
    );
};

/**
*   Date picker for a date range. Compatible with form systems.
*/
export const DateRangePicker = ({ children, value, setValue }: {
    children: ReactNode,
    value: [Date, Date] | null,
    setValue?: (date: [Date, Date]) => void
}) => {
    return (
        <PickerPopover
            range={ true }
            value={ value }
            setValue={ setValue as (date: CalendarValue) => void }
        >
            { children }
        </PickerPopover>
    );
};
