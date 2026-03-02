/**
*   Config including dynamic detection.
*/
const apiRootUrl = (
    typeof window == "undefined" ? "" : window.location.origin + "/api/v1"
);

const devMode = (
    typeof window == "undefined" || window.location.hostname == "localhost"
);

// t("REPLACEME");
const appName = "REPLACEME";
const ownerName = "REPLACEME";
const ownerWebsite = "REPLACEME";
const ownerSupportEmail = "REPLACEME";

export default {
    apiRootUrl, ownerName, ownerWebsite, devMode, ownerSupportEmail,
    appName
};
