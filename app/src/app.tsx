/**
*   App main and routing table.
* 
*   Upper levels of the component tree are inlined in routes to maximize render reuse.
*   This is important because of fetched state providers, and also allows more graceful
*   loading states.
*/
import { createRoot } from "react-dom/client";

import { I18nProvider, StateEngineProvider } from "@/hooks";
import { Router } from "@/routing";
import { ThemeRoot } from "@/theme";

export const App = () => {
    return (
        <StateEngineProvider>
            <ThemeRoot>
                <I18nProvider>
                    <Router/>
                </I18nProvider>
            </ThemeRoot>
        </StateEngineProvider>
    );
};

const main = () => {
    const root = createRoot(document.getElementById("mount") as HTMLElement);
    root.render(<App/>);
};

main();
