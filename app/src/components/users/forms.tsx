/**
*   User related forms.
*/
import { ReactNode, useEffect, useMemo, useState } from "react";

import { I18nValueFn, useForm, useI18n } from "@/hooks";
import {
    MutationFn, mutateLogIn, mutateCreateUser, mutateRequestPasswordReset
} from "@/state";
import { Alert, Button, Input, Stack, Field, Box } from "@/components/base";

// Validation errors corresponding to API.
const passwordValidationErrors: Record<string, I18nValueFn> = {
    password_too_short: t => t("Password must be at least 10 characters long."),
    password_no_special: t => t("Password must contain at least one special character.")
};

const nameValidationErrors: Record<string, I18nValueFn> = {
    invalid_name: t => t("Invalid name."),
    name_too_long: t => t("Name is too long.")
};

const emailValidationErrors: Record<string, I18nValueFn> = {
    invalid_email: t => t("Invalid email."),
    email_too_long: t => t("Email is too long.")
};

export const RequestPasswordResetForm = ({ initialEmail, onSuccess }: {
    initialEmail?: string | null,
    onSuccess: () => void
}) => {
    const t = useI18n();

    const [form, working, error] = useForm(mutateRequestPasswordReset, {
        email: initialEmail || ""
    }, {}, onSuccess);

    return (
        <Stack gap={ 2 } textAlign="left">
            <Alert>
                { t("Enter your email and we'll send you a password reset link.") }
            </Alert>
            { error && (
                <Alert type="error">
                    { error.message(t) }
                </Alert>
            ) }
            <Field
                required name="email"
                label={ t => t("Email") } icon="email"
            >
                <Input
                    type="text"
                    placeholder={ t => t("example@example.com") }
                    { ...form.getFieldProps("email") }
                />
            </Field>
            <Button
                icon="email" width="100%" working={ working }
                onClick={ form.onSubmit }
            >
                { t("Send link") }
            </Button>
        </Stack>
    );
};

export const PasswordSetForm = <T extends { password: string }>({
    mutation, initial, onSuccess
}: {
    mutation: MutationFn<T>,
    initial: T,
    onSuccess?: () => void
}) => {
    const t = useI18n();

    const [form, working, error] = useForm(mutation, initial, {
        ...passwordValidationErrors,
        invalid_token: t => t("This link is invalid or has expired.")
    }, onSuccess);

    const [passwordError, globalError] = useMemo(() => {
        if (!error) return [null, null];

        if (error.key in passwordValidationErrors) {
            return [error.message, null];
        }
        return [null, error.message];
    }, [error]);

    const [confirmPassword, setConfirmPassword] = useState("");

    const confirmError = !!confirmPassword && (form.values.password != confirmPassword);

    return (
        <Stack gap={ 2 } textAlign="left">
            { globalError && (
                <Alert type="error">
                    { globalError(t) }
                </Alert>
            ) }
            <Field
                required name="password"
                label={ t => t("Password") } icon="password"
                error={ passwordError }
            >
                <Input
                    type="password"
                    placeholder={ t => t("●●●●●●●●●") }
                    invalid={ !!passwordError }
                    { ...form.getFieldProps("password") }
                />
            </Field>
            <Field
                required name="confirmPassword"
                label={ t => t("Confirm Password") } icon="password"
                error={
                    confirmError ?
                        t => t("Passwords must match.") : undefined
                }
            >
                <Input
                    type="password" name="confirmPassword"
                    placeholder={ t => t("●●●●●●●●●") }
                    value={ confirmPassword }
                    invalid={ confirmError }
                    onChange={ confirmPassword => setConfirmPassword(confirmPassword) }
                />
            </Field>
            <Button
                working={ working } onClick={ form.onSubmit }
                width="100%" icon="unlock"
            >
                { t("Confirm") }
            </Button>
        </Stack>
    );
};

export const CreateUserForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const t = useI18n();

    const [form, working, error] = useForm(mutateCreateUser, {
        email: "",
        name: ""
    }, {
        already_exists: t => t("That email is already registered."),
        ...emailValidationErrors,
        ...nameValidationErrors,
    }, onSuccess);

    const [nameError, emailError, globalError] = useMemo(() => {
        if (!error) return [null, null, null];

        if (error.key in nameValidationErrors) {
            return [error.message, null, null];
        } else if (error.key in emailValidationErrors) {
            return [null, error.message, null];
        } else {
            return [null, null, error.message];
        }
    }, [error]);

    return (
        <Stack gap={ 2 } textAlign="left">
            { globalError && (
                <Alert type="error">
                    { globalError(t) }
                </Alert>
            ) }
            <Field
                required name="name"
                label={ t => t("Name") } icon="user"
                error={ nameError }
            >
                <Input
                    type="text"
                    placeholder={ t => t("Jane Smith") }
                    invalid={ !!nameError }
                    { ...form.getFieldProps("name") }
                />
            </Field>
            <Field
                required name="email"
                label={ t => t("Email") } icon="email"
                error={ emailError }
            >
                <Input
                    type="text"
                    placeholder={ t => t("you@email.com") }
                    invalid={ !!emailError }
                    { ...form.getFieldProps("email") }
                />
            </Field>
            <Button
                working={ working } onClick={ form.onSubmit }
                width="100%" icon="signup"
            >
                { t("Sign up") }
            </Button>
        </Stack>
    );
};

export const LoginForm = ({ onEmailChanged, afterPassword }: {
    onEmailChanged?: (email: string) => void,
    afterPassword?: ReactNode
}) => {
    const t = useI18n();

    const [form, working, error] = useForm(mutateLogIn, {
        email: "",
        password: ""
    }, {
        invalid_credentials: t => t("Incorrect email or password."),
    });

    useEffect(() => {
        if (onEmailChanged) onEmailChanged(form.values.email);
    }, [form.values.email, onEmailChanged]);

    return (
        <Stack gap={ 2 } textAlign="left">
            { error && (
                <Alert type="error">
                    { error.message(t) }
                </Alert>
            ) }
            <Field
                required name="email"
                label={ t => t("Email") } icon="email"
            >
                <Input
                    type="text"
                    placeholder={ t => t("you@email.com") }
                    { ...form.getFieldProps("email") }
                />
            </Field>
            <Box width="100%">
                <Field
                    required name="password"
                    label={ t => t("Password") } icon="password"
                >
                    <Input
                        type="password"
                        placeholder={ t => t("●●●●●●●●●") }
                        { ...form.getFieldProps("password") }
                    />
                </Field>
                { afterPassword }
            </Box>
            <Button
                working={ working } onClick={ form.onSubmit }
                width="100%" icon="login"
            >
                { t("Log in") }
            </Button>
        </Stack>
    );
};
