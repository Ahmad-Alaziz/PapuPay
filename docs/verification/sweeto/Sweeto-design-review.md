# Sweeto App Clip design review

[Watch the 18-second simulator recording](Sweeto-App-Clip.mp4) · [Compare the original and refined home](Sweeto-home-comparison.png)

Two independent reviewers assessed the running App Clip on an iPhone 17e simulator. They reviewed stills, accessibility layouts, real-time recordings and individual frames. The scores below are their design judgments. They apply to the App Clip.

| Category | Reviewer A | Reviewer B |
|---|---:|---:|
| Spacing and rhythm | 9.6 | 9.6 |
| Corners and shape | 9.6 | 9.6 |
| Hierarchy and typography | 9.6 | 9.6 |
| Photography and brand authenticity | 9.6 | 9.5 |
| Originality | 9.5 | 9.5 |
| Task clarity | 9.6 | 9.7 |
| Accessibility and adaptability | 9.5 | 9.6 |
| Animation craft | 9.6 | 9.5 |
| Microinteractions | 9.5 | 9.6 |
| Transitions | 9.6 | 9.5 |
| Fun | 9.5 | 9.5 |
| Wow factor | 9.5 | 9.5 |

## Decisions made on the phone

- **Poster edge.** The upper edge stays flush with the screen. A 22-point radius at the two lower corners leads into the cream surface. The approved Matylda photograph keeps its proportions and the takeaway box remains fully recognizable.
- **Home actions.** Rows grow to 64 points where the screen allows. A shallow bottom edge compresses on press. Sweeto’s identity sits at the top. The location and PapuPay signature use the available space at the bottom and scroll with the page when text is enlarged.
- **Counter list.** Add portions directly from the menu or open a single larger photograph. The plus stays in place for repeated taps. Guests can show staff the quantities and Polish dessert names, with English or Russian underneath. The list stays on this device for two hours after its last edit. Staff handle availability, ordering and payment at the counter.
- **Return receipt.** The guest’s card compares a newly confirmed balance with the previous observation for that membership and venue. The first balance, a repeated balance or a redemption produces no earned-stamp celebration. A new visit gives the next slot its impression while the QR stays available.
- **Brand entrance.** A Rive papaya turns, reveals its seeds and settles into the footer while the menu is already usable. Direct counter and menu invocations go to their destination. Reduce Motion shows a still mark.

## What the Mobbin references contributed

| Observed iOS flow | Decision for Sweeto |
|---|---|
| Swiggy places explicit selection controls beside recognizable food photos. | Separate the photograph target and quantity buttons. All four desserts fit one catalog. [Browse menu](https://mobbin.com/flows/50263351-3f1e-41e9-82e4-ac2c0b4d5878?tab=screens&utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) |
| Shake Shack lets guests review and correct quantities. | Make the bilingual counter ticket editable. Explain directly on the ticket that ordering and payment happen with staff. [Editing an order](https://mobbin.com/flows/63cc67a1-8a32-4819-8060-defde899b2b2?tab=screens&utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) |
| Chipotle gives the cashier a high-contrast code with an explicit checkout instruction. sweetgreen puts progress alongside its scan surface. | Keep the QR available and stationary. Put stamp feedback in its own area. [Chipotle](https://mobbin.com/screens/0650c1c5-2f32-43f2-8173-37398dd10e57?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) · [sweetgreen](https://mobbin.com/screens/7b45b148-b448-4371-8b72-cc43c362a54a?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) |
| Starbucks moves from its card to Apple’s pass preview and then shows feedback in the app. | Let Apple present Add/Cancel. Confirm the actual pass is present before celebrating a new save. [Adding to Apple Wallet](https://mobbin.com/flows/e450d7d6-2d4d-4f0d-9a76-555104d06ead?tab=screens&utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) |
| Chick-fil-A gives a completed collectible its own visual state and keeps claiming the reward explicit. | Save the strongest moment for the sixth stamp. The reward band changes as the ink lands. [Reward completion](https://mobbin.com/screens/9cc5b5bb-9f13-4421-bc8e-90fb0e9f1bb3?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) |

The Mobbin screens informed layout and flow. Animation timing was judged from recordings of Sweeto itself.

## Apple Wallet and App Clip behavior

Apple recommends showing the relevant content immediately when an App Clip opens. The native system launch surface shows the PapuPay fruit and wordmark on cream before SwiftUI draws. Browser home links also display the brand before JavaScript mounts. The branded motion runs in the usable home screen. [Apple’s App Clip design guidance](https://developer.apple.com/design/human-interface-guidelines/app-clips)

With a signed pass available, Apple presents its native confirmation. On dismissal, the App Clip checks membership of that exact pass. A newly saved pass triggers the Clip’s success feedback. Canceling or reopening an already saved pass stays quiet. [Apple’s pass membership check](https://developer.apple.com/documentation/passkit/pkpasslibrary/containspass(_:))

Wallet controls the screen when the guest scans their saved pass. The venue records the stamp, then a configured Wallet update service can deliver a new signed balance with a localized change message. Device settings govern Wallet notifications. The guest can see PapuPay’s animation on their next card visit or when their balance changes while their card is open. [Apple’s Wallet update protocol](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes)

## What changed during review

The first counter design moved the plus button after a guest added one portion. The final version leaves it under the same fingertip. At maximum Russian accessibility text size, the first ticket placed its instructions above every dessert. The revised ticket puts quantities and Polish names first. Frame review also caught a stamp flashing in its finished state before the ink landed. The final recording shows a visible guide, one impression and a steady checkout QR, including at the sixth-stamp reward.

On the web, a desktop card originally shifted its QR vertically by 14.5 pixels when the receipt appeared. Replacing the status line in place keeps the code at the same coordinates on the tested phone and desktop viewports.

## Verification boundary

The simulator recordings used isolated test balances and the real guest card UI. The normal application and App Clip builds compile the same guest surfaces. Physical Apple Wallet installation, device haptics and production push delivery were not exercised. The browser hands its signed pass to Wallet and cannot verify installation.


## Browser review

Two independent reviewers assessed the phone, tablet, and desktop layouts and the actual interactive guest flows. Both scored every category at least 9.5. Testing covered keyboard focus, Russian text at 200%, cold and live stamp updates, a slow Rive load, reduced motion and scanning the guest QR.

| Category | Reviewer A | Reviewer B |
|---|---:|---:|
| Spacing and rhythm | 9.6 | 9.6 |
| Corners and shape | 9.6 | 9.6 |
| Hierarchy and typography | 9.6 | 9.6 |
| Photography and brand authenticity | 9.6 | 9.5 |
| Originality | 9.5 | 9.5 |
| Task clarity | 9.6 | 9.7 |
| Accessibility and adaptability | 9.5 | 9.6 |
| Animation craft | 9.6 | 9.5 |
| Microinteractions | 9.5 | 9.6 |
| Transitions | 9.5 | 9.5 |
| Fun | 9.5 | 9.5 |
| Wow factor | 9.5 | 9.5 |

Frame-by-frame review led to a shorter lift for the fruit on compact phones and a taller drawing area for the incoming stamp. Keyboard review led to a two-step Escape behavior. The first Escape cancels clearing the list and returns focus to the Clear control. The second closes the ticket and returns focus to the guest’s list button.
