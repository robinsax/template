/**
*   User related forms.
*/
import React, { useCallback, useMemo, useEffect } from "react";
import {
    Checkbox, FormControl, FormLabel, HStack, Input, Text, useToast
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import config from "@/config";
import { mergeCallbacks } from "@/util";
import { UserInviteParams, UserModel, UserType, UserUpdateParams } from "@/models";
import {
    LoginCredentials, I18nValueFn, I18nFn, useAuthControl, useAPI, useI18n,
    useCurrentUser, useCurrentUserOrNull, useSupportedLocales,
    useLocale
} from "@/hooks";
import {
    AccountEditorLayout, Icon, AvatarUpload, FormLayout, ModalButton, useFormSystem
} from "@/components/common";

import { UserPersona } from "./personas";

// Validation errors corresponding to API.
const passwordValidationErrors: Record<string, I18nValueFn> = {
    password_too_short: t => t("Password must be at least 10 characters long."),
    password_no_uppercase: t => (
        t("Password must contain at least one uppercase letter.")
    ),
    password_no_lowercase: t => (
        t("Password must contain at least one lowercase letter.")
    ),
    password_no_digit: t => t("Password must contain at least one digit."),
    password_no_special: t => t("Password must contain at least one special character."),
};

const nameValidationErrors: Record<string, I18nValueFn> = {
    invalid_name: t => t("Name is invalid."),
    name_too_long: t => t("Name is too long.")
};

const emailValidationErrors: Record<string, I18nValueFn> = {
    invalid_email: t => t("Email is invalid."),
    email_too_long: t => t("Email is too long.")
};

// Fields.
const UserTypeSelect = ({ value, setValue }: {
    value: UserType | null,
    setValue: (value: UserType) => void
}) => {
    const t = useI18n();

    return (
        <HStack width="full" justifyContent="right">
            <Text fontSize="sm">
                { t("This person is with {owner}.", {
                    owner: t(config.platformOwnerName)
                }) }
            </Text>
            <Checkbox
                isChecked={ value == "platform_owner" }
                onChange={ e => (
                    setValue(e.target.checked ? "platform_owner" : "client")
                ) }
            />
        </HStack>
    );
};

const UserAvatarField = ({ for: forProp, setValue }: {
    for: UserModel | null,
    setValue: (value: string | null) => void
}) => {
    return (
        <AvatarUpload
            for={ forProp }
            size="2xl"
            onUpload={ upload => setValue(upload.id) }
            PersonaComponent={ UserPersona }
            permission={ null }
        />
    );
};

// Form hooks.
const useLocaleSelectSpec = () => {
    const [locale] = useLocale();
    const locales = useSupportedLocales();

    return useMemo(() => {
        return {
            label: (t: I18nFn) => t("Language"),
            placeholder: (t: I18nFn) => t("Select language"),
            type: "select",
            optional: true,
            default: locale,
            options: locales.map(locale => ({
                value: locale.key,
                label: (t: I18nFn) => t(locale.label)
            }))
        } as const;
    }, [locales]);
};
/**
*   Internal helper to generate user invite form.
*/
const useUserInviteForm = (onInvited: (user: UserModel) => void) => {
    const api = useAPI();
    const currentUser = useCurrentUser();

    const localeSelectSpec = useLocaleSelectSpec();

    const onSubmit = useCallback(async (values: UserInviteParams) => {
        const params = {
            ...values,
            type: values.type || "client"
        };
        const user = await api.users.post(params);

        onInvited(user);
    }, [onInvited]);

    return useFormSystem<UserInviteParams>({
        fields: {
            name: {
                label: t => t("Full Name")
            },
            email: {
                label: t => t("Email"),
                type: "text"
            },
            locale: localeSelectSpec,
            type: currentUser.type == "platform_owner" ? {
                default: "client",
                Component: UserTypeSelect
            } : null
        },
        errors: {
            ...nameValidationErrors,
            ...emailValidationErrors,
            already_exists: t => t("A user with this email already exists.")
        },
        onSubmit
    });
};

/**
*   Return the login form system.
*/
export const useLoginForm = () => {
    const authControl = useAuthControl();

    const onSubmit = useCallback(async (values: LoginCredentials) => {
        await authControl.login(values);
    }, []);

    return useFormSystem<LoginCredentials>({
        fields: {
            email: {
                label: t => t("Email")
            },
            password: {
                label: t => t("Password"),
                type: "password"
            }
        },
        errors: {
            invalid_credentials: t => t("Incorrect email address or password."),
            inactive_user: t => t("Your account has been deactivated.")
        },
        onSubmit
    });
};

/**
*   Internal helper to generate user metadata form.
*/
const useUserEditForm = (user: UserModel, onDone: () => void) => {
    const api = useAPI();
    const currentUser = useCurrentUser();

    const authControl = useAuthControl();

    const localeSelectSpec = useLocaleSelectSpec();

    const onSubmit = useCallback(async (values: UserUpdateParams) => {
        await api.users.id(user.id).put(values);

        if (user.id == currentUser.id) authControl.invalidateUser();
        onDone();
    }, []);

    return useFormSystem<UserUpdateParams>({
        fields: {
            name: {
                label: t => t("Full Name")
            },
            locale: localeSelectSpec,
            avatar_id: {
                optional: true,
                Component: p => <UserAvatarField for={ user } {...p}/>
            }
        },
        errors: {
            ...nameValidationErrors
        },
        onSubmit
    });
};

export const useJoinForm = () => {
    const api = useAPI();
    const authControl = useAuthControl();
    const navigate = useNavigate();

    const inviteToken = useMemo(() => (
        decodeURIComponent(window.location.search.split("invite=")[1])
    ), []);

    useEffect(() => {
        if (!inviteToken) navigate("/login");
    }, [inviteToken]);

    const onSubmit = useCallback(async ({ password }: { password: string }) => {
        const user = await api.invites.post({
            invite_token: inviteToken,
            password
        });

        await authControl.login({ email: user.email, password });
    }, []);

    return useFormSystem<{ password: string }>({
        fields: {
            password: {
                label: t => t("Password"),
                type: "password"
            }
        },
        errors: {
            invalid_invite: t => t("This link has expired."),
            ...passwordValidationErrors
        },
        onSubmit
    });
};

/**
*   Return the password reset form system. Either the user must be currently
*   authenticated, or a reset token and user ID must be provided.
*/
export const usePasswordChangeForm = (
    onDone: () => void,
    resetToken: string | null = null,
    userId: string | null = null
) => {
    const t = useI18n();
    const api = useAPI();

    const user = useCurrentUserOrNull();

    return useFormSystem<{ current?: string, updated: string, confirm?: string }>({
        fields: {
            current: {
                label: t => t("Current Password"),
                type: "password",
                optional: !user
            },
            updated: {
                label: t => t("New Password"),
                type: "password"
            },
            confirm: {
                label: t => t("Confirm New Password"),
                type: "password",
                optional: !user
            }
        },
        errors: {
            invalid_reset: t => t("This reset link has expired."),
            invalid_password: t => t("Your current password is incorrect."),
            ...passwordValidationErrors
        },
        onSubmit: async ({ current, updated, confirm }, setError) => {
            const eitherUserId = userId || (user ? user.id : null);
            if (!eitherUserId) return;

            if (user && updated != confirm) {
                setError(t("Passwords do not match"));
                return;
            }

            let eitherResetToken = resetToken;
            if (!eitherResetToken && current) {
                // User is currently authenticated, generate a token to reset
                // with.
                const tokenResp = await api.auth.post({
                    email: null,
                    password: current,
                    restriction: "password_reset"
                });
                eitherResetToken = tokenResp.token;
            }
    
            await api.users.id(eitherUserId).password.put({
                password: updated,
                reset_token: eitherResetToken as string
            });

            onDone();
        }
    });
};

export const usePasswordResetForm = (onDone: () => void) => {
    const api = useAPI();

    return useFormSystem<{ email: string }>({
        fields: {
            email: {
                label: t => t("Email")
            }
        },
        onSubmit: async ({ email }) => {
            await api.auth.passwordResets.post({ email });

            onDone();
        }
    });
};

// Form components.
/**
*   User invite form UI.
*/
export const UserInviteForm = ({ onInvited }: {
    onInvited: (user: UserModel) => void
}) => {
    const {
        FormProvider, FormFields, FormError, FormSubmit
    } = useUserInviteForm(onInvited);

    return (
        <FormProvider invalidateOnSubmit={ ["users"] }>
            <FormLayout>
                <FormError/>
                <FormFields names={ ["name", "email", "locale", "type"] }/>
                <FormSubmit label={ t => t("Invite") }/>
            </FormLayout>
        </FormProvider>
    );
};

/**
*   User metadata form UI.
*/
export const UserEditForm = ({ user, onDone }: {
    user: UserModel,
    onDone: () => void
}) => {
    const currentUser = useCurrentUser();

    const {
        FormProvider, FormFields, FormError, FormSubmit
    } = useUserEditForm(user, onDone);

    return (
        <FormProvider
            target={ user }
            invalidateOnSubmit={ ["users", "clients"] }
        >
            <AccountEditorLayout
                FormSubmit={ FormSubmit }
                FormError={ FormError }
                AvatarField={ () => <FormFields names={ ["avatar_id"] }/> }
            >
                <FormFields names={ ["name", "locale"] }/>
                { currentUser.id == user.id && (
                    <PsuedoPasswordField/>
                ) }
            </AccountEditorLayout>
        </FormProvider>
    );
};

/**
*   Password change form for currently authenticated users. 
*/
export const PasswordChangeForm = ({ onDone, resetToken, userId }: {
    onDone: () => void,
    resetToken?: string,
    userId?: string
}) => {
    const {
        FormProvider, FormFields, FormError, FormSubmit
    } = usePasswordChangeForm(onDone, resetToken, userId);

    return (
        <FormProvider>
            <FormLayout>
                <FormError/>
                <FormFields names={ ["current", "updated", "confirm"] }/>
                <FormSubmit label={ t => t("Change Password") }/>
            </FormLayout>
        </FormProvider>
    );
};

export const PsuedoPasswordField = () => {
    const t = useI18n();

    const toast = useToast();

    const onComplete = useCallback(() => {
        toast({
            title: t("Password updated."),
            status: "info"
        });
    }, []);

    return (
        <FormControl isRequired={ true }>
            <FormLabel>
                { t("Password") }
            </FormLabel>
            <HStack width="full">
                <Input
                    value="•••••••••••"
                    width="calc(100% - 6rem)"
                    readOnly
                />
                <ModalButton
                    iconName="switch"
                    width="6rem"
                    leftIcon={ <Icon name="switch"/> }
                    label={ t => t("Change") }
                >
                    { onClose =>
                        <PasswordChangeForm
                            onDone={ mergeCallbacks(onClose, onComplete) }
                        />
                    }
                </ModalButton>
            </HStack>
        </FormControl>
    );
};