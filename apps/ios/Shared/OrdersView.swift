import SwiftUI

struct OrdersView: View {
  @EnvironmentObject var store: PapuStore
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 8) {
          Eyebrow(text: "HALA KOSZYKI · " + store.text("STOLIK ", "TABLE ") + store.table)
          Text(store.text("Twoje papu.", "Your papu.")).font(Papu.display(38)).tracking(-1.2)
        }
        if store.orders.isEmpty {
          VStack(spacing: 20) {
            PapuAnimation(scene: 2).frame(height: 230)
            Text(store.text("Jeszcze jeden mały krok.", "One delicious step away.")).font(
              Papu.display(28)
            ).multilineTextAlignment(.center)
            Text(
              store.text(
                "Wybierz coś dobrego. Tutaj znajdziesz swoje bilety do odbioru.",
                "Find something you love. Your pickup tickets will appear here.")
            )
            .font(Papu.body(16)).foregroundStyle(Papu.muted).multilineTextAlignment(.center)
            PrimaryButton(title: store.text("Co dziś jesz?", "Find your flavour")) {
              store.selectedTab = 0
            }
          }.padding(.vertical, 16)
        } else {
          HStack(spacing: 14) {
            Image(systemName: "bell.badge.fill").font(.system(size: 20)).foregroundStyle(Papu.green)
            VStack(alignment: .leading, spacing: 4) {
              Text(store.text("Chwila dla Ciebie.", "A moment for you.")).font(Papu.display(21))
              Text(
                store.notificationMessage
                  ?? store.text(
                    "Demo kuchni trwa 12–28 sekund.", "Demo kitchens take 12–28 seconds.")
              )
              .font(Papu.body(13)).foregroundStyle(Papu.muted)
            }
          }.padding(18).background(Papu.sage, in: RoundedRectangle(cornerRadius: 20))
          ForEach(store.orders) { order in OrderCard(order: order) }
          Text(
            store.text(
              "Zamówienia pokazowe. Każda kuchnia ma osobny odbiór.",
              "Demo orders. Collect separately from each kitchen.")
          )
          .font(Papu.body(12)).foregroundStyle(Papu.muted)
        }
      }.padding(20).padding(.top, 16).padding(.bottom, 30)
    }
  }
}

struct OrderCard: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  let order: DemoOrder
  private var stage: Int { order.stage(at: store.now) }
  private var ready: Bool { stage == 2 }
  private var title: String {
    [
      store.text("Przyjęte.", "All yours."), store.text("Już się robi.", "Cooking up."),
      store.text("Pora na papu!", "Come and get it!"),
      store.text("Smacznego!", "Enjoy every bite!"),
    ][stage]
  }
  var body: some View {
    VStack(spacing: 0) {
      HStack(alignment: .top, spacing: 14) {
        Text(String(format: "%02d", order.restaurant.unit)).font(Papu.poster(32))
          .frame(width: 58, height: 62).background(
            ready ? Papu.orange : Papu.sage, in: RoundedRectangle(cornerRadius: 15))
        VStack(alignment: .leading, spacing: 6) {
          Text(order.restaurant.name).font(Papu.display(23)).tracking(-0.6)
          Text(store.text("ODBIÓR · LOKAL ", "PICKUP · UNIT ") + String(order.restaurant.unit))
            .font(.system(.caption, weight: .semibold)).tracking(0.7).foregroundStyle(Papu.muted)
        }.frame(maxWidth: .infinity, alignment: .leading)
        if stage == 3 {
          Image(systemName: "checkmark.seal.fill").foregroundStyle(Papu.green).font(.title2)
        }
      }.padding(20)
      TicketRule()
      VStack(alignment: .leading, spacing: 20) {
        HStack(alignment: .center, spacing: 16) {
          VStack(alignment: .leading, spacing: 7) {
            Text(title).font(Papu.display(28)).tracking(-0.7)
              .contentTransition(.opacity)
            if stage < 2 {
              HStack(spacing: 6) {
                Image(systemName: "clock")
                Text(
                  timerInterval: order.createdAt...max(order.createdAt, order.readyAt),
                  countsDown: true
                )
                .monospacedDigit().fixedSize()
                Text(store.text("do odbioru · demo", "until pickup · demo"))
              }.font(Papu.body(12)).foregroundStyle(Papu.muted)
            } else {
              Text(
                stage == 2
                  ? store.text("Pokaż ten numer przy odbiorze.", "Show this number at the counter.")
                  : store.text("Dzięki za wspólny stół.", "Thanks for sharing the table.")
              )
              .font(Papu.body(14)).foregroundStyle(Papu.muted)
            }
          }.frame(maxWidth: .infinity, alignment: .leading)
          if ready {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 42)).foregroundStyle(
              Papu.green
            ).transition(.scale.combined(with: .opacity))
          }
        }
        HStack(spacing: 5) {
          ForEach(0..<3, id: \.self) { index in
            Capsule().fill(stage >= index ? Papu.green : Papu.sage).frame(height: 4)
          }
        }
        HStack(alignment: .firstTextBaseline) {
          Text("#" + order.id).font(Papu.display(30)).tracking(0.4).minimumScaleFactor(0.7)
            .lineLimit(1)
          Spacer(minLength: 8)
          Text(store.text("Stolik ", "Table ") + order.table).font(Papu.body(13).weight(.semibold))
            .foregroundStyle(Papu.muted)
        }.padding(16).frame(maxWidth: .infinity).background(
          ready ? Papu.butter : Papu.cream, in: RoundedRectangle(cornerRadius: 14))
        ForEach(order.lines) { line in
          HStack(alignment: .top, spacing: 12) {
            FoodPhoto(name: line.item.image).frame(width: 44, height: 44).clipped().clipShape(
              RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
              Text("\(line.quantity) × " + store.text(line.item.name, line.item.nameEn)).font(
                Papu.body(14).weight(.semibold))
              if line.extra {
                Text(store.text("+ Dodatkowy sos", "+ Extra sauce")).font(Papu.body(12))
                  .foregroundStyle(Papu.muted)
              }
            }.frame(maxWidth: .infinity, alignment: .leading)
            Text(money(line.total, english: store.english)).font(Papu.body(13)).foregroundStyle(
              Papu.muted)
          }
        }
        if ready {
          PrimaryButton(
            title: store.text("Prowadź do odbioru", "Take me to pickup"), symbol: "location.fill"
          ) { store.navigate(to: order.restaurant) }
          Button {
            withAnimation(.smooth(duration: 0.25)) { store.collect(order) }
          } label: {
            Label(store.text("Mam swoje papu", "I’ve got my food"), systemImage: "checkmark").font(
              Papu.body(15).weight(.semibold)
            ).frame(maxWidth: .infinity, minHeight: 44)
          }.buttonStyle(PressStyle())
        } else if stage < 2 {
          Button {
            store.markReady(order)
          } label: {
            Label(store.text("Przyspiesz demo", "Skip the wait"), systemImage: "bolt.fill")
              .font(Papu.body(13).weight(.semibold)).foregroundStyle(Papu.muted).frame(
                maxWidth: .infinity, minHeight: 44)
          }
        } else {
          Button {
            store.reorder(order)
          } label: {
            Label(
              store.text("Jeszcze raz?", "Another round?"), systemImage: "arrow.counterclockwise"
            )
            .font(Papu.body(15).weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
          }
        }
      }.padding(20)
    }.background(Color(hex: "FFFDF8"), in: RoundedRectangle(cornerRadius: 24))
      .overlay(
        RoundedRectangle(cornerRadius: 24).stroke(
          ready ? Papu.green.opacity(0.35) : Papu.line, lineWidth: 1)
      )
      .animation(reduceMotion ? nil : .smooth(duration: 0.3), value: stage)
  }
}
