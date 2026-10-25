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
