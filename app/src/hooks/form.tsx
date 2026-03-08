import { useCallback, useMemo, useState } from "react";

import { MutationError } from "@/errors";
import { I18nValueFn, useI18n, useMutation } from "@/hooks";
import { MutationFn } from "@/state";

export const useForm = <T,>(
    mutation: MutationFn<T>, initialValue: T,
    errors: Record<string, I18nValueFn>
) => {
    const t = useI18n();

    const [values, setValues] = useState({ ...initialValue });

    const setValue = useCallback(<P extends keyof T>(key: P, value: T[P]) => {
        setValues({ ...values, [key]: value });
    }, [values]);

    const [onTriggerSubmit, working, mutationError] = useMutation(mutation);

    const error = useMemo(() => {
        if (mutationError) {
            const isDefined = (
                mutationError instanceof MutationError && 
                errors[mutationError.key]
            );
            if (isDefined) return errors[mutationError.key](t);

            return t("An error occurred");
        }

        return null;
    }, [mutationError]);

    const onSubmit = useCallback(() => {
        onTriggerSubmit(values);
    }, [values, onTriggerSubmit]);

    return [values, setValue, onSubmit, working, error] as const;
};
