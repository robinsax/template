import { useCallback, useEffect, useMemo, useState } from "react";

import { MutationError } from "@/errors";
import { I18nValueFn, useMutation } from "@/hooks";
import { MutationFn } from "@/state";

export type FormError = {
    key: string,
    message: I18nValueFn
};

export const useForm = <T, R = void>(
    mutation: MutationFn<T, R>, initialValue: T,
    errors: Record<string, I18nValueFn> = {},
    onSuccess?: (result: R) => void
) => {
    const [values, setValues] = useState({ ...initialValue });
    const [error, setError] = useState<FormError | null>(null);

    const setValue = useCallback((update: Partial<T>) => {
        setValues({ ...values, ...update });
        setError(null);
    }, [values]);

    const [
        onTriggerSubmit, working, mutationError
    ] = useMutation(mutation, onSuccess);

    useEffect(() => {
        if (mutationError) {
            const key = (
                mutationError instanceof MutationError ?
                    mutationError.key : "unknown"
            );
            if (errors[key]) {
                setError({ key, message: errors[key] });
                return;
            }

            setError({ key, message: t => t("An error occurred.") });
        }
    }, [mutationError]);

    const onSubmit = useCallback(() => {
        onTriggerSubmit(values);
    }, [values, onTriggerSubmit]);

    const getFieldProps = useCallback(<P extends keyof T>(name: P) => ({
        name,
        value: values[name],
        onChange: (value: T[P]) => setValue({ [name]: value } as unknown as Partial<T>),
        onEnter: onSubmit
    }), [values, setValue]);

    const form = useMemo(() => ({
        values, getFieldProps, onSubmit
    }), [values, getFieldProps, onSubmit]);

    return [form, working, error] as const;
};
