import ActivityKit
import SwiftUI
import WidgetKit

private let ink = Color(red: 0.09, green: 0.235, blue: 0.169)
private let orange = Color(red: 1, green: 0.533, blue: 0.282)
private let butter = Color(red: 1, green: 0.949, blue: 0.839)
struct PapuLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PapuOrderAttributes.self) { context in
      VStack(alignment: .leading, spacing: 14) {
        HStack(spacing: 10) {
          Image(systemName: context.state.stage >= 2 ? "checkmark.seal.fill" : "leaf.fill").font(
            .system(size: 30)
          ).foregroundStyle(orange)
          VStack(alignment: .leading, spacing: 4) {
            Text("PapuPay").font(.system(size: 15, weight: .heavy, design: .rounded))
            Text(context.attributes.restaurants).font(.system(size: 11)).lineLimit(1).opacity(0.65)
          }
          Spacer(minLength: 8)
          Text((context.attributes.english ? "Table " : "Stolik ") + context.attributes.table).font(
            .system(size: 12, weight: .bold)
          ).padding(.horizontal, 12).padding(.vertical, 8).background(
            ink.opacity(0.07), in: Capsule())
        }
        HStack(alignment: .firstTextBaseline) {
          Text(title(context)).font(.system(size: 23, weight: .bold, design: .rounded)).fixedSize(
            horizontal: false, vertical: true)
          Spacer()
          if context.state.stage < 2 && !context.isStale && context.state.readyAt > Date.now {
            Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
              .monospacedDigit().font(.system(size: 20, weight: .semibold, design: .rounded)).frame(
                width: 65)
          } else if context.state.stage == 2 {
            Text("\(context.state.readyCount)/\(context.state.totalKitchens)").font(
              .system(size: 19, weight: .bold, design: .rounded))
          }
        }
        HStack(spacing: 5) {
          ForEach(0..<3, id: \.self) { index in
            Capsule().fill(context.state.stage >= index ? orange : ink.opacity(0.12)).frame(
              height: 4)
          }
        }
        Text(
          context.isStale
            ? (context.attributes.english
              ? "Open PapuPay to refresh your demo order."
              : "Otwórz PapuPay, aby odświeżyć zamówienie demo.")
            : context.state.stage >= 2
              ? (context.attributes.english
                ? "Your food is ready. Find pickup in PapuPay."
                : "Pora na pierwszy kęs. Odbiór znajdziesz w PapuPay.")
              : (context.attributes.english
                ? "Make yourself at home. Good food takes a moment."
                : "Rozgość się. Dobre rzeczy potrzebują chwili.")
        ).font(.system(size: 11)).opacity(0.65)
      }.padding(18).foregroundStyle(ink)
        .environment(\.locale, Locale(identifier: context.attributes.english ? "en_GB" : "pl_PL"))
        .environment(\.layoutDirection, .leftToRight)
        .activityBackgroundTint(butter)
        .activitySystemActionForegroundColor(ink).widgetURL(URL(string: "papupay://orders"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("PapuPay", systemImage: "leaf.fill").font(
            .system(size: 14, weight: .bold, design: .rounded)
          ).foregroundStyle(orange)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text((context.attributes.english ? "Table " : "Stolik ") + context.attributes.table).font(
            .system(size: 12, weight: .semibold)
          ).foregroundStyle(butter)
        }
        DynamicIslandExpandedRegion(.center) { EmptyView() }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 10) {
            HStack {
              Text(title(context)).font(.system(size: 20, weight: .bold, design: .rounded))
              Spacer()
              if context.state.stage < 2 && context.state.readyAt > Date.now {
                Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
                  .monospacedDigit().frame(width: 58)
              } else {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(orange)
              }
            }
            Text(context.attributes.restaurants).font(.system(size: 11)).foregroundStyle(.secondary)
            HStack(spacing: 4) {
              ForEach(0..<3, id: \.self) { index in
                Capsule().fill(context.state.stage >= index ? orange : .white.opacity(0.15)).frame(
                  height: 4)
              }
            }
          }.padding(.top, 7).foregroundStyle(butter)
        }
      } compactLeading: {
        Image(systemName: context.state.stage >= 2 ? "checkmark.circle.fill" : "leaf.fill")
          .foregroundStyle(orange)
      } compactTrailing: {
        if context.state.stage < 2 && context.state.readyAt > Date.now {
          Text(timerInterval: Date.now...context.state.readyAt, countsDown: true).monospacedDigit()
            .font(.system(size: 11, weight: .semibold)).foregroundStyle(butter).frame(width: 40)
        } else {
          Text("\(context.state.readyCount)/\(context.state.totalKitchens)").font(
            .system(size: 11, weight: .semibold)
          ).foregroundStyle(orange)
        }
      } minimal: {
        Image(systemName: context.state.stage >= 2 ? "checkmark" : "leaf.fill").foregroundStyle(
          orange)
      }
      .widgetURL(URL(string: "papupay://orders")).keylineTint(orange)
    }
  }
  private func title(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
    if context.isStale {
      return context.attributes.english ? "Let’s check your food." : "Sprawdź swoje papu."
    }
    return context.state.stage >= 3
      ? (context.attributes.english ? "Enjoy every bite!" : "Smacznego!")
      : context.state.stage >= 2
        ? (context.attributes.english ? "Ready to collect!" : "Pora na papu!")
        : (context.attributes.english ? "Your food is cooking." : "Papu się robi.")
  }
}
@main struct PapuWidgets: WidgetBundle { var body: some Widget { PapuLiveActivity() } }
