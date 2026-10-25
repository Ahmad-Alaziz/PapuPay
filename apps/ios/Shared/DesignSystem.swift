import SwiftUI

import class RiveRuntime.File
import struct RiveRuntime.NumberProperty
import class RiveRuntime.Rive
import struct RiveRuntime.RiveUIViewRepresentable
import class RiveRuntime.Worker

enum Papu {
  static let ink = Color(hex: "123C2D"), orange = Color(hex: "FF7837"),
    green = Color(hex: "2B744B"), cream = Color(hex: "FAF6ED"), butter = Color(hex: "FFF2D6"),
    accentText = Color(hex: "B7471B"), sage = Color(hex: "E7EDD9"), muted = Color(hex: "536451"),
    line = Color(hex: "DFE6D2")
  static func display(_ size: CGFloat) -> Font {
    .custom("PapuDisplay-Bold", size: size, relativeTo: size >= 30 ? .largeTitle : .headline)

  }
  static func poster(_ size: CGFloat) -> Font {
    .custom("PapuPoster-Regular", size: size, relativeTo: .largeTitle)
  }
  static func body(_ size: CGFloat = 17) -> Font {
    let style: Font.TextStyle =
      size >= 20
      ? .title3
      : size >= 17
        ? .body
        : size >= 16
          ? .callout
          : size >= 15 ? .subheadline : size >= 13 ? .footnote : size >= 12 ? .caption : .caption2
    return .system(style, design: .default)
  }
  static func wordmark(_ size: CGFloat) -> Font {
    .custom("PapuDisplay-ExtraBold", fixedSize: size)
  }

}
extension Color {
  init(hex: String) {
    let value =
      UInt64(hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted), radix: 16) ?? 0
    self.init(
      .sRGB, red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255,
      blue: Double(value & 255) / 255, opacity: 1)
  }
}
struct PapayaMark: View {
  var body: some View { Image("papaya3d").resizable().scaledToFit().accessibilityHidden(true) }
}
struct FlatPapayaMark: View {
  var body: some View {
    GeometryReader { g in
      let sx = g.size.width / 100
      let sy = g.size.height / 120
      ZStack {
        SVGShape("M63 25 Q58 4 88 2 Q91 26 65 30 Z").fill(Papu.green)
        SVGShape(
          "M48 21 C69 8 85 30 82 53 C80 77 88 104 59 114 C32 124 7 104 9 81 C11 58 32 39 48 21 Z"
        ).fill(Papu.orange)
        SVGShape(
          "M52 28 C68 16 76 34 72 53 C69 73 78 101 56 107 C33 114 16 98 20 81 C25 61 38 43 52 28 Z"
        ).fill(Color(hex: "FFB14F"))
        SVGShape(
          "M52 41 C61 32 68 36 64 52 C60 73 68 92 53 98 C38 104 26 94 31 80 C36 65 43 51 52 41 Z"
        ).fill(Papu.butter)
        ForEach(
          Array([(46.0, 53.0), (37, 68), (50, 69), (33, 83), (47, 84)].enumerated()), id: \.offset
        ) { _, p in
          RoundedRectangle(cornerRadius: 2).fill(Papu.ink).frame(width: 8 * sx, height: 8 * sy)
            .rotationEffect(.degrees(18)).position(x: (p.0 + 4) * sx, y: (p.1 + 4) * sy)
        }
      }
    }.accessibilityHidden(true)
  }
}
struct BrandView: View {
  var size: CGFloat = 31
  var body: some View {
    HStack(spacing: 7) {
      PapayaMark().frame(width: size, height: size * 1.2).rotationEffect(.degrees(-8))
      (Text("Papu").foregroundStyle(Papu.ink) + Text("Pay").foregroundStyle(Papu.orange)).font(
        Papu.wordmark(size)
      ).tracking(-1.1)
    }.accessibilityLabel("PapuPay")
  }
}
struct Eyebrow: View {
  let text: String
  var body: some View {
    Text(text.uppercased()).font(.caption2.weight(.bold)).tracking(1.6).foregroundStyle(
      Papu.muted)
  }
}
struct PrimaryButton: View {
  let title: String
  var symbol: String = "arrow.up.right"
  var action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack {
        Text(title)
        Spacer(minLength: 12)
        Image(systemName: symbol)
      }.font(Papu.body(17).weight(.semibold)).padding(.horizontal, 22).frame(minHeight: 52)
        .foregroundStyle(Papu.butter).background(Papu.ink, in: Capsule())
    }.buttonStyle(PressStyle())
  }
}
struct PressStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1).animation(
      .spring(response: 0.25, dampingFraction: 0.8), value: configuration.isPressed)
  }
}
struct FoodPhoto: View {
  let name: String
  var body: some View {
    Image(name.replacingOccurrences(of: ".jpg", with: "")).resizable().scaledToFill()
      .accessibilityHidden(true)
  }
}
/// The file is decoded once; each presentation gets its own data-bound scene.
@MainActor private enum PapuRiveAsset {
  static let file = Task { () throws -> RiveRuntime.File in
    let worker = try await Worker()
    return try await RiveRuntime.File(source: .local("papu", Bundle.main), worker: worker)
  }
}
@MainActor private final class JourneyAnimation: ObservableObject {
  @Published var rive: Rive?
  func load(scene: Int) async {
    guard rive == nil else {
      set(scene)
      return
    }
    do {
      let file = try await PapuRiveAsset.file.value
      let instance = try await file.createViewModelInstance(
        .viewModelDefault(from: .name("PapuJourney")))
      instance.setValue(of: NumberProperty(path: "scene"), to: Float(scene))
      rive = try await Rive(file: file, dataBind: .instance(instance))
    } catch { /* The local brand artwork remains visible if rendering is unavailable. */  }
  }
  func set(_ scene: Int) {
    rive?.viewModelInstance?.setValue(of: NumberProperty(path: "scene"), to: Float(scene))
  }
}
struct PapuAnimation: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var phase
  @StateObject private var model = JourneyAnimation()
  @State private var visible = false
  var celebrate = false
  var scan = false
  var scene: Int? = nil
  private var currentScene: Int { scene ?? (scan ? 1 : celebrate ? 4 : 0) }
  var body: some View {
    Group {
      if let rive = model.rive, !reduceMotion {
        RiveUIViewRepresentable(rive: rive).paused(!visible || phase != .active).frameRate(.fps(60))
      } else {
        PapayaMark().padding(40)
      }
    }
    .task(id: currentScene) { if !reduceMotion { await model.load(scene: currentScene) } }
    .onAppear { visible = true }.onDisappear { visible = false }
    .accessibilityHidden(true)
  }
}

/// A paper receipt detail shared by order cards and checkout.
struct TicketRule: View {
  var body: some View {
    HStack(spacing: 0) {
      Circle().fill(Papu.cream).frame(width: 16, height: 16).offset(x: -8)
      Rectangle().fill(.clear).frame(height: 1).overlay {
        Path { p in
          p.move(to: .zero)
          p.addLine(to: CGPoint(x: 1000, y: 0))
        }
        .stroke(Papu.line, style: StrokeStyle(lineWidth: 1, dash: [4, 5])).clipped()
      }
      Circle().fill(Papu.cream).frame(width: 16, height: 16).offset(x: 8)
    }.accessibilityHidden(true)
  }
}

extension View {
  @ViewBuilder func papuGlass() -> some View {
    if #available(iOS 26.0, *) {
      self.glassEffect(.regular.interactive())
    } else {
      self.background(.ultraThinMaterial, in: Capsule())
    }
  }
  func papuCard() -> some View {
    self.background(Color(hex: "FFFDF5"), in: RoundedRectangle(cornerRadius: 23)).overlay(
      RoundedRectangle(cornerRadius: 23).stroke(Papu.line, lineWidth: 1))
  }
}


/// Feedback lives in each presentation, so a modal sheet can never cover it.
struct CartAdditionCard: View {
  @EnvironmentObject var store: PapuStore
  let addition: CartAddition
  var action: (() -> Void)? = nil
  var body: some View {
    HStack(spacing: 12) {
      FoodPhoto(name: addition.item.image).frame(width: 48, height: 48).clipped()
        .clipShape(RoundedRectangle(cornerRadius: 12))
      VStack(alignment: .leading, spacing: 4) {
        Label(
          addition.quantity > 0
            ? store.text("Dodano do koszyka", "Added to basket")
            : store.text("Już w koszyku · limit 20", "In your basket · limit 20"),
          systemImage: "checkmark.circle.fill"
        ).font(Papu.body(13).weight(.semibold)).foregroundStyle(Papu.green)
        Text("\(addition.quantity > 0 ? String(addition.quantity) + " × " : "")"
          + store.text(addition.item.name, addition.item.nameEn))
          .font(Papu.body(14).weight(.semibold)).lineLimit(2)
      }.frame(maxWidth: .infinity, alignment: .leading)
      if let action {
        Button(action: action) {
          Image(systemName: "arrow.right").font(.system(size: 15, weight: .semibold))
            .frame(width: 44, height: 44).background(Papu.sage, in: Circle())
        }.accessibilityLabel(store.text("Zobacz koszyk", "View basket")).buttonStyle(PressStyle())
      }
    }.padding(14).background(Papu.cream, in: RoundedRectangle(cornerRadius: 20))
      .overlay(RoundedRectangle(cornerRadius: 20).stroke(Papu.green.opacity(0.24)))
      .foregroundStyle(Papu.ink).accessibilityElement(children: .contain)
  }
}

struct BasketDock: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var showFeedback = true
  var action: () -> Void
  var body: some View {
    VStack(spacing: 8) {
      if showFeedback, let addition = store.lastAddition {
        CartAdditionCard(addition: addition, action: action).id(addition.id)
          .transition(.move(edge: .bottom).combined(with: .opacity))
      }
      Button(action: action) {
        HStack(spacing: 12) {
          Text(String(store.count)).font(Papu.body(15).bold()).monospacedDigit()
            .contentTransition(.numericText()).frame(width: 34, height: 36)
            .background(.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 11))
          Text(store.text("Zobacz koszyk", "View basket")).font(Papu.body(15).weight(.semibold))
          Spacer(minLength: 8)
          Text(money(store.total, english: store.english)).font(Papu.body(16).bold())
          Image(systemName: "arrow.right").font(.system(size: 15, weight: .semibold))
        }.padding(.horizontal, 16).padding(.vertical, 12).foregroundStyle(Papu.butter)
          .background(Papu.ink, in: RoundedRectangle(cornerRadius: 21))
          .shadow(color: Papu.ink.opacity(0.13), radius: 12, y: 5)
      }.buttonStyle(PressStyle())
    }.padding(.horizontal, 20).padding(.top, 8).padding(.bottom, 8)
      .animation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.88), value: store.lastAddition?.id)
      .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.88), value: store.count)
  }
}

struct QuickAddButton: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let dish: Dish
  private var quantity: Int { store.cart.filter { $0.itemId == dish.id }.reduce(0) { $0 + $1.quantity } }
  private var justAdded: Bool { store.lastAddition?.item.id == dish.id }
  var body: some View {
    Button { store.add(dish) } label: {
      HStack(spacing: 5) {
        Image(systemName: justAdded ? "checkmark" : "plus")
          .contentTransition(.symbolEffect(.replace))
        if quantity > 0 { Text(String(quantity)).monospacedDigit().contentTransition(.numericText()) }
      }.font(.system(size: 14, weight: .semibold)).frame(minWidth: 44, minHeight: 44)
        .padding(.horizontal, quantity > 0 ? 8 : 0)
        .background(Papu.green, in: Capsule()).foregroundStyle(Papu.butter)
    }.buttonStyle(PressStyle())
      .animation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.8), value: quantity)
      .accessibilityLabel(store.text("Dodaj ", "Add ") + store.text(dish.name, dish.nameEn))
      .accessibilityValue(store.text("W koszyku: ", "In basket: ") + String(quantity))
  }
}


@MainActor private enum PapuTableAsset {
  static let file = Task { () throws -> RiveRuntime.File in
    let worker = try await Worker()
    return try await RiveRuntime.File(source: .local("papu-table", Bundle.main), worker: worker)
  }
}

@MainActor private final class TableAnimation: ObservableObject {
  @Published var rive: Rive?
  func load() async {
    guard rive == nil else { return }
    do {
      let file = try await PapuTableAsset.file.value
      let instance = try await file.createViewModelInstance(
        .viewModelDefault(from: .name("PapuTableModel")))
      instance.setValue(of: NumberProperty(path: "selected"), to: 0)
      rive = try await Rive(file: file, dataBind: .instance(instance))
    } catch { /* A matching static table remains visible if rendering is unavailable. */ }
  }
}

/// Decorative shared-table artwork plays once, then yields to the actual catalog controls.
struct PapuTableScene: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var phase
  @StateObject private var model = TableAnimation()
  @State private var visible = false
  @State private var settled = false
  var body: some View {
    Group {
      if let rive = model.rive, !reduceMotion {
        RiveUIViewRepresentable(rive: rive).paused(!visible || phase != .active || settled).frameRate(.fps(60))
      } else {
        SharedTableStill()
      }
    }.allowsHitTesting(false).accessibilityHidden(true)
      .task(id: reduceMotion) { if !reduceMotion { await model.load() } }
      .task(id: model.rive != nil && phase == .active && !reduceMotion) {
        guard model.rive != nil, phase == .active, !reduceMotion else { return }
        settled = false
        try? await Task.sleep(for: .seconds(2))
        guard !Task.isCancelled else { return }
        settled = true
      }
      .onAppear { visible = true }.onDisappear { visible = false }
  }
}

private enum TableComposition {
  static let widths: [CGFloat] = [335, 320, 355]
  static let centers: [CGPoint] = [.init(x: 230, y: 320), .init(x: 548, y: 242), .init(x: 478, y: 442)]
}

private struct SharedTableStill: View {
  private let plates = ["table-burger", "table-ramen", "table-pizza"]
  var body: some View {
    GeometryReader { geometry in
      let w = geometry.size.width
      let h = geometry.size.height
      ZStack {
        Ellipse().fill(Papu.orange).frame(width: w * 670 / 800, height: h * 390 / 620)
          .position(x: w * 400 / 800, y: h * 367 / 620)
        Ellipse().fill(Color(hex: "FFBE76")).frame(width: w * 670 / 800, height: h * 390 / 620)
          .overlay(Ellipse().stroke(Papu.butter, lineWidth: 1))
          .position(x: w * 400 / 800, y: h * 345 / 620)
        ForEach(0..<3, id: \.self) { index in
          Image(plates[index]).resizable().scaledToFit()
            .frame(width: w * TableComposition.widths[index] / 800,
              height: h * TableComposition.widths[index] / 620)
            .position(x: w * TableComposition.centers[index].x / 800,
              y: h * TableComposition.centers[index].y / 620)
        }
      }
    }
  }
}
