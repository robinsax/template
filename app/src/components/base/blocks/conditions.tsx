import { ReactNode, createContext, useContext, useMemo } from "react";

import { Permission, RealmModel } from "@/model";
import { useAuthzCheck } from "@/hooks";

import { BlockProps, useBlockProps } from "./base";

const enableStateContext = createContext<string[]>([]);

/**
*   Enable a state below the mount point. Inherits enabled states from above.
*
*   See {@link useEnableStateCheck}.
*/
export const EnableState = ({ children, enable }: {
    children: ReactNode,
    enable: string[]
}) => {
    const parent = useContext(enableStateContext);

    return (
        <enableStateContext.Provider value={ [...parent, ...enable] }>
            { children }
        </enableStateContext.Provider>
    );
};

export const useEnableState = (state: string | null) => {
    const states = useContext(enableStateContext);

    return useMemo(() => {
        return state ? states.includes(state) : true;
    }, [states, state]);
};

export type ConditionalBlockProps<T = HTMLDivElement> = BlockProps<T> & {
    enableState?: string,
    permission?: Permission | Permission[],
    realm?: RealmModel | null,
    showDisabled?: boolean
};

export const useConditionalProps = <E, T extends ConditionalBlockProps<E>>(props: T) => {
    const { enableState, permission, realm, showDisabled, ...rest } = props;
    
    const isEnabled = useEnableState(enableState || null);
    const isAllowed = useAuthzCheck(realm || null, permission || null);

    const enabled = isEnabled && isAllowed;
    const visible = enabled || showDisabled;

    return [visible, enabled, rest] as const;
};

export const DynamicBox = ({ children, ...props }: ConditionalBlockProps & {
    children: ReactNode
}) => {
    const [visible, _, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest);
    
    return visible && (
        <div { ...rawProps }>
            { children }
        </div>
    );
};
