import 'package:flutter_test/flutter_test.dart';
import 'package:pooja_store/main.dart';

void main() {
  testWidgets('Poojapa Store smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const PoojapaApp());
    expect(find.byType(PoojapaApp), findsOneWidget);
  });
}
