import 'package:flutter_test/flutter_test.dart';
import 'package:lina_app/main.dart';

void main() {
  testWidgets('Lina app loads', (WidgetTester tester) async {
    await tester.pumpWidget(const LinaApp());

    expect(find.byType(LinaApp), findsOneWidget);
  });
}