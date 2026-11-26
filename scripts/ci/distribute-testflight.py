"""Publish a processed PapuPay build to its existing internal TestFlight group."""
import argparse
import os
import re
import time
from pathlib import Path

import jwt
import requests

API = "https://api.appstoreconnect.apple.com/v1"
APP = "6826778125"
GROUP = "PapuPay Demo"
BASE_URL = "https://papupay.com/go/sweeto/"
TITLES = {"table": "Sweeto · Start", "menu": "Sweeto · Menu", "counter": "Sweeto · Karta"}


class AppleError(Exception):
    def __init__(self, status, detail):
        self.status = status
        super().__init__(f"App Store Connect returned {status}: {detail}")


def request(method, path, params=None, data=None):
    now = int(time.time())
    token = jwt.encode(
        {"iss": os.environ["APP_STORE_CONNECT_ISSUER_ID"], "iat": now,
         "exp": now + 600, "aud": "appstoreconnect-v1"},
        os.environ["APP_STORE_CONNECT_PRIVATE_KEY"], algorithm="ES256",
        headers={"kid": os.environ["APP_STORE_CONNECT_KEY_IDENTIFIER"], "typ": "JWT"},
    )
    response = requests.request(method, API + path, params=params, json=data,
                                headers={"Authorization": "Bearer " + token},
                                timeout=30, allow_redirects=False)
    if not 200 <= response.status_code < 300:
        try:
            detail = "; ".join(f"{err['code']}: {err['detail']}" for err in response.json()["errors"])
        except (KeyError, ValueError):
            detail = response.reason
        raise AppleError(response.status_code, detail)
    return response.json() if response.content else {}


def build_record(number, include):
    params = {"filter[app]": APP, "filter[version]": number,
              "filter[preReleaseVersion.platform]": "IOS", "filter[preReleaseVersion.version]": "1.0",
              "include": include}
    result = request("GET", "/builds", params)
    if len(result["data"]) > 1:
        raise ValueError(f"Ambiguous iOS 1.0 ({number}) build")
    return result


def clip_bundle(record):
    return next((item["id"] for item in record.get("included", [])
                 if item["type"] == "buildBundles" and
                 item["attributes"]["bundleType"] == "APP_CLIP" and
                 item["attributes"]["bundleId"] == "com.papupay.app.Clip"), None)


def invocation_rows(bundle):
    result = request("GET", f"/buildBundles/{bundle}/betaAppClipInvocations",
                     {"include": "betaAppClipInvocationLocalizations", "limit": 100})
    localizations = {row["id"]: row["attributes"] for row in result.get("included", [])
                     if row["type"] == "betaAppClipInvocationLocalizations"}
    rows = {}
    for invocation in result["data"]:
        url = invocation["attributes"]["url"]
        if url in rows:
            raise ValueError(f"Duplicate App Clip invocation for {url}")
        local = {}
        for ref in invocation["relationships"]["betaAppClipInvocationLocalizations"]["data"]:
            attrs = localizations[ref["id"]]
            local[attrs["locale"]] = (ref["id"], attrs["title"])
        rows[url] = (invocation["id"], local)
    return rows


def expected_invocations(primary_locale):
    # Build 15.1 is the known Sweeto release with the table, menu and card invocations.
    reference = clip_bundle(build_record("15.1", "buildBundles"))
    previous = invocation_rows(reference) if reference else {}
    expected = {}
    for route, fallback in TITLES.items():
        url = BASE_URL + route
        _, localizations = previous.get(url, (None, {}))
        expected[url] = {locale: title for locale, (_, title) in localizations.items()} or {primary_locale: fallback}
    return expected


def ensure_invocations(bundle, expected):
    existing = invocation_rows(bundle)
    loc_type = "betaAppClipInvocationLocalizations"
    for url, titles in expected.items():
        if url not in existing:
            local = [{"type": loc_type, "id": "${loc" + str(i) + "}",
                      "attributes": {"locale": locale, "title": title}}
                     for i, (locale, title) in enumerate(titles.items())]
            relationships = {"buildBundle": {"data": {"type": "buildBundles", "id": bundle}},
                             loc_type: {"data": [{"type": loc_type, "id": row["id"]} for row in local]}}
            request("POST", "/betaAppClipInvocations", data={
                "data": {"type": "betaAppClipInvocations", "attributes": {"url": url},
                         "relationships": relationships}, "included": local,
            })
            continue
        invocation_id, localized = existing[url]
        for locale, title in titles.items():
            if locale in localized:
                loc_id, current = localized[locale]
                if current != title:
                    request("PATCH", f"/{loc_type}/{loc_id}", data={
                        "data": {"type": loc_type, "id": loc_id, "attributes": {"title": title}}})
            else:
                request("POST", "/" + loc_type, data={"data": {
                    "type": loc_type, "attributes": {"locale": locale, "title": title},
                    "relationships": {"betaAppClipInvocation": {"data": {
                        "type": "betaAppClipInvocations", "id": invocation_id}}}}})
    actual = invocation_rows(bundle)
    return all(actual.get(url, (None, {}))[1].get(locale, (None, None))[1] == title
               for url, titles in expected.items() for locale, title in titles.items())


def internal_group():
    result = request("GET", f"/apps/{APP}/betaGroups", {"limit": 200})
    matches = [row["id"] for row in result["data"] if row["attributes"]["name"] == GROUP
               and row["attributes"]["isInternalGroup"] is True]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one existing {GROUP} internal group")
    return matches[0]


def distribute(number, deadline):
    expected = None
    group = None
    last_status = ""
    while time.monotonic() < deadline:
        try:
            record = build_record(number, "buildBetaDetail,buildBundles")
            status = "waiting for the uploaded build"
            if record["data"]:
                build = record["data"][0]
                build_id = build["id"]
                state = build["attributes"]["processingState"]
                if state in {"FAILED", "INVALID"} or build["attributes"].get("expired"):
                    raise ValueError(f"Build {number} cannot be distributed: {state}, expired={build['attributes'].get('expired')}")
                detail = next((row["attributes"]["internalBuildState"] for row in record.get("included", [])
                               if row["type"] == "buildBetaDetails"), None)
                if detail in {"EXPIRED", "PROCESSING_EXCEPTION", "MISSING_EXPORT_COMPLIANCE"}:
                    raise ValueError(f"Build {number} requires attention in App Store Connect: {detail}")
                status = f"processing={state}, internal={detail}"
                bundle = clip_bundle(record)
                if state == "VALID" and bundle and detail in {"READY_FOR_BETA_TESTING", "IN_BETA_TESTING"}:
                    if group is None:
                        group = internal_group()
                    if expected is None:
                        app = request("GET", f"/apps/{APP}", {"fields[apps]": "bundleId,primaryLocale"})
                        if app["data"]["attributes"]["bundleId"] != "com.papupay.app":
                            raise ValueError("Unexpected PapuPay app bundle ID")
                        expected = expected_invocations(app["data"]["attributes"]["primaryLocale"])
                    if ensure_invocations(bundle, expected):
                        assigned = request("GET", "/builds", {"filter[app]": APP,
                                           "filter[betaGroups]": group, "filter[id]": build_id})
                        if not assigned["data"]:
                            request("POST", f"/betaGroups/{group}/relationships/builds",
                                    data={"data": [{"type": "builds", "id": build_id}]})
                        elif detail == "IN_BETA_TESTING":
                            return build_id, expected
                    status += "; verifying Clip invocations and group access"
        except (requests.Timeout, requests.ConnectionError):
            status = "retrying after a connection interruption"
        except AppleError as err:
            # Re-read Apple's state after propagation delays and concurrent updates.
            if err.status not in {409, 429, 500, 502, 503, 504}:
                raise
            status = str(err)
        if status != last_status:
            print(status, flush=True)
            last_status = status
        time.sleep(20)
    raise TimeoutError(f"Timed out waiting for App Store Connect: {last_status}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("build_number")
    args = parser.parse_args()
    if not re.fullmatch(r"[1-9]\d*\.[1-9]\d*", args.build_number):
        parser.error("expected a workflow build number, such as 16.1")
    build_id, expected = distribute(args.build_number, time.monotonic() + 30 * 60)
    link = f"https://appstoreconnect.apple.com/apps/{APP}/testflight/ios/{build_id}"
    summary = (f"## PapuPay 1.0 ({args.build_number}) is testing\n\n"
               f"The **{GROUP}** internal group has access. Apple reports `IN_BETA_TESTING`. "
               f"[Open this build]({link})\n\n")
    for url, titles in expected.items():
        summary += f"- {', '.join(titles.values())} · {url}\n"
    print(summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as output:
            output.write(summary)


if __name__ == "__main__":
    main()
