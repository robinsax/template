/**
*   Config including dynamic detection.
*/
const apiRootUrl = (
    typeof window == "undefined" ? "" : window.location.origin + "/api/v1"
);

const devMode = (
    typeof window == "undefined" || window.location.hostname == "localhost"
);

// TEMPLATE: Replace these values.
// t("Project Template");
const appName = "Template";
const ownerName = "Project Template Authors";
const ownerWebsite = "https://project-template.com";
const ownerSupportEmail = "support@project-template.com";
const copyright = "© 2026 Project Authors";

export default {
    apiRootUrl, ownerName, ownerWebsite, devMode, ownerSupportEmail,
    appName, copyright
};
