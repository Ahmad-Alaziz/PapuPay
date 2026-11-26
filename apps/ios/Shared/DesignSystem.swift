import SwiftUI

/// PapuPay's own brand, shown alongside each venue's theme.
enum Papu {
  static let ink = Color(hex: "123C2D"), orange = Color(hex: "FF7837"),
    green = Color(hex: "2B744B"), cream = Color(hex: "FAF6ED"), butter = Color(hex: "FFF2D6"),
    muted = Color(hex: "536451"), line = Color(hex: "DFE6D2")
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
struct PressStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1).animation(
      .spring(response: 0.25, dampingFraction: 0.8), value: configuration.isPressed)
  }
}
