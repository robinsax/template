import React, { useMemo, memo } from "react";
import { Box, VStack, Text } from "@chakra-ui/react";
import * as rc from "recharts";

import { I18nValueFn, useI18n } from "@/hooks";
import { ThemeColor, useDarkTheme, useThemeColor } from "@/theme";

export type ChartValue = {
    value: number,
    color: string,
    label: I18nValueFn,
    detail?: I18nValueFn,
    onFocus?: () => void
};

export const ValueLimitChart = memo(({
    data, width, height, lineHeight, limitValue, limitLabel, limitDetail
}: {
    data: ChartValue[],
    width: string,
    height: string,
    lineHeight: string,
    limitValue: number,
    limitLabel: I18nValueFn,
    limitDetail: I18nValueFn
}) => {
    const t = useI18n();

    const maxValue = useMemo(() => {
        const sum = data.reduce((acc, datum) => acc + datum.value, 0);
        return Math.max(sum, limitValue);
    }, [data]);

    const budgetRight = useMemo(() => {
        return Math.min((1 - (limitValue / maxValue)) * 100, 80);
    }, [limitValue, maxValue]);

    return (
        <Box width={ width } height={ height }>
            <VStack width="full" alignItems="left">
                <Box
                    width="full" height={ lineHeight }
                    borderRadius="sm"
                    backgroundColor="blackAlpha.200"
                    position="relative"
                >
                    <Box
                        height={ lineHeight }
                        position="absolute"
                        right={ budgetRight + "%" }
                        top={ 0 }
                        bottom={ 0 }
                        opacity={ 0.5 }
                        borderLeft="2px dashed"
                        borderColor="themeText"
                    />
                    { data.map((datum, i) => (
                        <Box
                            key={ i }
                            borderLeftRadius={ !i ? "sm" : "none" }
                            width={ ((datum.value / maxValue) * 100) + "%" }
                            height={ lineHeight }
                            display="inline-block"
                            bg={ datum.color }
                            border="2px solid"
                            borderColor={ datum.color }
                            cursor={ datum.onFocus ? "pointer" : "default" }
                            onClick={ datum.onFocus }
                        />
                    )) }
                </Box>
                <VStack
                    position="absolute"
                    alignItems="flex-end"
                    right={ budgetRight + "%" }
                    bottom={ 0 }
                    spacing={ 0 }
                >
                    <Text fontSize="xs" fontWeight="bold">
                        { limitLabel(t) }
                    </Text>
                    <Text variant="light">
                        { limitDetail(t) }
                    </Text>
                </VStack>
            </VStack>
        </Box>
    );
});

export const PieChart = memo(({ width, height, aspect, data }: {
    width: string,
    height: string,
    aspect: number,
    data: ChartValue[]
}) => {
    const t = useI18n();

    const darkTheme = useDarkTheme();
    const lightColor = useThemeColor("lightText");
    const textColor = useThemeColor("themeText");

    const secondaryColor = darkTheme ? textColor: lightColor;

    return (
        <Box width={ width } height={ height } overflow="visible">
            <style>
                {`
                    .recharts-surface {
                        overflow: visible;
                    }

                    .recharts-selector:hover {
                        transform: scale(1.1);
                    }
                `}
            </style>
            <rc.ResponsiveContainer aspect={ aspect }>
                <rc.PieChart>
                    <rc.Pie
                        data={ data }
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="90%"
                        stroke="none"
                        startAngle={ 90 } endAngle={ -270 }
                        paddingAngle={ 0 }
                        dataKey="value"
                        animationDuration={ 300 }
                        labelLine={ false }
                        label={ ({ label, detail, x, y }) => (
                            <text
                                x={ x } y={ y }
                                fill={ textColor }
                                textAnchor="middle"
                                dominantBaseline="central"
                            >
                                <tspan
                                    x={ x } dy="0em"
                                    fontSize="12" fontWeight="bold"
                                >
                                    { label(t) }
                                </tspan>
                                { detail && (
                                    <tspan
                                        x={ x } dy="1.2em"
                                        fill={ secondaryColor }
                                        fontSize="14"
                                    >
                                        { detail(t) }
                                    </tspan>
                                ) }
                            </text>
                        ) }
                    >
                        { data.map(datum => (
                            <rc.Cell
                                key={`cell-${datum.label(t)}`}
                                fill={ datum.color }
                                stroke={ datum.color }
                                strokeWidth={ 2 }
                                onClick={ datum.onFocus }
                                cursor={ datum.onFocus ? "pointer" : "default" }
                            />
                        )) }
                    </rc.Pie>
                </rc.PieChart>
            </rc.ResponsiveContainer>
        </Box>
    );
});

/**
*   Chart used to show value accumulations over time.
*/
export const AccumulationChart = memo(({
    width, height, data, desiredTrend, desiredTrendColor, projection, projectionColor,
    yMax, formatY, maxTicks
}: {
    width: number,
    height: number,
    data: ChartValue[],
    desiredTrend: number,
    desiredTrendColor: ThemeColor,
    projection: number,
    projectionColor: ThemeColor,
    yMax: number,
    formatY: (value: number) => string,
    maxTicks?: number
}) => {
    const t = useI18n();

    const barColor = useThemeColor(
        data.length ? data[0].color as ThemeColor : "selection"
    );
    const resolvedDesiredTrendColor = useThemeColor(desiredTrendColor);
    const resolvedProjectionColor = useThemeColor(projectionColor);

    const gridColor = useThemeColor("lightBorder");
    const textColor = useThemeColor("themeText");
    const lightTextColor = useThemeColor("lightText");
    const fillColor = useThemeColor("selection");

    const accData = useMemo(() => {
        let acc = 0;
        let desiredAcc = 0;

        return data.map(datum => ({
            ...datum,
            acc: (acc += datum.value).toFixed(2),
            desired: (desiredAcc += desiredTrend).toFixed(2)
        }));
    }, [data, desiredTrend]);

    const tickInterval = useMemo(() => {
        const tickInterval = maxTicks 
            ? Math.ceil(data.length / maxTicks) - 1 
            : 0;
        return tickInterval;
    }, [data.length, maxTicks]);
    
    return (
        <Box width={ width } height={ height }>
            <style>
                {`
                    .recharts-surface {
                        overflow: visible;
                    }
                `}
            </style>
            <rc.ComposedChart
                width={ width }
                height={ height }
                data={ accData }
            >
                <rc.YAxis
                    stroke={ gridColor }
                    domain={ [0, yMax] }
                    orientation="right"
                    tick={ d => (
                        <text
                            x={ d.x + 2 } y={ d.y }
                            textAnchor="left"
                            dominantBaseline="central"
                            fontSize="12" fontWeight="bold"
                            fill={ textColor }
                        >
                            { formatY(d.payload.value) }
                        </text>
                    ) }
                    allowDataOverflow
                />
                <rc.XAxis
                    dataKey={ d => d.label(t) }
                    stroke={ gridColor }
                    interval={ tickInterval }
                    tick={ d => (
                        <text
                            x={ d.x } y={ d.y }
                            textAnchor="middle"
                            dominantBaseline="central"
                        >
                            <tspan
                                x={ d.x } dy="0em"
                                fontSize="12" fontWeight="bold"
                                fill={ textColor }
                            >
                                { d.payload.value }
                            </tspan>
                            { accData[d.index].detail && (
                                <tspan
                                    x={ d.x } dy="1.2em"
                                    fill={ lightTextColor }
                                    fontSize="11"
                                >
                                    {
                                        // @ts-expect-error ts(2722)
                                        accData[d.index].detail(t)
                                    }
                                </tspan>
                            )}
                        </text>
                    ) }
                />
                <rc.CartesianGrid stroke={ gridColor } strokeDasharray="3 3"/>
                <rc.Area
                    dataKey="acc"
                    type="monotone"
                    fill={ fillColor } stroke="none"
                    activeDot={ false }
                    connectNulls
                />
                <rc.Line
                    dataKey="desired"
                    stroke={ resolvedDesiredTrendColor }
                    fill={ resolvedDesiredTrendColor }
                    activeDot={ false }
                    connectNulls
                />
                <rc.ReferenceLine
                    y={ projection }
                    stroke={ resolvedProjectionColor }
                    strokeDasharray="3 3"
                />
                <rc.Bar
                    dataKey="value"
                    fill={ barColor }
                />
            </rc.ComposedChart>
        </Box>
    );
});

const LineChartLine = memo(({ datum, dataKey }: {
    datum: ChartValue,
    dataKey: string
}) => {
    const color = useThemeColor(datum.color as ThemeColor);

    return (
        <rc.Line
            dataKey={ dataKey }
            fill={ color }
            stroke={ color }
        />
    );
});

/**
*   Chart used to show value trends as lines over time.
*/
export const LineChart = memo(({ width, yMax, formatY, height, data, maxTicks }: {
    width: number,
    height: number,
    yMax: number,
    formatY: (value: number) => string,
    data: ChartValue[][],
    maxTicks?: number
}) => {
    const t = useI18n();

    const gridColor = useThemeColor("lightBorder");
    const textColor = useThemeColor("themeText");
    const lightTextColor = useThemeColor("lightText");

    const tickInterval = useMemo(() => {
        const tickInterval = maxTicks 
            ? Math.ceil(data.length / maxTicks) - 1 
            : 0;
        return tickInterval;
    }, [data.length, maxTicks]);
        

    return (
        <Box width={ width } height={ height }>
            <style>
                {`
                    .recharts-surface {
                        overflow: visible;
                    }
                `}
            </style>
            <rc.ComposedChart
                width={ width }
                height={ height }
                data={ data }
            >
                <rc.XAxis
                    dataKey={ d => d[0].label(t) }
                    stroke={ gridColor }
                    interval={ tickInterval }
                    tick={ d => (
                        <text
                            x={ d.x } y={ d.y }
                            textAnchor="left"
                            dominantBaseline="central"
                        >
                            <tspan
                                x={ d.x } dy="0em"
                                fontSize="12" fontWeight="bold"
                                fill={ textColor }
                            >
                                { d.payload.value }
                            </tspan>
                            { data[d.index].map((k, i) => k.detail && (
                                <tspan
                                    key={ i }
                                    x={ d.x } dy="1.2em"
                                    fill={ lightTextColor }
                                    fontSize="11"
                                >
                                    { k.detail(t) }
                                </tspan>
                            )) }
                        </text>
                    ) }
                />
                <rc.YAxis
                    stroke={ gridColor }
                    orientation="right"
                    domain={ [0, yMax] }
                    tick={ d => (
                        <text
                            x={ d.x } y={ d.y }
                            textAnchor="left"
                            dominantBaseline="bottom"
                            fontSize="12" fontWeight="bold"
                            fill={ textColor }
                        >
                            { formatY(d.payload.value) }
                        </text>
                    ) }
                />
                <rc.CartesianGrid stroke={ gridColor } strokeDasharray="3 3"/>
                { data[0].map((_, i) => (
                    <LineChartLine
                        key={ i }
                        datum={ data[0][i] }
                        dataKey={ i + ".value" }
                    />
                ))}
            </rc.ComposedChart>
        </Box>
    );
});
