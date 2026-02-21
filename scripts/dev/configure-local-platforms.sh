#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

# Setup.
if [[ -f .env.platforms ]]; then
    source .env.platforms
fi

echo '# Task "Workspace: Configure Local Ad Platform Connections" manages this file.' > .env.platforms

use_google=$(ask_y_n "Integrate Google (Ads and/or DV360)?")
if [[ $use_google == "true" ]]; then
    echo "Google - Client."
    echo "  - In the Google Cloud Console, enable both the 'Google Ads API' and the 'Display & Video 360 API'."
    echo "  - Go to 'APIs & Services' -> 'Credentials' -> 'Create Credentials' -> 'OAuth client ID'."
    echo "  - Under 'Authorized redirect URIs', add the following two URIs:"
    echo "    - http://localhost/api/v1/ad-platforms/google_ads/consent-flow/finalize"
    echo "    - http://localhost/api/v1/ad-platforms/google_dv360/consent-flow/finalize"
    echo "  - Go to 'APIs & Services' -> 'Credentials', click your Client ID, go to the 'Audience' tab, and add yourself as a test user."

    # Use a shared Client ID and Secret
    setup_env_var "GOOGLE_CLIENT_ID" .env.platforms
    setup_env_var "GOOGLE_CLIENT_SECRET" .env.platforms

    echo "Google Ads - Developer."
    echo "  - Follow the instructions at: https://developers.google.com/google-ads/api/docs/get-started/dev-token"
    setup_env_var "GOOGLE_ADS_DEV_TOKEN" .env.platforms

    use_mock_backend=$(ask_y_n "Use mock backend for DV360?")
    echo "GOOGLE_DV360_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

use_meta=$(ask_y_n "Integrate Meta?")
if [[ $use_meta == "true" ]]; then
    echo "Meta - App."
    echo "  - Go to: https://developers.facebook.com/apps"
    echo "  - Create or access a Developer account."
    echo "  - Create or get access to a Meta app with the following Use Cases:"
    echo "    - Ad Platform"
    echo "    - Login"
    echo "  - Add http://localhost/api/v1/ad-platforms/meta/consent-flow/finalize as an OAuth callback URL."
    echo "  - Add yourself as a test user."

    setup_env_var "META_APP_ID" .env.platforms
    setup_env_var "META_APP_SECRET" .env.platforms

    use_mock_backend=$(ask_y_n "Use mock backend?")
    echo "META_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

use_snapchat=$(ask_y_n "Integrate Snapchat?")
if [[ $use_snapchat == "true" ]]; then
    echo "Snapchat - App."
    echo "  - Go to: https://developers.snap.com/"
    echo "  - Create or access a Developer account."
    echo "  - Create or get access to a Snapchat app with:"
    echo "    - Login Kit"
    echo "  - Go to your App settings."
    echo "  - Add http://localhost/api/v1/ad-platforms/snapchat/consent-flow/finalize as an OAuth callback URL."
    echo "  - Create a Confidential OAuth 2.0 Client."
    echo "  - Add yourself as a demo user."

    setup_env_var "SNAPCHAT_CLIENT_ID" .env.platforms
    setup_env_var "SNAPCHAT_CLIENT_SECRET" .env.platforms

    use_mock_backend=$(ask_y_n "Use mock backend?")
    echo "SNAPCHAT_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

use_tiktok=$(ask_y_n "Integrate TikTok?")
if [[ $use_tiktok == "true" ]]; then
    echo "TikTok - App."

    use_mock_oauth=$(ask_y_n "Use mock OAuth flow? Avoids registering an app for local.")
    if [[ $use_mock_oauth == "true" ]]; then
        echo "TIKTOK_APP_ID=mock" >> .env.platforms
        echo "TIKTOK_APP_SECRET=dummyvalue" >> .env.platforms
    else
        echo "  - Go to: https://business-api.tiktok.com/"
        echo "  - Create or access a Developer account."
        echo "  - Create or get access to a TikTok app."

        setup_env_var "TIKTOK_APP_ID" .env.platforms
        setup_env_var "TIKTOK_APP_SECRET" .env.platforms
    fi

    use_mock_backend=$(ask_y_n "Use mock backend?")
    echo "TIKTOK_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

use_amazon=$(ask_y_n "Integrate Amazon DSP?")
if [[ $use_amazon == "true" ]]; then
    echo "Amazon DSP - App."

    use_mock_oauth=$(ask_y_n "Use mock OAuth flow? Avoids registering an app for local.")
    if [[ $use_mock_oauth == "true" ]]; then
        echo "AMAZON_CLIENT_ID=mock" >> .env.platforms
        echo "AMAZON_CLIENT_SECRET=dummyvalue" >> .env.platforms
    else
        echo "  - Go to: https://advertising.amazon.com/"
        echo "  - Sign in to your Amazon Ads account"
        echo "  - Navigate to: Account Settings > API > Request API Access"
        echo "  - Complete the Amazon Advertising API registration form"
        echo "  - Create a Security Profile (Login with Amazon):"
        echo "    - Go to: https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html"
        echo "    - Create a new Security Profile"
        echo "    - Under 'Web Settings', add:"
        echo "      - Allowed Return URLs: http://localhost/api/v1/ad-platforms/amazon/consent-flow/finalize"
        echo "  - Link the Security Profile to your Advertising API access"
        echo "  - Wait for Amazon to approve your API access (can take 1-2 business days)"
        echo "  - Note: You'll need DSP access enabled on your Amazon Advertising account."

        setup_env_var "AMAZON_CLIENT_ID" .env.platforms
        setup_env_var "AMAZON_CLIENT_SECRET" .env.platforms
    fi

    use_mock_backend=$(ask_y_n "Use mock backend?")
    echo "AMAZON_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

use_pinterest=$(ask_y_n "Integrate Pinterest?")
if [[ $use_pinterest == "true" ]]; then
    echo "Pinterest - App."

    use_mock_oauth=$(ask_y_n "Use mock OAuth flow? Avoids registering an app for local.")
    if [[ $use_mock_oauth == "true" ]]; then
        echo "PINTEREST_APP_ID=mock" >> .env.platforms
        echo "PINTEREST_APP_SECRET=dummyvalue" >> .env.platforms
    else
        echo "  - Go to: https://developers.pinterest.com/"
        echo "  - Register, create an app, and request trial access."
        echo "  - Add http://localhost/api/v1/ad-platforms/pinterest/consent-flow/finalize as an OAuth callback URL."
        echo "  - Generate an App secret."

        setup_env_var "PINTEREST_APP_ID" .env.platforms
        setup_env_var "PINTEREST_APP_SECRET" .env.platforms
    fi

    use_mock_backend=$(ask_y_n "Use mock backend?")
    echo "PINTEREST_USE_MOCK_BACKEND=$use_mock_backend" >> .env.platforms
fi

echo "Done. If your local deployment is running, restart it."
