import CoreImage.CIFilterBuiltins
import NetworkExtension
import PassKit
import PDFKit
import SwiftUI
import UIKit

struct VenuePDFMenu: View {
  let url: URL?
  let fallback: URL?
  let language: SweetoLanguage
  let isPolish: Bool
  let palette: VenueGuestPalette
  @State private var document: PDFDocument?
  @State private var shownInPolish = false
  @State private var failed = false

  var body: some View {
    VStack(spacing: 0) {
      if let document {
        if shownInPolish && language != .pl {
          HStack(spacing: 7) {
            VenueActionArt(kind: .menu, theme: palette.motionTheme, animated: true)
              .frame(width: 27, height: 27)
            Text(language.text("Menu po polsku", "Menu in Polish", "Меню на польском языке"))
              .font(.footnote)
          }
          .padding(.vertical, 5)
        }
        VenuePDFPresentation(document: document)
      } else if failed {
        ContentUnavailableView(
          language.text("Menu jest niedostępne", "Menu unavailable", "Меню недоступно"),
          systemImage: "doc",
          description: Text(language.text("Zapytaj obsługę o menu.", "Ask staff for the menu.", "Попросите меню у сотрудников."))
        )
      } else {
        ProgressView(language.text("Wczytywanie menu…", "Loading menu…", "Загрузка меню…"))
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
    .task(id: url) { await load() }
  }

  @MainActor private func load() async {
    failed = false
    document = fallback.flatMap(PDFDocument.init(url:))
    shownInPolish = document != nil
    if let url, url != fallback, !url.isFileURL {
      var request = URLRequest(url: url)
      request.timeoutInterval = 9
      if let (data, response) = try? await URLSession.shared.data(for: request),
        let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
        http.url?.scheme == "https", let pdf = PDFDocument(data: data), !Task.isCancelled {
        document = pdf
        shownInPolish = isPolish
      }
    }
    if !Task.isCancelled { failed = document == nil }
  }
}

private struct VenuePDFPresentation: UIViewRepresentable {
  let document: PDFDocument

  func makeUIView(context: Context) -> PDFView {
    let view = PDFView()
    view.autoScales = true
    view.displayMode = .singlePageContinuous
    view.displayDirection = .vertical
    view.backgroundColor = .white
    return view
  }

  func updateUIView(_ view: PDFView, context: Context) {
    guard view.document !== document else { return }
    view.document = document
    view.autoScales = true
  }
}

struct VenueNativeButton: View {
  let title: String
  let systemImage: String
  let palette: VenueGuestPalette
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 9) {
        Text(title).font(.headline)
        Spacer()
        Image(systemName: systemImage).accessibilityHidden(true)
      }
      .foregroundStyle(.white)
      .padding(15)
      .frame(minHeight: 50)
      .background(palette.primary, in: .rect(cornerRadius: 15))
    }
    .buttonStyle(PressStyle())
  }
}

struct VenueLoyaltyView: View {
  let api: VenueGuestAPI
  let venueName: String
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let showPreview: Bool
  @Environment(\.scenePhase) private var scenePhase
  @State private var card: VenueLoyaltyCard?
  @State private var ready = false
  @State private var creating = false
  @State private var failed = false
  @State private var walletBusy = false
  @State private var walletFailed = false
  @State private var wallet: NativeWalletPass?
  @State private var preview = false
  @State private var walletAvailable = false
  @State private var cardMotion = 0

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text(venueName).font(.subheadline.weight(.semibold)).foregroundStyle(palette.ink.opacity(0.7))
        Text(t("Twoja karta", "Your loyalty card", "Ваша карта лояльности"))
          .font(palette.display(.largeTitle)).accessibilityAddTraits(.isHeader)
        if let card {
          checkout(card)
          walletSection
          if failed {
            Text(t("Nie udało się odświeżyć pieczątek.", "Couldn’t refresh your stamps.", "Не удалось обновить отметки."))
              .font(.footnote)
          }
        } else if ready {
          Text(failed
            ? t("Nie udało się pobrać karty. Spróbuj ponownie.", "Couldn’t load your card. Try again.", "Не удалось загрузить карту. Попробуйте ещё раз.")
            : t("Utwórz kartę, żeby zbierać pieczątki przy kasie.", "Create your card and collect stamps at the counter.", "Создайте карту, чтобы собирать отметки на кассе."))
          if failed {
            VenueNativeButton(title: t("Spróbuj ponownie", "Try again", "Повторить"), systemImage: "arrow.clockwise", palette: palette) {
              Task { await refresh() }
            }
          } else {
            VenueNativeButton(
              title: creating ? t("Tworzenie karty…", "Creating your card…", "Создаём карту…") : t("Utwórz kartę", "Create my card", "Создать карту"),
              systemImage: "creditcard", palette: palette
            ) { Task { await createCard() } }
              .disabled(creating)
          }
        } else {
          ProgressView(t("Wczytywanie karty…", "Loading your card…", "Загрузка карты…"))
        }
      }
      .padding(20)
      .frame(maxWidth: 530, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .refreshable { await refresh() }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .task(id: scenePhase) {
      guard scenePhase == .active else { return }
      while !Task.isCancelled {
        await refresh()
        try? await Task.sleep(for: .seconds(5))
      }
    }
    .task(id: card?.code) {
      walletAvailable = false
      guard card != nil, let response = try? await api.wallet(), !Task.isCancelled else { return }
      walletAvailable = response.status == .ready && response.passUrl != nil
    }
    .sheet(item: $wallet) { pass in
      WalletPresentation(controller: pass.controller) { wallet = nil }
    }
    .sheet(isPresented: $preview) {
      if let card {
        NavigationStack {
          ScrollView {
            VStack(alignment: .leading, spacing: 16) {
              Text(t("Podgląd projektu karty", "Card design preview", "Предпросмотр карты"))
                .font(palette.display(.title))
              Text(t("Podgląd nie jest kartą Apple Wallet.", "This is a design preview.", "Это предпросмотр дизайна."))
                .font(.footnote)
              checkout(card)
            }.padding(20)
          }
          .foregroundStyle(palette.ink)
          .background(palette.paper.ignoresSafeArea())
          .toolbar {
            Button(t("Gotowe", "Done", "Готово")) { preview = false }
          }
        }
      }
    }
    .alert(t("Nie udało się otworzyć Wallet", "Couldn’t open Wallet", "Не удалось открыть Wallet"), isPresented: $walletFailed) {
      Button("OK", role: .cancel) {}
    }
  }

  private func checkout(_ card: VenueLoyaltyCard) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        Label(t("Pokaż przy kasie", "Show at the counter", "Покажите на кассе"), systemImage: "qrcode")
          .font(.headline)
        Spacer()
        VenueActionArt(kind: .loyalty, theme: palette.motionTheme, animated: cardMotion > 0, replay: cardMotion)
          .frame(width: 42, height: 42)
      }
      HStack(alignment: .firstTextBaseline, spacing: 7) {
        Text("\(card.stamps)/\(card.goal)").font(.system(.title, design: .rounded, weight: .heavy))
        Text(t("pieczątki", "stamps", "отметки")).font(.footnote)
      }
      if card.rewardAvailable {
        Label(t("Nagroda do odbioru", "Reward available", "Награда доступна"), systemImage: "gift")
          .font(.subheadline.weight(.semibold))
      }
      if let code = CheckoutQR.image(card.checkout) {
        Image(uiImage: code)
          .interpolation(.none).resizable().scaledToFit()
          .frame(width: 178, height: 178)
          .padding(18)
          .background(.white, in: .rect(cornerRadius: 12))
          .accessibilityLabel(t("Kod QR karty", "Card QR code", "QR-код карты"))
      }
      Text(card.code).font(.system(.title3, design: .monospaced, weight: .bold)).textSelection(.enabled)
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.white, in: .rect(cornerRadius: 20))
    .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(palette.line))
  }

  @ViewBuilder private var walletSection: some View {
    if walletAvailable && PKAddPassesViewController.canAddPasses() {
      WalletAddButton { Task { await prepareWallet() } }
        .frame(height: 48)
        .disabled(walletBusy)
      if walletBusy { ProgressView() }
    } else if showPreview {
      VenueNativeButton(
        title: t("Podgląd projektu karty", "Preview card design", "Предпросмотр дизайна"),
        systemImage: "creditcard", palette: palette
      ) { preview = true }
    } else {
      Label(
        t("Dodanie do Apple Wallet jest niedostępne.", "Adding to Apple Wallet is unavailable.", "Добавление в Apple Wallet недоступно."),
        systemImage: "wallet.pass"
      )
      .font(.footnote)
      .foregroundStyle(palette.ink.opacity(0.72))
    }
  }

  @MainActor private func refresh() async {
    guard !creating else { return }
    do {
      let found = try await api.card()
      guard !Task.isCancelled, !creating else { return }
      if let card, let found, found.stamps > card.stamps {
        cardMotion += 1
      }
      if found != card { card = found }
      failed = false
    } catch {
      if !Task.isCancelled { failed = true }
    }
    if !Task.isCancelled { ready = true }
  }

  @MainActor private func createCard() async {
    guard !creating else { return }
    creating = true
    defer { creating = false }
    do {
      guard let created = try await api.card(create: true) else { throw URLError(.badServerResponse) }
      card = created
      cardMotion += 1
      failed = false
    } catch {
      failed = true
    }
  }

  @MainActor private func prepareWallet() async {
    guard !walletBusy else { return }
    walletBusy = true
    defer { walletBusy = false }
    do {
      let data = try await api.applePass(language: language)
      let pass = try PKPass(data: data)
      guard let controller = PKAddPassesViewController(pass: pass) else { throw URLError(.cannotDecodeContentData) }
      wallet = NativeWalletPass(controller: controller)
    } catch {
      walletFailed = true
    }
  }
}

private enum CheckoutQR {
  static let context = CIContext()

  static func image(_ checkout: String) -> UIImage? {
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(checkout.utf8)
    filter.correctionLevel = "M"
    guard let output = filter.outputImage?.transformed(by: .init(scaleX: 12, y: 12)),
      let bitmap = context.createCGImage(output, from: output.extent)
    else { return nil }
    return UIImage(cgImage: bitmap)
  }
}

private struct NativeWalletPass: Identifiable {
  let id = UUID()
  let controller: PKAddPassesViewController
}

private struct WalletAddButton: UIViewRepresentable {
  let action: () -> Void

  func makeUIView(context: Context) -> PKAddPassButton {
    let button = PKAddPassButton(addPassButtonStyle: .black)
    button.addAction(UIAction { _ in context.coordinator.action() }, for: .touchUpInside)
    return button
  }
  func updateUIView(_ view: PKAddPassButton, context: Context) { context.coordinator.action = action }
  func makeCoordinator() -> Coordinator { Coordinator(action) }

  final class Coordinator {
    var action: () -> Void
    init(_ action: @escaping () -> Void) { self.action = action }
  }
}

private struct WalletPresentation: UIViewControllerRepresentable {
  let controller: PKAddPassesViewController
  let dismiss: () -> Void

  func makeUIViewController(context: Context) -> PKAddPassesViewController {
    controller.delegate = context.coordinator
    return controller
  }
  func updateUIViewController(_ controller: PKAddPassesViewController, context: Context) {}
  func makeCoordinator() -> Coordinator { Coordinator(dismiss) }

  final class Coordinator: NSObject, PKAddPassesViewControllerDelegate {
    let dismiss: () -> Void
    init(_ dismiss: @escaping () -> Void) { self.dismiss = dismiss }
    func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) { dismiss() }
  }
}

enum VenueWiFiJoinError: Error { case unavailable }

enum VenueWiFiJoin {
  @MainActor static func apply(_ details: VenueGuestWiFi) async throws {
    let config: NEHotspotConfiguration
    switch details.security {
    case .nopass:
      config = NEHotspotConfiguration(ssid: details.ssid)
    case .WPA, .WEP:
      guard let password = details.password else { throw VenueWiFiJoinError.unavailable }
      config = NEHotspotConfiguration(ssid: details.ssid, passphrase: password, isWEP: details.security == .WEP)
    }
    config.hidden = details.hidden
    do {
      try await NEHotspotConfigurationManager.shared.apply(config)
    } catch let error as NSError where error.domain == NEHotspotConfigurationErrorDomain &&
      error.code == NEHotspotConfigurationError.alreadyAssociated.rawValue {
      return
    }
  }
}

struct VenueWiFiHelp: View {
  let details: VenueGuestWiFi?
  let failed: Bool
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let connect: () -> Void
  @State private var revealed = false

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 8) {
          VenueActionArt(kind: .wifi, theme: palette.motionTheme, animated: true)
            .frame(width: 56, height: 56)
          Text(t("Wi-Fi dla gości", "Guest Wi-Fi", "Гостевой Wi-Fi"))
            .font(palette.display(.largeTitle))
            .accessibilityAddTraits(.isHeader)
        }
        if let details {
          Text(details.ssid).font(.headline).textSelection(.enabled)
          if failed {
            Text(t("Wybierz tę sieć w ustawieniach Wi-Fi.", "Choose this network in Wi-Fi settings.", "Выберите эту сеть в настройках Wi-Fi."))
          }
          if let password = details.password {
            Button(revealed ? t("Ukryj hasło", "Hide password", "Скрыть пароль") : t("Pokaż hasło", "Show password", "Показать пароль")) {
              revealed.toggle()
            }.padding(.vertical, 9)
            if revealed {
              Text(password).font(.body.monospaced()).textSelection(.enabled)
            }
          }
        } else {
          Text(t("Zapytaj obsługę o dostęp do sieci.", "Ask staff for the Wi-Fi details.", "Уточните данные Wi-Fi у сотрудников."))
        }
        if failed || details != nil {
          VenueNativeButton(
            title: t("Połącz z Wi-Fi", "Connect to Wi-Fi", "Подключиться к Wi-Fi"),
            systemImage: "wifi", palette: palette, action: connect
          )
        }
      }
      .padding(20)
      .frame(maxWidth: 530, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
  }
}
