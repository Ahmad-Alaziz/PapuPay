import ActivityKit
import SwiftUI
import WidgetKit

private let forest = Color(red: 0.07, green: 0.235, blue: 0.176)
private let papaya = Color(red: 1, green: 0.47, blue: 0.216)
private let paper = Color(red: 0.98, green: 0.965, blue: 0.925)

struct PapuLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PapuOrderAttributes.self) { context in
      PickupActivityCard(context: context).environment(\.layoutDirection, .leftToRight)
        .activityBackgroundTint(paper).activitySystemActionForegroundColor(forest)
        .widgetURL(link(context))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("PapuPay", systemImage: icon(context)).font(.system(size: 14, weight: .heavy))
            .foregroundStyle(papaya)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text((context.attributes.english ? "Table " : "Stolik ") + context.attributes.table)
            .font(.system(size: 13, weight: .semibold)).foregroundStyle(paper)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
              Text(activityTitle(context)).font(.system(size: 22, weight: .heavy)).foregroundStyle(
                paper)
              Text(context.attributes.restaurants).font(.system(size: 12)).foregroundStyle(
                .white.opacity(0.65)
              ).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading)
            ActivityCounter(context: context).foregroundStyle(papaya)
          }.padding(.top, 12).padding(.bottom, 8)
        }
      } compactLeading: {
        Image(systemName: icon(context)).foregroundStyle(papaya)
      } compactTrailing: {
        if context.state.stage < 2 && context.state.readyAt > .now {
          Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
            .monospacedDigit().font(.system(size: 12, weight: .bold)).foregroundStyle(paper).frame(
              width: 40)
        } else {
          Text("\(context.state.readyCount)/\(context.state.totalKitchens)").font(
            .system(size: 12, weight: .bold)
          ).foregroundStyle(papaya)
        }
      } minimal: {
        Image(systemName: icon(context)).foregroundStyle(papaya)
      }.widgetURL(link(context)).keylineTint(papaya)
    }
  }
  private func link(_ context: ActivityViewContext<PapuOrderAttributes>) -> URL? {
    URL(string: "https://papupay.com/go/koszyki/\(context.attributes.table)#orders")
  }
}

private func icon(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
  context.state.stage >= 2 ? "checkmark.circle.fill" : "takeoutbag.and.cup.and.straw.fill"
}
private func activityTitle(_ context: ActivityViewContext<PapuOrderAttributes>) -> String {
  if context.state.stage >= 2 {
    return context.attributes.english ? "Your papu is ready!" : "Pora na papu!"
  }
  if context.isStale { return context.attributes.english ? "Check your pickup" : "Sprawdź odbiór" }
  return context.attributes.english ? "Good things cooking" : "Już się robi"
}
private struct ActivityCounter: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    VStack(spacing: 4) {
      if context.state.stage < 2 && context.state.readyAt > Date.now {
        Text(timerInterval: Date.now...context.state.readyAt, countsDown: true)
          .monospacedDigit().font(.system(size: 27, weight: .bold, design: .rounded)).frame(
            width: 78)
        Text(context.attributes.english ? "DEMO" : "DEMO").font(.system(size: 9, weight: .bold))
          .tracking(1)
      } else {
        Image(systemName: context.state.stage >= 2 ? "checkmark" : "arrow.up.right").font(
          .system(size: 28, weight: .bold))
        Text("\(context.state.readyCount)/\(context.state.totalKitchens)").font(
          .system(size: 11, weight: .bold))
      }
    }
  }
}
private struct PickupActivityCard: View {
  let context: ActivityViewContext<PapuOrderAttributes>
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 6) {
        Image(systemName: "takeoutbag.and.cup.and.straw.fill").foregroundStyle(forest)
        Text("PapuPay").font(.system(size: 13, weight: .heavy, design: .rounded))
        Spacer()
        Text((context.attributes.english ? "TABLE " : "STOLIK ") + context.attributes.table)
          .font(.system(size: 11, weight: .bold)).tracking(0.7)
      }
      HStack(spacing: 16) {
        VStack(alignment: .leading, spacing: 6) {
          Text(activityTitle(context)).font(.system(size: 23, weight: .heavy)).lineLimit(2)
            .minimumScaleFactor(0.85)
          Text(context.attributes.restaurants).font(.system(size: 12, weight: .medium))
            .foregroundStyle(forest.opacity(0.7)).lineLimit(1)
          if let pickup = context.attributes.pickupSummary, context.state.stage >= 2 {
            Text(pickup).font(.system(size: 12, weight: .bold)).lineLimit(1)
          }
        }.frame(maxWidth: .infinity, alignment: .leading)
        ActivityCounter(context: context).frame(width: 82, height: 74)
          .background(
            context.state.stage >= 2 ? forest : papaya, in: RoundedRectangle(cornerRadius: 20)
          )
          .foregroundStyle(context.state.stage >= 2 ? paper : forest)
      }
      HStack(spacing: 4) {
        ForEach(0..<3, id: \.self) { index in
          Capsule().fill(context.state.stage >= index ? forest : forest.opacity(0.12)).frame(
            height: 3)
        }
      }
    }.padding(16).foregroundStyle(forest)
      .environment(\.locale, Locale(identifier: context.attributes.english ? "en_GB" : "pl_PL"))
  }
}

@main
struct PapuWidgets: WidgetBundle {
  var body: some Widget { PapuLiveActivity() }
}
