/**
*   Form system. This custom form system:
*   - Is type-safe.
*   - Supports complex value types.
*   - Gives us granular control over form behavior.
*
*   Type arguments used in this implementation:
*   - `T`, the object type the form is for.
*   - `F`, the keys (fields) of `T` handled by the form.
*       - Called `N` instead when it is known to be a single key.
*   - `V`, the type of the value of a key for `T`.
*/
import React, {
    ReactNode, KeyboardEvent, ComponentType, createContext, useState, useMemo,
    useContext, useEffect, useCallback
} from "react";
import {
    Alert, Button, Input, FormControl, FormLabel, FormErrorMessage, Textarea
} from "@chakra-ui/react";
import { Select, SelectButton, SelectList } from "@saas-ui/react";

import { throwOrFallback } from "@/util";
import { APIError, I18nValueFn, useI18n } from "@/hooks";
import { IconName, Icon, LoadIndicator } from "@/components/design";

// Spec types.
export type FormSelectOption<V extends string> = {
    value: V,
    label: I18nValueFn
};

export type FormFieldProps<V, T = unknown> = {
    value: V | null,
    setValue: (value: V | null) => void,
    error: string | null,
    setError: (error: string | null) => void,
    /**
    *   The target object that is being edited by this form, if there is one.
    */
    target: T | null
};

/**
*   Type-safe form field configuration.
*
*   Requires input type that will be used for this field is provided and valid given the
*   type of `T[N]`.
*
*   A component implementation that matches `T[N]` can be provided for custom field UI.
*/
export type FormFieldSpec<T, N extends keyof T> = (
    // These fields...
    {
        optional?: boolean,
        default?: T[N]
    } & (
        // Plus either a custom component that matches the type, OR...
        {
            Component: ComponentType<FormFieldProps<T[N], T>>
        } | (
            number extends T[N] ?
                // Specify numeric for numbers.
                {
                    label: I18nValueFn,
                    placeholder?: I18nValueFn,
                    type: "number"
                }
            : string extends T[N] ? (
                // Specify text or password for raw strings.
                {
                    label: I18nValueFn,
                    placeholder?: I18nValueFn,
                    type?: "text" | "textarea" | "password"
                } | (
                    NonNullable<T[N]> extends string ?
                    // Specify select for enumerated types.
                    {
                        label: I18nValueFn,
                        placeholder?: I18nValueFn,
                        type: "select",
                        options: FormSelectOption<NonNullable<T[N]>>[]
                    }
                    :
                    never
                )
            ) : Date extends T[N] ?
                // Specify datetime for dates.
                {
                    label: I18nValueFn,
                    placeholder?: I18nValueFn,
                    type: "datetime"
                }
            :
                // Can"t automatically render this field.
                never
        )
    )
);

/**
*   A {@link FormFieldSpec} for exactly each field of a form system.
*
*   Fields can be defined as `null` when they are set programatically and should not be
*   rendered
*/
export type FormFieldSpecs<T, F extends keyof T> = {
    [N in F]: FormFieldSpec<T, N> | null
};

/**
*   Submit implementation for a form system.
*/
export type FormSubmitFn<T, F extends keyof T> = (
    (
        values: Pick<T, F>, setError: (error: string | null) => void
    ) => void
);

/**
*   Form system configuration.
*/
export type FormSpec<T, F extends keyof T> = {
    /**
    *   Type safe field configurations.
    */
    fields: FormFieldSpecs<T, F>,
    /**
    *   Global error message presentations. Keys should be errors returned by the API
    *   (i.e. the parameters to `Invalid` or `Unauthorized` for each known case).
    */
    errors?: Record<string, I18nValueFn>
};

// Controller.
export type FormKey = string | number | symbol;

/**
*   Error state including per-field errors and global error.
*/
export type FormErrorValues<F extends FormKey> = {
    [name in F | "_global"]: string | null
};

/**
*   Callback that sets a value for a pre-determined field.
*/
export type FormValueSetFn<T, F extends keyof T> = (value: T[F]) => void;

/**
*   Callback that sets a value for a given field.
*/
export type FormAnyValueSetFn<T, F extends keyof T> = (
    <N extends F>(name: N, value: T[N] | null) => void
);

/**
*   Form controller interface made available through hooks and to the form provider"s
*   parent.
*/
export type FormController<T, F extends keyof T = keyof T> = {
    setValue: FormAnyValueSetFn<T, F>,
    values: Pick<T, F>,
    setError: (name: F | null, error: string | null) => void,
    errors: FormErrorValues<F>,
    /**
    *   The target object that is being edited by this form, if there is one.
    */
    target: T | null,
    /**
    *   Submits the form.
    */
    onSubmit: () => void,
    /**
    *   Whether the form is currently submitting.
    */
    working: boolean
};

// System components.
export type FormFieldsProps<T, F extends keyof T = keyof T> = {
    names: F[]
};

/**
*   Props for a form submit button.
*/
export type FormSubmitProps<T> = {
    label?: I18nValueFn<T | null>,
    iconName?: IconName
};

/**
*   Props for a form provider.
*/
export type FormProviderProps<T, F extends keyof T = keyof T> = {
    children: ReactNode,
    /**
    *   The target object that is being edited by this form, if there is one.
    */
    target?: T,
    /**
    *   Submit implementation callback for this form.
    */
    onSubmit?: FormSubmitFn<T, F>,
    /**
    *   Invoked with the {@link FormController} when the it"s ready.
    */
    onReady?: (context: FormController<T, F>) => void,
    /**
    *   When passed, the form will automatically submit each time a value changes.
    */
    submitOnChange?: boolean
};

/**
*   Type-safe component system implementing a form.
*/
export type FormSystem<T, F extends keyof T = keyof T> = {
    /**
    *   Provider below which other components must be mounted.
    */
    FormProvider: ComponentType<FormProviderProps<T, F>>,
    /**
    *   Renders a set of fields of the form.
    */
    FormFields: ComponentType<FormFieldsProps<T, F>>,
    /**
    *   Renders the global form error when there is one.
    */
    FormError: ComponentType,
    /**
    *   Renders a working-state aware submit button.
    */
    FormSubmitButton: ComponentType<FormSubmitProps<T>>,
    /**
    *   Returns the form system context.
    */
    useForm: () => FormController<T, F>
};

// Internal hooks.
const useErrors = <T, F extends keyof T>(fieldsSpec: FormFieldSpecs<T, F>) => {
    const defaults = useMemo(() => {
        const errors = { _global: null } as FormErrorValues<F>;

        for (const name in fieldsSpec) errors[name] = null;

        return errors;
    }, []);

    const [errors, setErrors] = useState(defaults);

    const setError = useMemo(() => {
        return (name: F | null, error: string | null) => {
            setErrors(errors => ({ ...errors, [name || "_global"]: error }));
        };
    }, []);

    const clearError = useMemo(() => {
        return (name: F | null) => {
            setError(null, null);
            setError(name, null);
        };
    }, []);

    return [errors, setError, clearError] as const;
};

const useValues = <T, F extends keyof T>(
    fieldsSpec: FormFieldSpecs<T, F>,
    clearError: (name: F | null) => void, target?: T
) => {
    const defaults = useMemo(() => {
        const values = {} as Pick<T, F>;

        for (const key in fieldsSpec) {
            if (!fieldsSpec[key]) continue;
            // @ts-expect-error ts(2322)
            values[key] = fieldsSpec[key].default || null;
        }

        if (target) {
            for (const name in fieldsSpec) {
                values[name] = target[name];
            }
        }

        return values;
    }, [target]);

    const [values, setValues] = useState(defaults);

    const setValue = useMemo(() => {
        return <N extends F>(name: N, value: T[N] | null) => {
            setValues(values => ({ ...values, [name]: value }));
            clearError(name);
        };
    }, []);

    return [values, setValue] as const;
};

// Factory.
/**
*   Factory for a {@link FormSystem}. See {@link FormSpec} for parameters.
*
*   `T` is the type of the object this form is for. `F` is the set of keys (fields) of
*   that type that this form handles. Only provide it if any fields are not handled.
*
*   If your form is contained to a single component, use {@link useFormSystem} instead.
*/
export const createFormSystem = <T, F extends keyof T = keyof T>({
    fields: fieldsSpec,
    errors: errorsSpec = {}
}: FormSpec<T, F>) => {
    const context = createContext(null as unknown as FormController<T, F>);

    const useForm = () => useContext(context);

    const FormProvider = ({
        children, target, onSubmit, onReady, submitOnChange
    }: FormProviderProps<T, F>) => {
        const t = useI18n();

        const [errors, setError, clearError] = useErrors(fieldsSpec);
        const [values, setValue] = useValues(fieldsSpec, clearError, target);
        const [working, setWorking] = useState(false);

        // Submit handling.
        const onSubmitWrapped = useCallback(() => {
            if (!onSubmit) return throwOrFallback("no onSubmit");
            setWorking(true);

            let hasError = false;
            for (const name in fieldsSpec) {
                if (!fieldsSpec[name] || "Component" in fieldsSpec[name]) continue;
    
                if (errors[name]) {
                    hasError = true;
                    continue;
                }
    
                if (!values[name] && !fieldsSpec[name].optional) {
                    setError(name, t("Required."));
                    hasError = true;
                }
            }
    
            if (hasError) return;
    
            try {
                onSubmit(values, error => setError(null, error));
            } catch (err) {
                if (!(err instanceof APIError)) {
                    throw err;
                }
    
                const errorLabel = errorsSpec[err.detail];
    
                setError(null, errorLabel ? errorLabel(t) : t("An error occurred."));
            } finally {
                setWorking(false);
            }
        }, [errors, values]);

        // Collect controller.
        const form = useMemo<FormController<T, F>>(() => ({
            errors, setError, values, setValue,
            target: target || null, working, onSubmit: onSubmitWrapped
        }), [errors, setError, values, setValue, target, working, onSubmitWrapped]);

        // Submit on change.
        useEffect(() => {
            if (submitOnChange) onSubmitWrapped();
        }, [values]);

        // Make controller available to parent.
        useEffect(() => {
            if (onReady) onReady(form);
        }, [form]);

        return (
            <context.Provider value={ form }>
                { children }
            </context.Provider>
        );
    };

    const Field = <N extends F>({ name, spec }: {
        name: N,
        spec: FormFieldSpec<T, N>
    }) => {
        const t = useI18n();

        const {
            target, values, setValue, setError, errors, onSubmit
        } = useForm();

        const options = useMemo(() => {
            if (!("options" in spec)) return undefined;

            return spec.options.map(option => option.value);
        }, [spec]);

        const labelFor = useCallback((value: string): string => {
            if (!options || !("options" in spec)) return "";

            const option = spec.options[options.indexOf(value as T[N] & string)];

            return option ? option.label(t) : "";
        }, [t]);

        const valueFor = useCallback((label: string): T[N] => {
            if (!options || !("options" in spec)) return "" as T[N];

            const option = spec.options.find(option => option.label(t) == label);

            return option ? option.value : "" as T[N];
        }, [spec]);

        const onEnter = useCallback((event: KeyboardEvent) => {
            if (event.key != "Enter") return;

            onSubmit();
        }, [onSubmit]);

        return (
            "Component" in spec ? (
                // Custom component.
                <spec.Component
                    target={ target }
                    value={ values[name] }
                    error={ errors[name] }
                    setError={ error => setError(name, error) }
                    setValue={ value => setValue(name, value) }
                />
            ) : (
                // Automatic component.
                <FormControl isRequired={ !spec.optional }>
                    <FormLabel>
                        { spec.label(t) }
                    </FormLabel>
                    { spec.type == "select" ? (
                        <Select
                            name={ name as string }
                            placeholder={
                                spec.placeholder ? spec.placeholder(t) : undefined
                            }
                            value={ values[name] as string || "" }
                            options={ options ? options.map(labelFor) : [] }
                            renderValue={ value => labelFor(value[0] as string) }
                            onChange={ label => setValue(name, valueFor(label)) }
                        >
                            <SelectButton/>
                            <SelectList/>
                        </Select>
                    ) : spec.type == "textarea" ? (
                        <Textarea
                            name={ name as string }
                            placeholder={
                                spec.placeholder ? spec.placeholder(t) : undefined
                            }
                            value={ values[name] as string || "" }
                            resize="none"
                            onChange={ e => setValue(name, e.target.value as T[N]) }
                        />
                    ) : (
                        <Input
                            name={ name as string }
                            placeholder={
                                spec.placeholder ? spec.placeholder(t) : undefined
                            }
                            type={ spec.type || "text" }
                            value={ values[name] as string || "" }
                            onChange={ e => setValue(name, e.target.value as T[N]) }
                            onKeyUp={ onEnter }
                        />
                    ) }
                    { errors[name] && (
                        <FormErrorMessage>
                            { errors[name] }
                        </FormErrorMessage>
                    ) }
                </FormControl>
            )
        );
    };

    const fields = {} as Record<F, ComponentType>;
    for (const name in fieldsSpec) {
        if (!fieldsSpec[name]) continue;

        fields[name] = () => (
            <Field
                name={ name }
                spec={ fieldsSpec[name] as unknown as FormFieldSpec<T, F> }
            />
        );
    }

    const FormFields = ({ names }: FormFieldsProps<T, F>) => {
        const components = useMemo(() => {
            const components: [F, ComponentType][] = [];
            for (const name of names) {
                if (!fieldsSpec[name]) continue;

                components.push([name, fields[name]]);
            }
            return components;
        }, [names]);

        return (
            <>
                { components.map(([name, Component]) => (
                    <Component key={ name as string }/>
                )) }
            </>
        );
    };

    const FormError = () => {
        const { errors } = useForm();

        return errors._global && (
            <Alert status="error">
                { errors._global }
            </Alert>
        );
    };

    const FormSubmit = ({ label, iconName }: FormSubmitProps<T>) => {
        const t = useI18n();

        const { working, target, onSubmit } = useForm();

        return (
            <Button
                isLoading={ working }
                width="full"
                leftIcon={ iconName ? <Icon name={ iconName }/> : undefined }
                onClick={ onSubmit }
            >
                { working ? (
                    <LoadIndicator/>
                ) : (
                    label ? label(t, target || null) : t("Save")
                ) }
            </Button>
        );
    };

    return { FormProvider, FormFields, FormError, FormSubmit, useForm };
};

/**
*   Returns a {@link FormSystem}. See {@link createFormSystem}.
*
*   An `onSubmit` callback can be passed now, rather than to the returned provider.
*/
export const useFormSystem = <T, F extends keyof T = keyof T>(
    options: FormSpec<T, F> & { onSubmit?: FormSubmitFn<T, F> }
) => {
    return useMemo(() => {
        const form = createFormSystem(options);

        if (options.onSubmit) {
            const InnerProvider = form.FormProvider;
            form.FormProvider = ({ children, ...props }) => (
                <InnerProvider
                    { ...props }
                    onSubmit={ props.onSubmit || options.onSubmit }
                >
                    { children }
                </InnerProvider>
            );
        }

        return form;
    }, []);
};
