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
const platformOwnerName = "REPLACEME";
const platformOwnerWebsite = "REPLACEME";

const supportEmail = "REPLACEME";

export default {
    apiRootUrl, platformOwnerName, platformOwnerWebsite, devMode, supportEmail
};
