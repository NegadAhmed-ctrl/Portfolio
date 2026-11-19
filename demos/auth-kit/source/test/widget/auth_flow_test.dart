import 'package:auth_kit/app.dart';
import 'package:auth_kit/core/config/app_services.dart';
import 'package:auth_kit/core/storage/key_value_store.dart';
import 'package:auth_kit/features/auth/data/demo_auth_repository.dart';
import 'package:auth_kit/features/auth/data/demo_outbox.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  late MemoryStore store;
  late DemoOutbox outbox;

  setUp(() {
    store = MemoryStore();
    outbox = DemoOutbox();
  });

  Future<void> pumpApp(WidgetTester tester, {Locale locale = const Locale('en')}) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(AuthKitApp(
      initialLocale: locale,
      services: AppServices(
        store: store,
        outbox: outbox,
        auth: DemoAuthRepository(store: store, outbox: outbox, latency: Duration.zero),
      ),
    ));
    await tester.pumpAndSettle();
  }

  Future<void> tap(WidgetTester tester, Finder f) async {
    await tester.ensureVisible(f);
    await tester.tap(f);
    await tester.pumpAndSettle();
  }

  Finder field(String key) =>
      find.descendant(of: find.byKey(Key(key)), matching: find.byType(EditableText));

  testWidgets('login: validation → wrong password → success → session kept → sign out',
      (tester) async {
    await pumpApp(tester);
    expect(find.text('Welcome back'), findsOneWidget);

    await tap(tester, find.byKey(const Key('login-submit')));
    expect(find.text('Enter your email.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);

    await tester.enterText(field('login-email'), DemoAuthRepository.demoEmail);
    await tester.enterText(field('login-password'), 'wrong-pass');
    await tap(tester, find.byKey(const Key('login-submit')));
    expect(find.byKey(const Key('failure-banner')), findsOneWidget);
    expect(find.text('Email or password is incorrect.'), findsOneWidget);

    await tester.enterText(field('login-password'), DemoAuthRepository.demoPassword);
    await tester.pump();
    expect(find.byKey(const Key('failure-banner')), findsNothing, reason: 'typing clears it');
    await tap(tester, find.byKey(const Key('login-submit')));
    expect(find.text('Hi, Sara Ahmed'), findsOneWidget);
    expect(find.text('Email verified'), findsOneWidget);

    // "Restart" the app on the same storage: still signed in.
    await tester.pumpWidget(const SizedBox());
    await pumpApp(tester);
    expect(find.text('Hi, Sara Ahmed'), findsOneWidget);

    await tap(tester, find.byKey(const Key('sign-out')));
    expect(find.text('Welcome back'), findsOneWidget);
  });

  testWidgets('register → verify email with the demo inbox code → home', (tester) async {
    await pumpApp(tester);
    await tap(tester, find.text('Create an account'));

    await tester.enterText(field('register-name'), 'Omar Ali');
    await tester.enterText(field('register-email'), 'omar@mail.com');
    await tester.enterText(field('register-password'), 'Abcdefg1');
    await tester.enterText(field('register-confirm'), 'Abcdefg1');
    await tester.pump();
    expect(find.text('Fair'), findsOneWidget);
    await tap(tester, find.byKey(const Key('register-submit')));

    expect(find.text('Verify your email'), findsOneWidget);
    expect(find.textContaining('Resend in'), findsOneWidget);
    final code = outbox.latestFor('omar@mail.com', DemoEmailKind.verifyEmail)!.code;
    expect(find.text(code), findsOneWidget, reason: 'demo inbox shows the code');

    await tap(tester, find.byKey(const Key('use-demo-code')));
    expect(find.text('Hi, Omar Ali'), findsOneWidget);
  });

  testWidgets('Arabic UI is right-to-left and switches language live', (tester) async {
    await pumpApp(tester, locale: const Locale('ar'));
    expect(find.text('أهلاً بيك تاني'), findsOneWidget);
    final dir = Directionality.of(tester.element(find.text('أهلاً بيك تاني')));
    expect(dir, TextDirection.rtl);

    await tap(tester, find.byKey(const Key('toggle-language')));
    expect(find.text('Welcome back'), findsOneWidget);
    expect(await store.read('settings.locale'), 'en');
  });
}
