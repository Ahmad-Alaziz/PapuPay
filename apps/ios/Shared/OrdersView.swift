import SwiftUI

struct OrdersView: View {
  @EnvironmentObject var store: PapuStore
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        Eyebrow(text: store.text("TY ODPOCZYWASZ. MY CZARUJEMY.", "YOU RELAX. WE’RE ON IT."))
        (Text(store.text("Twoje ", "Your "))
          + Text(store.text("papu.", "happy food.")).foregroundColor(Papu.green)).font(
            Papu.display(44))
        if store.orders.isEmpty {
          VStack(spacing: 20) {
            PapuAnimation().frame(width: 210, height: 210)
            Text(store.text("Tu zaczyna się coś pysznego.", "Something delicious starts here."))
              .font(Papu.display(34)).multilineTextAlignment(.center)
            Text(
              store.text(
                "Twoje zamówienia pojawią się tutaj. Najpierw znajdź swój ulubiony smak.",
                "Your orders will appear here. First, find a flavour you love.")
            ).font(Papu.body(15)).foregroundStyle(Papu.muted).multilineTextAlignment(.center)
            PrimaryButton(title: store.text("Odkryj restauracje", "Explore restaurants")) {
              store.selectedTab = 0
            }
          }.frame(maxWidth: .infinity).padding(.vertical, 20)
        } else {
          HStack(spacing: 10) {
            Image(systemName: "flame")
            Text(
              store.text(
                "Kuchnie pracują osobno. Odbierz każdą część, gdy będzie gotowa.",
                "Each kitchen cooks separately. Collect each part when it’s ready.")
            ).font(Papu.body(13)).lineSpacing(2)
            Spacer(minLength: 0)
            Text("DEMO").font(.system(size: 11, weight: .bold))
          }.padding(15).background(Papu.sage, in: RoundedRectangle(cornerRadius: 14))
            .foregroundStyle(Papu.muted)
          if let message = store.liveActivityMessage {
            Label(message, systemImage: "platter.filled.top.iphone").font(Papu.body(13))
              .foregroundStyle(Papu.green)
          }
          ForEach(store.orders) { order in OrderCard(order: order) }
          Text(
            store.text(
              "Statusy demo aktualizują się, gdy aplikacja jest otwarta.",
              "Demo statuses update while the app is open."
            )
          ).font(Papu.body(12)).foregroundStyle(Papu.muted).lineSpacing(3)
        }
      }.padding(24).padding(.top, 10).padding(.bottom, 30)
    }
  }
}
struct OrderCard: View {
  @Environment(\.dynamicTypeSize) private var typeSize
  @EnvironmentObject var store: PapuStore
  let order: DemoOrder
  private var stage: Int { order.stage(at: store.now) }
  private var status: String {
    [
      store.text("Przyjęte", "Received"), store.text("W kuchni", "Cooking"),
      store.text("Do odbioru!", "Ready to collect!"), store.text("Odebrane", "Collected"),
    ][stage]
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 21) {
      (typeSize.isAccessibilitySize
        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
        : AnyLayout(HStackLayout(spacing: 10))) {
          Text(String(order.restaurant.name.prefix(1))).font(Papu.display(23)).frame(
            width: 40, height: 42
          ).background(Color(hex: order.restaurant.color), in: RoundedRectangle(cornerRadius: 12))
          VStack(alignment: .leading, spacing: 4) {
            Text(order.restaurant.name).font(Papu.display(23))
            Text("#\(order.id) · " + store.text("Stolik ", "Table ") + order.table).font(
              Papu.body(11)
            )
            .foregroundStyle(Papu.muted)
          }
          Spacer(minLength: 0)
          Label(status, systemImage: stage >= 2 ? "checkmark" : "clock").font(
            Papu.body(11).weight(.semibold)
          ).padding(.horizontal, 9).padding(.vertical, 7).background(
            stage >= 2 ? Color(hex: "DCEBCB") : Papu.sage, in: Capsule())
        }
      if let first = order.lines.first {
        GeometryReader { geometry in
          FoodPhoto(name: first.item.image).frame(width: geometry.size.width, height: 145).clipped()
            .overlay(alignment: .bottomLeading) {
              Text(
                stage >= 2
                  ? store.text("Smacznego!", "Enjoy!") : store.text("Już się robi…", "On its way…")
              )
              .font(Papu.display(20)).padding(.horizontal, 13).padding(.vertical, 7)
              .background(Papu.butter, in: RoundedRectangle(cornerRadius: 8))
              .rotationEffect(.degrees(-5)).padding(13)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }.frame(height: 145)
      }
      VStack(alignment: .leading, spacing: 10) {
        Text(
          stage == 3
            ? store.text("Smacznego!", "Enjoy every bite!")
            : stage == 2
              ? store.text("Pora na pierwszy kęs.", "Time for the first bite.")
              : stage == 1
                ? store.text("Robi się pysznie.", "Good things are cooking.")
                : store.text("W dobrych rękach.", "In good hands.")
        ).font(Papu.display(31))
        Text(
          stage == 2
            ? store.text(
              "Czekamy przy lokalu \(order.restaurant.unit). Pokaż numer zamówienia.",
              "Meet us at unit \(order.restaurant.unit). Show your order number.")
            : stage == 3
              ? store.text("Dzięki za wspólny stół.", "Thanks for sharing the table.")
              : store.text(
                "Rozgość się. Damy znać, kiedy będzie gotowe.",
                "Make yourself at home. We’ll show you when it’s ready.")
        ).font(Papu.body(14)).foregroundStyle(Papu.muted).lineSpacing(3)
      }
      HStack(spacing: 0) {
        ForEach(0..<3, id: \.self) { index in
          VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
              ZStack {
                Circle().fill(stage >= index ? Papu.green : Papu.sage).frame(width: 25, height: 25)
                if stage > index {
                  Image(systemName: "checkmark").font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Papu.butter)
                } else {
                  Text("\(index+1)").font(.system(size: 11, weight: .semibold)).foregroundStyle(
                    stage >= index ? Papu.butter : Papu.muted)
                }
              }
              Rectangle().fill(
                index < 2 ? (stage > index ? Color(hex: "B7CBA2") : Papu.sage) : .clear
              ).frame(height: 3)
            }
            Text(
              [
                store.text("Przyjęte", "Received"), store.text("W kuchni", "Cooking"),
                store.text("Gotowe", "Ready"),
              ][index]
            ).font(Papu.body(11)).foregroundStyle(Papu.muted)
          }.frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      VStack(spacing: 9) {
        Divider().overlay(Papu.line)
        ForEach(order.lines) { line in
          HStack(alignment: .top) {
            Text(
              "\(line.quantity) × " + store.text(line.item.name, line.item.nameEn)
                + (line.extra ? " + extra" : ""))
            Spacer()
            Text(money(line.total, english: store.english))
          }.font(Papu.body(13)).foregroundStyle(Papu.muted)
        }
        Divider().overlay(Papu.line)
        HStack {
          Text(store.text("Suma demo", "Demo total"))
          Spacer()
          Text(money(order.total, english: store.english)).bold()
        }.font(Papu.body(14)).padding(.top, 4)
      }
      if stage == 2 {
        VStack(spacing: 12) {
          PrimaryButton(title: store.text("Prowadź do odbioru", "Find pickup"), symbol: "location")
          { store.navigate(to: order.restaurant) }
          Button {
            withAnimation(.spring) { store.collect(order) }
          } label: {
            Label(store.text("Odebrane", "Collected"), systemImage: "checkmark.circle").font(
              Papu.body(14).weight(.semibold)
            ).frame(maxWidth: .infinity).padding(13).background(Papu.sage, in: Capsule())
          }
        }
      } else if stage < 2 {
        Button {
          withAnimation(.spring) { store.markReady(order) }
        } label: {
          Label(
            store.text("Demo: pokaż gotowe zamówienie", "Demo: make order ready"),
            systemImage: "bolt"
          ).font(Papu.body(12)).foregroundStyle(Papu.muted)
        }
      } else {
        Button {
          store.reorder(order)
        } label: {
          Label(store.text("Zamów ponownie", "Order again"), systemImage: "arrow.counterclockwise")
            .font(Papu.body(14).weight(.semibold))
        }
      }
    }.padding(24).papuCard().overlay(
      RoundedRectangle(cornerRadius: 23).stroke(
        stage == 2 ? Color(hex: "AAC297") : .clear, lineWidth: 1)
    ).opacity(stage == 3 ? 0.8 : 1)
  }
}
