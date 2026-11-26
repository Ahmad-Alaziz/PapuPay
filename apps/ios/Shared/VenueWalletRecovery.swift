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

struct VenueWalletRecoveryView: View {
  let link: VenueWalletRecovery
  let palette: VenueGuestPalette
  let onRestore: () -> Void
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var preview: VenueGuestAPI.RecoveryPreview?
  @State private var unavailable = false
  @State private var invalid = false
  @State private var confirming = false
  @State private var attempt = 0
  @State private var confirmation: Task<Void, Never>?

  private var api: VenueGuestAPI { VenueGuestAPI(venue: link.venue) }
  private var isDemo: Bool {
    if case .demonstration = link.source { return true }
    return false
  }
  private var demo: VenueGuestDemo? { VenueGuestDemo.loyaltyConfiguration(for: link.venue) }
  private func t(_ pl: String, _ en: String, _ ru: String) -> String { palette.language.text(pl, en, ru) }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          Image(systemName: "wallet.pass.fill")
            .font(.system(size: 32)).foregroundStyle(palette.ink).accessibilityHidden(true)
          Text(isDemo ? t("Karta demo Sweeto", "Sweeto demo card", "Демо-карта Sweeto")
               : t("Twoja karta z Wallet", "Your card from Wallet", "Ваша карта из Wallet"))
            .font(palette.display(.largeTitle)).accessibilityAddTraits(.isHeader)
          if invalid {
            Text(t("Ten link jest nieaktualny. Otwórz najnowszą kartę w Wallet lub poproś o pomoc w lokalu.",
                   "This link is no longer valid. Open your latest pass in Wallet or ask the venue for help.",
                   "Ссылка недействительна. Откройте последнюю карту в Wallet или обратитесь в заведение."))
          } else if let preview {
            Text(isDemo
                 ? t("Saldo zapisane w testowej karcie Wallet.", "The balance saved on your TestFlight pass.", "Баланс, сохранённый на тестовой карте Wallet.")
                 : t("Otwórz tę kartę na tym urządzeniu, aby wrócić do swoich pieczątek.", "Open this card on this device to get back to your stamps.", "Откройте карту на этом устройстве, чтобы вернуться к своим отметкам."))
            VStack(alignment: .leading, spacing: 10) {
              if let name = preview.name {
                Text(name).font(.headline)
              }
              Text(t("Pieczątki", "Stamps", "Отметки")).font(.subheadline.weight(.medium))
              Text("\(preview.stamps) / \(preview.goal)").font(palette.display(.largeTitle)).monospacedDigit()
              Text(t("Numer karty", "Card number", "Номер карты") + "  " + preview.code).font(.callout)
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding(20)
            .foregroundStyle(palette.paper)
            .background(palette.ink, in: RoundedRectangle(cornerRadius: 18))
            if !isDemo, let existing = api.cachedCard(), existing.code != preview.code {
              Text(t("Otwarcie tej karty przełączy kartę używaną na tym urządzeniu.", "Opening this card switches the card used on this device.", "На этом устройстве будет открыта другая карта."))
            } else if isDemo, let demo, let existing = demo.loyaltyCard(for: link.venue), existing.stamps != preview.stamps {
              Text(t("Otworzymy aktualną kartę zapisaną na tym urządzeniu.", "We’ll open the current demo card saved on this device.", "Мы откроем текущую демо-карту, сохранённую на устройстве."))
            }
            if !isDemo || demo != nil {
              VenueNativeButton(title: t("Otwórz moją kartę", "Open my card", "Открыть мою карту"),
                                systemImage: "arrow.right", palette: palette) {
                guard confirmation == nil else { return }
                confirmation = Task { await confirm() }
              }
              .disabled(confirming)
            }
          } else if !unavailable {
            ProgressView(t("Sprawdzamy kartę…", "Checking your card…", "Проверяем карту…"))
          }
          if unavailable {
            Text(t("Nie udało się połączyć. Spróbuj ponownie.", "Couldn’t connect. Please try again.", "Не удалось подключиться. Попробуйте ещё раз."))
            if preview == nil {
              Button(t("Spróbuj ponownie", "Try again", "Повторить")) { attempt += 1 }
                .font(.headline).frame(minHeight: 44)
            }
          }
        }
        .frame(maxWidth: 480, alignment: .leading).padding(24).frame(maxWidth: .infinity)
      }
      .foregroundStyle(palette.ink)
      .background(palette.paper.ignoresSafeArea())
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(t("Zamknij", "Close", "Закрыть")) { dismiss() }
        }
      }
    }
    .environment(\.colorScheme, .light)
    .presentationDetents(typeSize >= .xxLarge ? [.large] : [.height(500), .large])
    .presentationDragIndicator(.visible)
    .task(id: attempt) {
      unavailable = false
      switch link.source {
      case .invalid: invalid = true
      case let .demonstration(count):
        preview = .init(code: "DEMO2026", stamps: count, goal: VenueDemoLoyalty.goal)
      case let .membership(token):
        do { let result = try await api.recoveryPreview(token); if !Task.isCancelled { preview = result } }
        catch VenueGuestAPI.RecoveryFailure.invalid { if !Task.isCancelled { invalid = true } }
        catch { if !Task.isCancelled { unavailable = true } }
      }
    }
    .onDisappear { confirmation?.cancel() }
  }

  @MainActor private func confirm() async {
    confirming = true
    unavailable = false
    defer { confirming = false; confirmation = nil }
    switch link.source {
    case .invalid: return
    case let .demonstration(count):
      guard let demo else { return }
      let namespace = demo.loyaltyNamespace(for: link.venue)
      var ledger = VenueDemoLoyalty.load(namespace: namespace)
      ledger.restoreSavedPass(stamps: count)
      ledger.save(namespace: namespace)
    case let .membership(token):
      do { _ = try await api.restoreCard(token) }
      catch VenueGuestAPI.RecoveryFailure.invalid { invalid = true; preview = nil; return }
      catch { if !Task.isCancelled { unavailable = true }; return }
      VenueGuestDemo.preferRecoveredMembership(for: link.venue)
    }
    guard !Task.isCancelled else { return }
    onRestore()
  }
}
