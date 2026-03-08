import { ReactNode, createContext, useContext, useMemo } from "react";

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
