import Foundation
import SwiftUI

/// A disposable guest selection. It never represents an order sent to the venue.
struct SweetoCounterDraft: Codable, Equatable {
  static let quantityLimit = 99
  static let lifetime: TimeInterval = 2 * 60 * 60

  private(set) var quantities: [String: Int] = [:]
  private(set) var expiresAt = Date.distantPast

  var total: Int { quantities.values.reduce(0, +) }

  func quantity(for id: String) -> Int { quantities[id, default: 0] }

  @discardableResult
  mutating func adjust(_ id: String, by delta: Int, now: Date = .now) -> Bool {
    if expiresAt <= now { self = Self() }
    let current = quantity(for: id)
    let next = min(Self.quantityLimit, max(0, current + delta))
    guard next != current else { return false }
    if next > 0 { quantities[id] = next }
    else { quantities.removeValue(forKey: id) }
    expiresAt = quantities.isEmpty ? .distantPast : now.addingTimeInterval(Self.lifetime)
    return true
  }

  static func load(venue: String, itemIDs: Set<String>, now: Date = .now, defaults: UserDefaults = .standard) -> Self {
    let key = storageKey(venue)
    guard let data = defaults.data(forKey: key),
      let stored = try? JSONDecoder().decode(Self.self, from: data),
      stored.expiresAt > now,
      Set(stored.quantities.keys).isSubset(of: itemIDs),
      stored.quantities.values.allSatisfy({ (1...Self.quantityLimit).contains($0) })
    else {
      defaults.removeObject(forKey: key)
      return Self()
    }
    return stored
  }

  func save(venue: String, defaults: UserDefaults = .standard) {
    let key = Self.storageKey(venue)
    if quantities.isEmpty {
      defaults.removeObject(forKey: key)
    } else if let data = try? JSONEncoder().encode(self) {
      defaults.set(data, forKey: key)
    }
  }

  private static func storageKey(_ venue: String) -> String {
    "papupay.counter-draft.v1." + venue
  }
}

struct SweetoCounterLine: Identifiable {
  let id: String
  let quantity: Int
  let polishName: String
  let guestName: String
}

struct SweetoCounterOrder: View {
  let lines: [SweetoCounterLine]
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let edit: () -> Void
  let clear: () -> Void
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var confirmClear = false

  private func t(_ pl: String, _ en: String, _ ru: String) -> String {
    language.text(pl, en, ru)
  }

  private var detents: Set<PresentationDetent> {
    if typeSize >= .xxLarge { return [.large] }
    let translated = lines.count(where: { $0.polishName != $0.guestName })
    let contentHeight = 302 + lines.count * 62 + translated * 21
    return [.height(CGFloat(contentHeight)), .large]
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 12) {
          if !typeSize.isAccessibilitySize {
            Text(t("Pokaż listę przy ladzie", "Show list at the counter", "Покажите список у стойки"))
              .font(palette.display(.title))
              .foregroundStyle(palette.ink)
              .fixedSize(horizontal: false, vertical: true)
              .accessibilityAddTraits(.isHeader)
          }
          ticket
          counterGuidance
          Button(role: .destructive) {
            confirmClear = true
          } label: {
            Label(t("Wyczyść listę", "Clear list", "Очистить список"), systemImage: "trash")
              .font(.subheadline.weight(.semibold))
              .fixedSize(horizontal: false, vertical: true)
              .frame(minHeight: 44)
              .contentShape(.rect)
          }
          .foregroundStyle(palette.muted)
          .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .frame(maxWidth: 540, alignment: .leading)
        .frame(maxWidth: .infinity)
      }
      .scrollBounceBehavior(.basedOnSize)
      .background(palette.paper.ignoresSafeArea())
      .foregroundStyle(palette.ink)
      .tint(palette.ink)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button(t("Edytuj listę", "Edit list", "Изменить список"), action: edit)
        }
      }
      .toolbarBackground(palette.paper, for: .navigationBar)
      .toolbarBackground(.visible, for: .navigationBar)
      .alert(t("Wyczyścić listę?", "Clear the list?", "Очистить список?"), isPresented: $confirmClear) {
        Button(t("Wyczyść listę", "Clear list", "Очистить список"), role: .destructive, action: clear)
        Button(t("Anuluj", "Cancel", "Отмена"), role: .cancel) {}
      }
    }
    .presentationDragIndicator(.visible)
    .presentationDetents(detents)
  }

  private var counterGuidance: some View {
    Text(t("Pokaż listę obsłudze. Zamów i zapłać przy ladzie.", "Show this list to staff to order and pay at the counter.", "Покажите список сотрудникам. Закажите и оплатите у стойки."))
      .font(.subheadline)
      .foregroundStyle(palette.muted)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var ticket: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 7) {
        if !typeSize.isAccessibilitySize {
          Image("SweetoWordmark").renderingMode(.template).resizable().scaledToFit()
            .frame(width: 92, height: 19, alignment: .leading)
            .accessibilityLabel("Sweeto")
        }
        Text(typeSize.isAccessibilitySize ? t("Lista", "My list", "Список") : "Lista deserów")
          .font(typeSize.isAccessibilitySize ? .headline.weight(.bold) : palette.display(.title))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
      }
      .padding(.horizontal, 17)
      .padding(.vertical, 13)
      .frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(palette.frosting)
      .background(palette.ink)
      .overlay { GuestPaperGrain(ink: palette.frosting).opacity(0.38) }

      GuestPerforation(color: palette.ink.opacity(0.34), cutout: palette.paper)

      VStack(alignment: .leading, spacing: 0) {
        ForEach(lines) { line in
          ticketLine(line)
          if line.id != lines.last?.id {
            Rectangle().fill(palette.line).frame(height: 1)
              .accessibilityHidden(true)
          }
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 5)
    }
    .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
    .clipShape(.rect(cornerRadius: palette.actionCorner))
    .shadow(color: palette.ink.opacity(0.10), radius: 12, x: 0, y: 4)
  }

  private func ticketLine(_ line: SweetoCounterLine) -> some View {
    let layout = typeSize.isAccessibilitySize
      ? AnyLayout(VStackLayout(alignment: .leading, spacing: 5))
      : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 14))
    return layout {
      Text("\(line.quantity) ×")
        .font(.system(.title2, design: .monospaced, weight: .bold))
        .foregroundStyle(palette.ink)
        .fixedSize()
      VStack(alignment: .leading, spacing: 5) {
        Text(line.polishName)
          .font(typeSize.isAccessibilitySize ? .subheadline.weight(.bold) : .title2.weight(.bold))
          .foregroundStyle(palette.ink)
          .fixedSize(horizontal: false, vertical: true)
        if language != .pl && line.guestName != line.polishName {
          Text(line.guestName).font(typeSize.isAccessibilitySize ? .footnote : .subheadline).foregroundStyle(palette.muted)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.vertical, 11)
    .accessibilityElement(children: .combine)
  }
}
