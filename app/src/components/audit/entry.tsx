import { AuditModel, BasicAuditEvent } from "@/model";
import { I18nValueFn, useI18n } from "@/hooks";
import { smartDateFormat } from "@/util";
import { Stack, Badge, Text, BlockStyleColor } from "@/components/base";

export type AuditEventLabels<T extends string> = (
    Record<T, [I18nValueFn<Record<string, unknown>>, BlockStyleColor]>
);

export const basicAuditEventLabels: AuditEventLabels<BasicAuditEvent> = {
    create: [t => t("Created"), "success"],
    update: [t => t("Updated"), "primary"],
    delete: [t => t("Deleted"), "error"]
};

export const AuditEntry = <T extends string = BasicAuditEvent>({ audit, events }: {
    audit: AuditModel,
    events: AuditEventLabels<T>
}) => {
    const t = useI18n();

    const [labelFn, color] = events[audit.event as T];

    return (
        <Stack horizontal>
            <Badge fontSize="sm" badgeColor={ color }>
                { labelFn(t, audit.params || {}) }
            </Badge>
            <Text>
                { smartDateFormat(audit.occurred_at, { withTime: true }) }
                { " " }
                { t("by {user}", { user: audit.user.name }) }
            </Text>
        </Stack>
    );
};
