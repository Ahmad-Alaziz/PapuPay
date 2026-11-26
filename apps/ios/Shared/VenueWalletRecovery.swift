import SwiftUI

struct VenueWalletRecovery: Identifiable {
  enum Source {
    case membership(String)
    case demonstration(Int)
    case invalid
  }

  let id = UUID()
  let venue: VenueGuestLink
  let source: Source

  init?(_ url: URL) {
    guard var parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
          parts.port == nil, parts.query == nil,
          parts.percentEncodedPath.range(of: #"^/v/[a-z0-9-]+/restore/?$"#, options: .regularExpression) != nil else { return nil }
    var path = parts.path.split(separator: "/")
    path.removeLast()
    let fragment = parts.percentEncodedFragment ?? ""
    parts.path = "/" + path.joined(separator: "/") + "/card"
    parts.fragment = nil
    guard let cardURL = parts.url, let (venue, _, _) = VenueGuestLink.parse(cardURL) else { return nil }
    self.venue = venue
    if fragment.range(of: #"^token=[A-Za-z0-9_-]{32}\.[1-9][0-9]{0,14}\.[A-Za-z0-9_-]{43}$"#, options: .regularExpression) != nil {
      source = .membership(String(fragment.dropFirst("token=".count)))
    } else if venue.slug == "sweeto", fragment.range(of: #"^demo=sweeto-testflight-v1\.[0-6]$"#, options: .regularExpression) != nil,
              let digit = fragment.last?.wholeNumberValue {
      source = .demonstration(digit)
    } else {
      source = .invalid
    }
  }
}

/// The card destination shows errors and account switches in place while Wallet links resolve.
struct VenueWalletRecoveryView: View {
  let link: VenueWalletRecovery
  let palette: VenueGuestPalette
  let onOpen: () -> Void

  private enum Phase { case loading, invalid, unavailable, switchCard(VenueGuestAPI.RecoveryPreview, from: String) }
  @State private var phase = Phase.loading
  @State private var attempt = 0
  @State private var approved: String?
  private var api: VenueGuestAPI { VenueGuestAPI(venue: link.venue) }
  private func t(_ pl: String, _ en: String, _ ru: String) -> String { palette.language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        switch phase {
        case .loading:
          ProgressView(t("Otwieramy kartę…", "Opening your card…", "Открываем карту…"))
        case .invalid:
          Text(t("Ten link jest nieaktualny", "This link has expired", "Эта ссылка больше не действует"))
            .font(palette.display(.title)).accessibilityAddTraits(.isHeader)
          Text(t("Otwórz najnowszą kartę w Wallet lub poproś o pomoc w lokalu.",
                 "Open your latest Wallet pass or ask the venue for help.",
                 "Откройте последнюю карту в Wallet или обратитесь в заведение."))
        case .unavailable:
          Text(t("Nie udało się połączyć.", "Couldn’t connect.", "Не удалось подключиться."))
          Button(t("Spróbuj ponownie", "Try again", "Повторить")) { approved = nil; attempt += 1 }
            .font(.headline).frame(minHeight: 44)
        case let .switchCard(target, current):
          Text(t("Otworzyć inną kartę?", "Switch cards?", "Открыть другую карту?"))
            .font(palette.display(.title)).accessibilityAddTraits(.isHeader)
          Text(t("Na tym urządzeniu masz inną kartę. Karta z Wallet ma numer \(target.code) i saldo \(target.stamps)/\(target.goal).",
                 "This device has a different card. The Wallet card is \(target.code) with \(target.stamps)/\(target.goal) stamps.",
                 "На устройстве другая карта. Карта из Wallet: \(target.code), отметок: \(target.stamps)/\(target.goal)."))
          VenueNativeButton(title: t("Otwórz kartę z Wallet", "Open Wallet card", "Открыть карту из Wallet"),
                            systemImage: "arrow.right", palette: palette) {
            approved = current; attempt += 1
          }
          Button(t("Zachowaj obecną kartę", "Keep current card", "Оставить текущую карту"), action: onOpen)
            .font(.headline).frame(minHeight: 44)
        }
      }
      .frame(maxWidth: 480, alignment: .leading).padding(24).frame(maxWidth: .infinity)
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
    .task(id: attempt) { await open() }
  }

  @MainActor private func open() async {
    guard case let .membership(token) = link.source else { phase = .invalid; return }
    phase = .loading
    do {
      async let preview = api.recoveryPreview(token)
      let current = try await api.card()
      let target = try await preview
      try Task.checkCancellation()
      guard target.goal > 0, (0...target.goal).contains(target.stamps),
            target.code.range(of: #"^[A-Z0-9]{8}$"#, options: .regularExpression) != nil else { phase = .unavailable; return }
      let demo = VenueGuestDemo.loyaltyConfiguration(for: link.venue)?.loyaltyCard(for: link.venue)
      if let code = current?.code ?? demo?.code, code != target.code, code != approved {
        phase = .switchCard(target, from: code)
        return
      }
      if current?.code != target.code {
        _ = try await api.restoreCard(token, expectedCode: target.code, replacing: current?.code)
      }
      try Task.checkCancellation()
      VenueGuestDemo.preferRecoveredMembership(for: link.venue)
      onOpen()
    } catch VenueGuestAPI.RecoveryFailure.membershipChanged {
      if !Task.isCancelled { approved = nil; attempt += 1 }
    } catch VenueGuestAPI.RecoveryFailure.invalid {
      if !Task.isCancelled { phase = .invalid }
    } catch {
      if !Task.isCancelled { phase = .unavailable }
    }
  }
}
