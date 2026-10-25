import ActivityKit
import SwiftUI
import WidgetKit

private let forest = Color(red: 0.07, green: 0.235, blue: 0.176)
private let papaya = Color(red: 1, green: 0.47, blue: 0.216)
private let paper = Color(red: 0.98, green: 0.965, blue: 0.925)

struct PapuLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PapuOrderAttributes.self) { context in
      PickupActivityCard(context: context).modifier(ActivityLanguage(english: context.attributes.english))
        .activityBackgroundTint(paper).activitySystemActionForegroundColor(forest)
        .widgetURL(link(context))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: activityIcon(context)).font(.system(size: 14, weight: .semibold))
            Text("PapuPay").font(.system(size: 14, weight: .heavy, design: .rounded))
          }.foregroundStyle(papaya).frame(maxWidth: .infinity, alignment: .leading)
            .modifier(ActivityLanguage(english: context.attributes.english))
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text((context.attributes.english ? "Table " : "Stolik ") + context.attributes.table)
            .font(.system(size: 13, weight: .semibold)).foregroundStyle(paper)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .modifier(ActivityLanguage(english: context.attributes.english))
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top, spacing: 12) {
              ActivityDescription(context: context, dark: true)
              ActivityCounter(context: context).frame(width: 64, height: 58)
                .foregroundStyle(papaya)
            }
            Text(activityFooter(context)).font(.system(size: 12, weight: .medium))
              .foregroundStyle(paper.opacity(0.78)).lineLimit(1)
              .frame(maxWidth: .infinity, alignment: .leading)
            ActivityProgress(stage: context.state.stage, color: papaya)
          }.padding(.top, 8).padding(.bottom, 3)
            .modifier(ActivityLanguage(english: context.attributes.english))
        }
      } compactLeading: {
        ActivityGlyph(context: context).frame(width: 28, height: 28)
          .modifier(ActivityLanguage(english: context.attributes.english))
      } compactTrailing: {
        ViewThatFits(in: .horizontal) {
          CompactActivityValue(context: context).frame(width: 38, height: 28)
          ActivityGlyph(context: context).frame(width: 24, height: 24)
        }.modifier(ActivityLanguage(english: context.attributes.english))
      } minimal: {
        ActivityGlyph(context: context).frame(width: 28, height: 28)
          .modifier(ActivityLanguage(english: context.attributes.english))
      }.widgetURL(link(context)).keylineTint(papaya)
    }
  }
  private func link(_ context: ActivityViewContext<PapuOrderAttributes>) -> URL? {
    URL(string: "https://papupay.com/go/koszyki/\(context.attributes.table)#orders")
  }
}

/// Apply the app's chosen language to every presentation, including Dynamic Island.
private struct ActivityLanguage: ViewModifier {
  let english: Bool
  func body(content: Content) -> some View {
    content.environment(\.locale, Locale(identifier: english ? "en_GB" : "pl_PL"))
      .environment(\.layoutDirection, .leftToRight)
  }
}
private func activityIcon(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
  context.state.stage >= 2 ? "checkmark" : "takeoutbag.and.cup.and.straw.fill"
}
private func activityTitle(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
  if context.state.stage >= 2 {
    return context.attributes.english ? "Your papu is ready!" : "Pora na papu!"
  }
  if context.isStale { return context.attributes.english ? "Check your pickup" : "Sprawdź odbiór" }
  return context.attributes.english ? "Good things cooking" : "Już się robi"
}
private func activityFooter(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
  if context.state.stage >= 2 {
    return context.attributes.pickupSummary
      ?? (context.attributes.english ? "Open PapuPay for pickup" : "Otwórz PapuPay, by odebrać")
  }
  return context.attributes.english ? "Demo order · collect at the counters" : "Zamówienie demo · odbiór przy lokalach"
}

private struct ActivityDescription: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var dark = false
  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(activityTitle(context)).font(.system(size: 22, weight: .heavy))
        .lineLimit(1).minimumScaleFactor(0.8).contentTransition(.opacity)
      Text(context.attributes.restaurants).font(.system(size: 12, weight: .medium))
        .foregroundStyle(dark ? paper.opacity(0.7) : forest.opacity(0.72))
        .lineLimit(1).minimumScaleFactor(0.9)
    }.foregroundStyle(dark ? paper : forest)
      .frame(maxWidth: .infinity, minHeight: 58, alignment: .topLeading)
  }
}

private struct ActivityCounter: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    VStack(spacing: 4) {
      if context.state.stage < 2 && context.state.readyAt > Date.now {
        Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
          .monospacedDigit().font(.system(size: 24, weight: .bold, design: .rounded))
          .multilineTextAlignment(.center).frame(maxWidth: .infinity, alignment: .center)
        Text("DEMO").font(.system(size: 9, weight: .bold)).tracking(1)
      } else {
        Image(systemName: context.state.stage >= 2 ? "checkmark" : "arrow.up.right")
          .font(.system(size: 25, weight: .bold)).contentTransition(.symbolEffect(.replace))
        Text("\(context.state.readyCount)/\(context.state.totalKitchens)")
          .font(.system(size: 11, weight: .semibold)).monospacedDigit().contentTransition(.numericText())
      }
    }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }
}

private struct ActivityGlyph: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    ZStack {
      Circle().stroke(papaya.opacity(0.35), lineWidth: 1.5)
      Image(systemName: activityIcon(context))
        .font(.system(size: context.state.stage >= 2 ? 13 : 11, weight: .bold))
        .contentTransition(.symbolEffect(.replace))
    }.foregroundStyle(papaya).padding(2)
  }
}

private struct CompactActivityValue: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    Group {
      if context.state.stage < 2 && context.state.readyAt > .now {
        Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
          .foregroundStyle(paper)
      } else {
        Text("\(context.state.readyCount)/\(context.state.totalKitchens)").foregroundStyle(papaya)
          .contentTransition(.numericText())
      }
    }.monospacedDigit().font(.system(size: 12, weight: .semibold))
      .multilineTextAlignment(.center).frame(maxWidth: .infinity, alignment: .center)
  }
}

private struct ActivityProgress: View {
  let stage: Int
  let color: Color
  var body: some View {
    HStack(spacing: 4) {
      ForEach(0..<3, id: \.self) { index in
        Capsule().fill(stage >= index ? color : color.opacity(0.12)).frame(height: 3)
      }
    }
  }
}

private struct PickupActivityCard: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline, spacing: 6) {
        Text("PapuPay").font(.system(size: 13, weight: .heavy, design: .rounded))
        Spacer(minLength: 8)
        Text((context.attributes.english ? "TABLE " : "STOLIK ") + context.attributes.table)
          .font(.system(size: 11, weight: .bold)).tracking(0.7)
      }
      HStack(alignment: .top, spacing: 12) {
        ActivityDescription(context: context)
        ActivityCounter(context: context).frame(width: 64, height: 58)
          .background(context.state.stage >= 2 ? forest : papaya,
            in: RoundedRectangle(cornerRadius: 17))
          .foregroundStyle(context.state.stage >= 2 ? paper : forest)
      }
      Text(activityFooter(context)).font(.system(size: 12, weight: .medium))
        .foregroundStyle(forest.opacity(0.76)).lineLimit(1)
        .frame(maxWidth: .infinity, alignment: .leading)
      ActivityProgress(stage: context.state.stage, color: forest)
    }.padding(14).foregroundStyle(forest)
  }
}

@main
struct PapuWidgets: WidgetBundle {
  var body: some Widget { PapuLiveActivity() }
}
